const CADDY_ADMIN = process.env.CADDY_ADMIN_URL ?? 'http://caddy:2019';

interface CaddyRoute {
  match?: Array<{ host: string[] }>;
  handle?: Array<{
    handler: 'reverse_proxy';
    upstreams: Array<{ dial: string }>;
  }>;
  terminal?: boolean;
}

export const caddyService = {
  async addCustomDomainRoute(domain: string): Promise<void> {
    const routesUrl = `${CADDY_ADMIN}/config/apps/http/servers/srv0/routes`;
    const res = await fetch(routesUrl);
    if (!res.ok) throw new Error(`Caddy API error: ${res.status}`);
    const existingRoutes: CaddyRoute[] = await res.json();

    const newRoute: CaddyRoute = {
      match: [{ host: [domain] }],
      handle: [{ handler: 'reverse_proxy', upstreams: [{ dial: 'backend:3000' }] }],
      terminal: true,
    };

    // Insert at index 0 for priority over wildcard routes
    const updated = [newRoute, ...existingRoutes];
    const patchRes = await fetch(routesUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (!patchRes.ok) {
      throw new Error(`Caddy API PATCH error: ${patchRes.status} ${await patchRes.text()}`);
    }
  },

  async removeCustomDomainRoute(domain: string): Promise<void> {
    const routesUrl = `${CADDY_ADMIN}/config/apps/http/servers/srv0/routes`;
    const res = await fetch(routesUrl);
    if (!res.ok) throw new Error(`Caddy API error: ${res.status}`);
    const existingRoutes: CaddyRoute[] = await res.json();

    const filtered = existingRoutes.filter(
      (r) => !r.match?.some((m) => m.host.includes(domain))
    );
    const patchRes = await fetch(routesUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filtered),
    });
    if (!patchRes.ok) {
      throw new Error(`Caddy API PATCH error: ${patchRes.status} ${await patchRes.text()}`);
    }
  },

  async getCertificateStatus(domain: string): Promise<'active' | 'pending' | 'error'> {
    try {
      const res = await fetch(`${CADDY_ADMIN}/pki/certs`);
      if (!res.ok) return 'error';
      const certs = await res.json();
      const hasCert = certs.some((c: { subjects?: string[] }) =>
        c.subjects?.includes(domain) || c.subjects?.includes(`*.${domain}`)
      );
      return hasCert ? 'active' : 'pending';
    } catch {
      return 'error';
    }
  },
};
