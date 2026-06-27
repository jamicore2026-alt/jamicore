// Behavioral test: verification_tokens flows route through dbAdmin (BYPASSRLS),
// not the tenant-scoped db. Per RLS spec §4.3 verification_tokens gets no grant
// to app_tenant, so it MUST be accessed via dbAdmin. These methods serve
// signup/verify/reset/MFA — all pre-tenant (lookup by token/email across stores).
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/index.js', () => {
  const dbFindFirst = vi.fn();
  const dbAdminFindFirst = vi.fn();
  return {
    db: { query: { verificationTokens: { findFirst: dbFindFirst } } },
    dbAdmin: { query: { verificationTokens: { findFirst: dbAdminFindFirst } } },
  };
});

import { db, dbAdmin } from '../../db/index.js';
import { authRepo } from './auth.repo.js';

const dbFindFirst = db.query.verificationTokens.findFirst as unknown as ReturnType<typeof vi.fn>;
const dbAdminFindFirst = dbAdmin.query.verificationTokens.findFirst as unknown as ReturnType<typeof vi.fn>;

describe('authRepo verification_tokens dbAdmin routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbAdminFindFirst.mockResolvedValue(undefined);
  });

  it('findVerificationToken routes through dbAdmin, not db', async () => {
    await authRepo.findVerificationToken('tok-1', 'email_verify');

    expect(dbAdminFindFirst).toHaveBeenCalled();
    expect(dbFindFirst).not.toHaveBeenCalled();
  });
});