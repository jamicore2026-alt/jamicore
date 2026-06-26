import type { Job } from 'bullmq';
import { domainService } from '../modules/domain/domain.service.js';
import { domainRepo } from '../modules/domain/domain.repo.js';

interface DomainVerificationJobData {
  verificationId: string;
  storeId: string;
}

// D4: automatic DNS polling. The previous implementation returned cleanly when
// DNS was not yet verified (and it wasn't the last attempt), so BullMQ marked the
// job complete and never retried — the "polls every 5 min for 24h" claim was
// false and the merchant had to click Verify manually. We now throw on
// not-verified so BullMQ retries on its backoff schedule, and mark `failed` only
// on the final attempt.
//
// D12: going live (route registration + stores.customDomain) is handled inside
// domainService.verifyCustomDomain, so this processor stays thin.
export async function processDomainVerification(
  job: Job<DomainVerificationJobData>,
): Promise<void> {
  const { verificationId } = job.data;

  // Skip if already processed or removed.
  const verification = await domainRepo.findById(verificationId);
  if (!verification || verification.status !== 'pending_dns') {
    return;
  }

  const result = await domainService.verifyCustomDomain(verificationId);

  if (result.verified) {
    // Service set status to live (or dns_verified if Caddy was unreachable).
    return;
  }

  // DNS not yet verified — throw so BullMQ retries on the configured backoff.
  const maxAttempts = job.opts.attempts ?? 288;
  if (job.attemptsMade >= maxAttempts - 1) {
    await domainRepo.updateStatus(verificationId, {
      status: 'failed',
      errorMessage: 'DNS verification timed out after 24 hours',
      lastCheckedAt: new Date(),
    });
    return;
  }
  throw new Error('DNS not yet verified — retry');
}