import { db } from '../../db/index.js';
import { ErrorCodes } from '../../errors/codes.js';
import { domainRepo } from './domain.repo.js';
import { dnsService } from '../../services/dns.service.js';
import { caddyService } from '../../services/caddy.service.js';
import { getCacheService } from '../../services/cache.service.js';
import { storefrontUpstreamFor } from '../../lib/domain.js';
import {
  generateCnameTarget,
  generateTxtVerification,
  isValidDomain,
  normalizeDomain,
} from './domain.helpers.js';

function throwErr(code: string, message: string): never {
  throw Object.assign(new Error(message), { code });
}

// D10: PostgreSQL unique-constraint violation. The domain claim flow does
// check-then-insert; even inside a transaction two stores can pass the check
// before either inserts. The unique indexes on stores.domain,
// stores.custom_domain, and domain_verifications.domain turn the residual race
// into a 23505 we map to DOMAIN_ALREADY_TAKEN instead of a generic 500.
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === '23505'
  );
}

// D9: the public resolver caches `store:domain:<host>` (300s positive / 60s
// negative). Every domain mutation must invalidate the affected keys or stale
// resolution blocks the new owner / keeps serving the old one. Over-invalidation
// is safe; we clear the bare host plus common www/platform-suffix forms.
async function invalidateDomainCaches(...domains: (string | null | undefined)[]): Promise<void> {
  const cache = getCacheService();
  const keys = new Set<string>();
  for (const d of domains) {
    if (!d) continue;
    const host = d.split(':')[0].toLowerCase();
    keys.add(`store:domain:${host}`);
    keys.add(`store:domain:www.${host}`);
    if (!host.endsWith('.jamicore.com')) keys.add(`store:domain:${host}.jamicore.com`);
  }
  await Promise.all([...keys].map((k) => cache.delete(k)));
}

