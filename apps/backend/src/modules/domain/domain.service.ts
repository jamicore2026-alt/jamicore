import { db } from '../../db/index.js';
import { ErrorCodes } from '../../errors/codes.js';
import { domainRepo } from './domain.repo.js';
import { dnsService } from '../../services/dns.service.js';
import { caddyService } from '../../services/caddy.service.js';
import {
  generateCnameTarget,
  generateTxtVerification,
  isValidDomain,
  normalizeDomain,
} from './domain.helpers.js';

function throwErr(code: string, message: string): never {
  throw Object.assign(new Error(message), { code });
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

  async updateSubdomain(storeId: string, subdomain: string) {
    const store = await db.query.stores.findFirst({
      where: (t, { eq }) => eq(t.id, storeId),
      columns: { id: true, domain: true },
    });
    if (!store) throwErr(ErrorCodes.STORE_NOT_FOUND, 'Store not found');

    if (store.domain === subdomain) {
      return { subdomain, storeUrl: `https://${subdomain}.jamicore.com` };
    }

    const exists = await domainRepo.checkDomainExists(subdomain, storeId);
    if (exists) throwErr(ErrorCodes.DOMAIN_ALREADY_TAKEN, `"${subdomain}" is already in use`);

    await domainRepo.updateStoreDomain(storeId, subdomain);

    return { subdomain, storeUrl: `https://${subdomain}.jamicore.com` };
  },

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

    const exists = await domainRepo.checkDomainExists(domain);
    if (exists) throwErr(ErrorCodes.DOMAIN_ALREADY_TAKEN, `"${domain}" is already in use`);

    const cnameTarget = generateCnameTarget(storeId);
    const txtVerification = generateTxtVerification();

    const verification = await domainRepo.create({
      storeId,
      domain,
      verificationType,
      cnameTarget: verificationType === 'cname' ? cnameTarget : null,
      txtName: verificationType === 'txt'
        ? `${txtVerification.txtName}.${domain}`
        : null,
      txtValue: verificationType === 'txt' ? txtVerification.txtValue : null,
    });

    // Register route in Caddy (best-effort — may not be running in dev)
    try {
      await caddyService.addCustomDomainRoute(domain);
    } catch {
      // Caddy may not be available; verification job will retry
    }

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

    if (verified) {
      await domainRepo.updateStatus(verification.id, {
        status: 'dns_verified',
        verifiedAt: new Date(),
        lastCheckedAt: new Date(),
      });

      // Trigger SSL via Caddy
      try {
        const sslStatus = await caddyService.getCertificateStatus(verification.domain);
        if (sslStatus === 'active') {
          await domainRepo.updateStatus(verification.id, {
            status: 'live',
            sslStatus: 'active',
          });
          await domainRepo.updateStoreCustomDomain(
            verification.storeId,
            verification.domain,
            true,
          );
        } else {
          await domainRepo.updateStatus(verification.id, {
            status: 'ssl_provisioning',
            sslStatus,
          });
        }
      } catch {
        await domainRepo.updateStatus(verification.id, {
          sslStatus: 'error',
        });
      }

      return { verified: true, status: 'dns_verified' };
    }

    await domainRepo.updateStatus(verification.id, {
      lastCheckedAt: new Date(),
    });

    return { verified: false, status: 'pending_dns' };
  },

  async removeCustomDomain(domainId: string, storeId: string) {
    const verification = await domainRepo.findById(domainId, storeId);
    if (!verification) throwErr(ErrorCodes.DOMAIN_NOT_FOUND, 'Domain verification not found');

    await domainRepo.delete(domainId, storeId);

    // Clean up Caddy route (best-effort)
    try {
      await caddyService.removeCustomDomainRoute(verification.domain);
    } catch {
      // Caddy may not be running
    }

    // If this was the store's active custom domain, clear it
    const store = await db.query.stores.findFirst({
      where: (t, { eq }) => eq(t.id, storeId),
      columns: { id: true, customDomain: true },
    });
    if (store?.customDomain === verification.domain) {
      await domainRepo.clearStoreCustomDomain(storeId);
    }

    return { removed: true };
  },
};
