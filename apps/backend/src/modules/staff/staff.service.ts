// Staff service — business logic, calls staffRepo, imports db ONLY for db.transaction()
import { staffRepo } from './staff.repo.js';
import { ErrorCodes } from '../../errors/codes.js';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { db } from '../../db/index.js';
import { staffInvitations, users } from '../../db/schema.js';
import { eq, and, gt } from 'drizzle-orm';

const SALT_ROUNDS = 12;
const INVITE_EXPIRY_DAYS = 7;

export const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  OWNER: ['*'],
  MANAGER: [
    'products:read', 'products:write',
    'orders:read', 'orders:write',
    'customers:read',
    'coupons:read', 'coupons:write',
    'analytics:read',
    'reviews:read', 'reviews:write',
    'categories:read', 'categories:write',
    'modifiers:read', 'modifiers:write',
    'store:read', 'store:write',
    'payments:config',
    'shipping:write',
    'tax:write',
    'upload:write',
    'staff:write',
    'returns:read', 'returns:write',
  ],
  CASHIER: [
    'orders:read', 'orders:write',
    'customers:read',
    'products:read',
    'returns:read',
  ],
};

export const staffService = {
  // Invite a staff member
  async inviteStaff(storeId: string, email: string, role: string, invitedBy: string) {
    if (!['MANAGER', 'CASHIER'].includes(role)) {
      throw Object.assign(new Error('Invalid staff role'), { code: ErrorCodes.VALIDATION_ERROR });
    }

    // Check if user already exists in this store
    const existing = await staffRepo.findUserByEmail(email, storeId);
    if (existing) {
      throw Object.assign(new Error('User already exists in this store'), { code: ErrorCodes.USER_ALREADY_EXISTS });
    }

    // Check for pending invitation
    const pendingInvite = await staffRepo.findPendingInvitation(email, storeId);
    if (pendingInvite) {
      throw Object.assign(new Error('Pending invitation already exists'), { code: ErrorCodes.VALIDATION_ERROR });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const invitation = await staffRepo.insertInvitation({
      storeId,
      email,
      role,
      invitedBy,
      token,
      expiresAt,
    });

    return invitation;
  },

  // Accept staff invitation (no auth - new user)
  async acceptInvitation(token: string, password: string, _name?: string) {
    return db.transaction(async (tx) => {
      const invitation = await tx.select().from(staffInvitations)
        .where(
          and(
            eq(staffInvitations.token, token),
            eq(staffInvitations.status, 'pending'),
            gt(staffInvitations.expiresAt, new Date()),
          ),
        )
        .for('update');

      if (!invitation.length) {
        throw Object.assign(new Error('Invitation not found or expired'), { code: ErrorCodes.STAFF_INVITE_NOT_FOUND });
      }

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      // Update status first to prevent concurrent acceptance
      await tx.update(staffInvitations)
        .set({ status: 'accepted', acceptedAt: new Date() })
        .where(eq(staffInvitations.id, invitation[0].id));

      // Create user
      const [user] = await tx.insert(users).values({
        email: invitation[0].email,
        password: hashedPassword,
        role: invitation[0].role,
        storeId: invitation[0].storeId,
      }).returning();

      return { user: { id: user.id, email: user.email, role: user.role, storeId: user.storeId }, invitation: invitation[0] };
    });
  },

  // Reject staff invitation
  async rejectInvitation(token: string) {
    const invitation = await staffRepo.findInvitationByTokenPending(token);

    if (!invitation) {
      throw Object.assign(new Error('Invitation not found'), { code: ErrorCodes.STAFF_INVITE_NOT_FOUND });
    }

    await staffRepo.updateInvitationStatus(invitation.id, 'rejected', {});

    return { rejected: true };
  },

  // List staff members (non-OWNER users)
  async listStaff(storeId: string) {
    return staffRepo.listStaff(storeId);
  },

  // List pending invitations
  async listInvitations(storeId: string) {
    return staffRepo.listInvitations(storeId);
  },

  // Update staff role
  async updateStaffRole(userId: string, storeId: string, role: string) {
    if (!['MANAGER', 'CASHIER'].includes(role)) {
      throw Object.assign(new Error('Invalid staff role'), { code: ErrorCodes.VALIDATION_ERROR });
    }

    const user = await staffRepo.findUserById(userId, storeId);

    if (!user) {
      throw Object.assign(new Error('Staff member not found'), { code: ErrorCodes.STAFF_NOT_FOUND });
    }

    if (user.role === 'OWNER') {
      throw Object.assign(new Error('Cannot change owner role'), { code: ErrorCodes.CANNOT_REMOVE_OWNER });
    }

    const updated = await staffRepo.updateUserRole(userId, storeId, role);

    return { id: updated.id, email: updated.email, role: updated.role };
  },

  // Remove staff member
  async removeStaff(userId: string, storeId: string) {
    const user = await staffRepo.findUserById(userId, storeId);

    if (!user) {
      throw Object.assign(new Error('Staff member not found'), { code: ErrorCodes.STAFF_NOT_FOUND });
    }

    if (user.role === 'OWNER') {
      throw Object.assign(new Error('Cannot remove store owner'), { code: ErrorCodes.CANNOT_REMOVE_OWNER });
    }

    await staffRepo.deleteUser(userId, storeId);
    return { removed: true };
  },

  // Check if user has a specific permission
  async hasPermission(userRole: string, permission: string, storeId?: string): Promise<boolean> {
    // OWNER has all permissions
    if (DEFAULT_PERMISSIONS.OWNER.includes('*') && userRole === 'OWNER') return true;

    // Check DB overrides first
    if (storeId) {
      const override = await staffRepo.findRoleOverride(storeId, userRole);
      if (override) {
        return override.permissions.includes('*') || override.permissions.includes(permission);
      }
    }

    // Fall back to defaults
    const perms = DEFAULT_PERMISSIONS[userRole];
    if (!perms) return false;
    return perms.includes('*') || perms.includes(permission);
  },

  // Find role permission override from DB
  async findRoleOverride(storeId: string, role: string) {
    return staffRepo.findRoleOverride(storeId, role);
  },

  // Get default permissions for a role
  getDefaultPermissions(role: string): string[] {
    return DEFAULT_PERMISSIONS[role] ?? [];
  },
};