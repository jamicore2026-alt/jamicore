// Caddy Admin API service — manages dynamic reverse-proxy routes for merchant
// custom domains and on-demand TLS.
//
// D6: custom-domain routes dial the store's STOREFRONT upstream (not backend:3000),
// so the merchant's storefront UI is served on their domain.
// D11: route add/remove are idempotent and operate on a SINGLE route (find by host
// → PATCH/POST/DELETE that one), replacing the GET-all → PATCH-all design that
// lost concurrent writes (last PATCH won) and duplicated routes on re-add.
// D3: ensureOnDemandTlsPolicy enables on-demand TLS so Caddy provisions certs for
// tenant domains on first request, gated by the global on_demand_tls.ask endpoint.

const CADDY_ADMIN = process.env.CADDY_ADMIN_URL ?? 'http://caddy:2019';

interface CaddyRoute {
  match?: Array<{ host: string[] }>;
  handle?: Array<{
    handler: 'reverse_proxy';
    upstreams: Array<{ dial: string }>;
  }>;
  terminal?: boolean;
}

interface TlsAutomationPolicy {
  on_demand?: boolean;
  subjects?: string[];
}

/** Find the index of the route serving `domain`, or -1 if none. */
async function findRouteIndex(domain: string): Promise<number> {
  const res = await fetch(`${CADDY_ADMIN}/config/apps/http/servers/srv0/routes`);
  if (!res.ok) throw new Error(`Caddy API error: ${res.status}`);
  const routes: CaddyRoute[] = await res.json();
  return routes.findIndex((r) => r.match?.some((m) => m.host.includes(domain)));
}

export const caddyService = {
  /**
   * Register (or update) the reverse-proxy route for a custom domain pointing at
   * the given storefront upstream. Idempotent: re-adding an existing host updates
   * its upstream in place rather than appending a duplicate.
   */
  async addCustomDomainRoute(domain: string, upstream: string): Promise<void> {
    const route: CaddyRoute = {
      match: [{ host: [domain] }],
      handle: [{ handler: 'reverse_proxy', upstreams: [{ dial: upstream }] }],
      terminal: true,
    };

    const idx = await findRouteIndex(domain);
    if (idx >= 0) {
      // Update the existing route in place — idempotent re-add.
      const patchRes = await fetch(
        `${CADDY_ADMIN}/config/apps/http/servers/srv0/routes/${idx}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(route),
        },
      );
      if (!patchRes.ok) {
        throw new Error(`Caddy API PATCH route error: ${patchRes.status} ${await patchRes.text()}`);
      }
      return;
    }

    // Append a single new route (POST appends to the array) — avoids the
    // wholesale-replace race of the old GET-all → PATCH-all design.
    const postRes = await fetch(`${CADDY_ADMIN}/config/apps/http/servers/srv0/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(route),
    });
    if (!postRes.ok) {
      throw new Error(`Caddy API POST route error: ${postRes.status} ${await postRes.text()}`);
    }
  },

  /** Remove the route for a custom domain. Idempotent: no-op if absent. */
  async removeCustomDomainRoute(domain: string): Promise<void> {
    const idx = await findRouteIndex(domain);
    if (idx < 0) return; // already gone — idempotent
    const delRes = await fetch(
      `${CADDY_ADMIN}/config/apps/http/servers/srv0/routes/${idx}`,
      { method: 'DELETE' },
    );
    if (!delRes.ok) {
      throw new Error(`Caddy API DELETE route error: ${delRes.status} ${await delRes.text()}`);
    }
  },

  /**
   * Ensure a default on-demand TLS automation policy exists (no subject filter →
   * applies to all hosts, gated by the global on_demand_tls.ask endpoint configured
   * in the Caddyfile). Idempotent.
   */
  async ensureOnDemandTlsPolicy(): Promise<void> {
    const policiesUrl = `${CADDY_ADMIN}/config/apps/tls/automation/policies`;
    let policies: TlsAutomationPolicy[] = [];
    const res = await fetch(policiesUrl);
    if (res.ok) {
      policies = await res.json();
    } else if (res.status !== 404) {
      throw new Error(`Caddy API error fetching TLS policies: ${res.status}`);
    }
    if (policies.some((p) => p.on_demand === true)) return;
    const updated: TlsAutomationPolicy[] = [{ on_demand: true }, ...policies];
    const patchRes = await fetch(policiesUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (!patchRes.ok) {
      throw new Error(`Caddy API TLS policy error: ${patchRes.status} ${await patchRes.text()}`);
    }
  },

  /**
   * Best-effort certificate presence check for status display. With on-demand TLS
   * the cert is provisioned on the first HTTPS request, so this is a hint only —
   * it is NOT the gating condition for going live (D12: live = DNS verified + route).
   */
  async getCertificateStatus(domain: string): Promise<'active' | 'pending' | 'error'> {
    try {
      const res = await fetch(`${CADDY_ADMIN}/pki/certs`);
      if (!res.ok) return 'pending';
      const certs = await res.json();
      const hasCert =
        Array.isArray(certs) &&
        certs.some((c: { subjects?: string[] }) =>
          c.subjects?.includes(domain) || c.subjects?.includes(`*.${domain}`),
        );
      return hasCert ? 'active' : 'pending';
    } catch {
      return 'error';
    }
  },
};