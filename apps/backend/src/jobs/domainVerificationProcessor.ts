import type { Job } from 'bullmq';
import { domainService } from '../modules/domain/domain.service.js';
import { domainRepo } from '../modules/domain/domain.repo.js';
import { caddyService } from '../services/caddy.service.js';

interface DomainVerificationJobData {
  verificationId: string;
  storeId: string;
}

export async function processDomainVerification(
  job: Job<DomainVerificationJobData>,
): Promise<void> {
  const { verificationId } = job.data;

  // Check if still pending
  const verification = await domainRepo.findById(verificationId);
  if (!verification || verification.status !== 'pending_dns') {
    return; // Already processed or removed
  }

  // Verify DNS
  const result = await domainService.verifyCustomDomain(verificationId);

  if (result.verified) {
    // Wait a moment for SSL to provision
    await new Promise((r) => setTimeout(r, 30_000));

    try {
      const sslStatus = await caddyService.getCertificateStatus(verification.domain);
      if (sslStatus === 'active') {
        await domainRepo.updateStatus(verificationId, { status: 'live', sslStatus: 'active' });
        await domainRepo.updateStoreCustomDomain(
          verification.storeId,
          verification.domain,
          true,
        );
      } else {
        await domainRepo.updateStatus(verificationId, {
          status: 'ssl_provisioning',
          sslStatus,
        });
        // Re-queue to check SSL again
        throw new Error('SSL not yet active — retry');
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('SSL')) {
        throw err; // Trigger BullMQ retry for SSL
      }
      await domainRepo.updateStatus(verificationId, { sslStatus: 'error' });
    }
  } else if (job.attemptsMade >= (job.opts.attempts ?? 288) - 1) {
    // Last attempt: mark as failed
    await domainRepo.updateStatus(verificationId, {
      status: 'failed',
      errorMessage: 'DNS verification timed out after 24 hours',
      lastCheckedAt: new Date(),
    });
  }
}