export const domainService = {
  async getStoreDomains(storeId: string) {
    const store = await db.query.stores.findFirst({
      where: (t, { eq }) => eq(t.id, storeId),
      columns: { id: true, domain: true, customDomain: true, customDomainVerified: true },
    });
    if (!store) throwErr(ErrorCodes.STORE_NOT_FOUND, 'Store not found');

    const customDomains = await domainRepo.findByStoreId(storeId);

    return {
      subdomain: {
        domain: store.domain,
        storeUrl: `https://${store.domain}.jamicore.com`,
      },
      customDomains: customDomains.map((d) => ({
        id: d.id,
        domain: d.domain,
        verificationType: d.verificationType,
        status: d.status,
        sslStatus: d.sslStatus,
        cnameTarget: d.cnameTarget,
        txtName: d.txtName,
        txtValue: d.txtValue,
        verifiedAt: d.verifiedAt,
        errorMessage: d.errorMessage,
        createdAt: d.createdAt,
      })),
    };
  },

  async checkSubdomainAvailability(subdomain: string, excludeStoreId?: string) {
    const exists = await domainRepo.checkDomainExists(subdomain, excludeStoreId);
    return { available: !exists };
  },

  // D9 + D10: claim is race-safe (tx + 23505 mapping) and invalidates the old +
  // new subdomain caches so resolution flips immediately.
  async updateSubdomain(storeId: string, subdomain: string) {
    const store = await db.query.stores.findFirst({
      where: (t, { eq }) => eq(t.id, storeId),
      columns: { id: true, domain: true },
    });
    if (!store) throwErr(ErrorCodes.STORE_NOT_FOUND, 'Store not found');

    if (store.domain === subdomain) {
      return { subdomain, storeUrl: `https://${subdomain}.jamicore.com` };
    }

    try {
      await db.transaction(async (tx) => {
        const exists = await domainRepo.checkDomainExists(subdomain, storeId);
        if (exists) throwErr(ErrorCodes.DOMAIN_ALREADY_TAKEN, `"${subdomain}" is already in use`);
        await domainRepo.updateStoreDomain(storeId, subdomain, tx);
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throwErr(ErrorCodes.DOMAIN_ALREADY_TAKEN, `"${subdomain}" is already in use`);
      }
      throw err;
    }

    await invalidateDomainCaches(store.domain, subdomain);

    return { subdomain, storeUrl: `https://${subdomain}.jamicore.com` };
  },

  // D5: creating a verification record NO LONGER registers a Caddy route. The
  // previous code added the route before any DNS proof, letting a merchant
  // squat `google.com` / a competitor's domain in the proxy config. The route
  // is added only after DNS is verified (see verifyCustomDomain).
  // D10: claim is race-safe (tx + 23505 mapping). D9: clear any negative cache
  // for the domain so the pending verification is visible immediately.
  async addCustomDomain(storeId: string, rawDomain: string, verificationType: 'cname' | 'txt') {
    const domain = normalizeDomain(rawDomain);
    if (!isValidDomain(domain)) {
      throwErr(ErrorCodes.DOMAIN_INVALID_FORMAT, `"${domain}" is not a valid domain name`);
    }

    // Check plan allows custom domains
    const store = await db.query.stores.findFirst({
      where: (t, { eq }) => eq(t.id, storeId),
      with: {
        plan: { columns: { includesCustomDomain: true } },
      },
    });
    if (!store) throwErr(ErrorCodes.STORE_NOT_FOUND, 'Store not found');
    if (!store.plan?.includesCustomDomain) {
      throwErr(ErrorCodes.DOMAIN_TOO_MANY, 'Your plan does not include custom domains');
    }

    const cnameTarget = generateCnameTarget(storeId);
    const txtVerification = generateTxtVerification();

    let verification;
    try {
      verification = await db.transaction(async (tx) => {
        const exists = await domainRepo.checkDomainExists(domain);
        if (exists) throwErr(ErrorCodes.DOMAIN_ALREADY_TAKEN, `"${domain}" is already in use`);
        return domainRepo.create(
          {
            storeId,
            domain,
            verificationType,
            cnameTarget: verificationType === 'cname' ? cnameTarget : null,
            txtName: verificationType === 'txt'
              ? `${txtVerification.txtName}.${domain}`
              : null,
            txtValue: verificationType === 'txt' ? txtVerification.txtValue : null,
          },
          tx,
        );
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throwErr(ErrorCodes.DOMAIN_ALREADY_TAKEN, `"${domain}" is already in use`);
      }
      throw err;
    }

    // Clear any negative cache so the new pending domain resolves to its store
    // (e.g. for status polling) instead of the cached "not found".
    await invalidateDomainCaches(domain);

    return {
      id: verification.id,
      domain,
      status: verification.status,
      verificationType,
      cnameTarget: verificationType === 'cname' ? cnameTarget : undefined,
      txtName: verificationType === 'txt'
        ? `${txtVerification.txtName}.${domain}`
        : undefined,
      txtValue: verificationType === 'txt' ? txtVerification.txtValue : undefined,
    };
  },

  async getCustomDomainStatus(verificationId: string, storeId: string) {
    const verification = await domainRepo.findById(verificationId, storeId);
    if (!verification) throwErr(ErrorCodes.DOMAIN_NOT_FOUND, 'Domain verification not found');

    return {
      id: verification.id,
      domain: verification.domain,
      status: verification.status,
      sslStatus: verification.sslStatus,
      steps: [
        {
          step: 'dns',
          label: 'DNS Verification',
          done: verification.status !== 'pending_dns',
        },
        {
          step: 'ssl',
          label: 'SSL Provisioning',
          done: verification.sslStatus === 'active',
        },
        { step: 'live', label: 'Going Live', done: verification.status === 'live' },
      ],
      verifiedAt: verification.verifiedAt,
      errorMessage: verification.errorMessage,
    };
  },

  // D5 + D6 + D12: on DNS verification success we register the Caddy route
  // (pointing at the store's storefront upstream) and go live. With on-demand
  // TLS the certificate is provisioned on the first HTTPS request, gated by the
  // ask endpoint — so going live no longer depends on a synchronous
  // getCertificateStatus check that never returned 'active' under auto_https off.
  async verifyCustomDomain(verificationId: string, storeId?: string) {
    const verification = await domainRepo.findById(verificationId, storeId);
    if (!verification) throwErr(ErrorCodes.DOMAIN_NOT_FOUND, 'Domain verification not found');

    let verified = false;
    if (verification.verificationType === 'cname' && verification.cnameTarget) {
      verified = await dnsService.verifyCnameRecord(
        verification.domain,
        verification.cnameTarget,
      );
    } else if (verification.verificationType === 'txt' && verification.txtValue) {
      verified = await dnsService.verifyTxtRecord(
        verification.txtName!,
        verification.txtValue,
      );
    }

    if (!verified) {
      await domainRepo.updateStatus(verification.id, {
        lastCheckedAt: new Date(),
      });
      return { verified: false, status: 'pending_dns' };
    }

    // DNS proven — now register the route + go live.
    const store = await db.query.stores.findFirst({
      where: (t, { eq }) => eq(t.id, verification.storeId),
      columns: { id: true, domain: true, storeType: true },
    });
    const upstream = storefrontUpstreamFor(store?.storeType);

    try {
      await caddyService.ensureOnDemandTlsPolicy();
      await caddyService.addCustomDomainRoute(verification.domain, upstream);
    } catch (err) {
      // Caddy unavailable — stay at dns_verified so the merchant/processor can
      // retry. Do NOT go live without a route (the domain would 404).
      const message = err instanceof Error ? err.message : 'Caddy route registration failed';
      await domainRepo.updateStatus(verification.id, {
        status: 'dns_verified',
        verifiedAt: new Date(),
        lastCheckedAt: new Date(),
        sslStatus: 'error',
        errorMessage: message,
      });
      return { verified: true, status: 'dns_verified' };
    }

    await domainRepo.updateStatus(verification.id, {
      status: 'live',
      sslStatus: 'pending',
      verifiedAt: new Date(),
      lastCheckedAt: new Date(),
      errorMessage: null,
    });
    await domainRepo.updateStoreCustomDomain(
      verification.storeId,
      verification.domain,
      true,
    );

    // D9: invalidate caches for the custom domain and the store's subdomain so
    // the public resolver picks up stores.customDomain immediately.
    await invalidateDomainCaches(verification.domain, store?.domain);

    return { verified: true, status: 'live' };
  },

  // D9: invalidate caches for the removed domain + the store subdomain so the
  // resolver stops serving it and frees the domain for a new claim.
  async removeCustomDomain(domainId: string, storeId: string) {
    const verification = await domainRepo.findById(domainId, storeId);
    if (!verification) throwErr(ErrorCodes.DOMAIN_NOT_FOUND, 'Domain verification not found');

    const store = await db.query.stores.findFirst({
      where: (t, { eq }) => eq(t.id, storeId),
      columns: { id: true, domain: true, customDomain: true },
    });

    await domainRepo.delete(domainId, storeId);

    // Clean up Caddy route (best-effort)
    try {
      await caddyService.removeCustomDomainRoute(verification.domain);
    } catch {
      // Caddy may not be running
    }

    // If this was the store's active custom domain, clear it
    if (store?.customDomain === verification.domain) {
      await domainRepo.clearStoreCustomDomain(storeId);
    }

    await invalidateDomainCaches(verification.domain, store?.domain);

    return { removed: true };
  },
};