import { UserRole } from '@/types/roles';

export const PERMISSIONS = {
  // Visitor Management
  VISITORS_VIEW_OWN: 'visitors:view_own',
  VISITORS_VIEW_ALL: 'visitors:view_all',
  VISITORS_REGISTER: 'visitors:register',
  VISITORS_APPROVE: 'visitors:approve',
  VISITORS_CHECKOUT: 'visitors:checkout',

  // Complaints
  COMPLAINTS_CREATE: 'complaints:create',
  COMPLAINTS_VIEW_OWN: 'complaints:view_own',
  COMPLAINTS_VIEW_ALL: 'complaints:view_all',
  COMPLAINTS_TRIAGE: 'complaints:triage',
  COMPLAINTS_OVERRIDE_PRIORITY: 'complaints:override_priority',

  // Billing & Maintenance
  BILLS_VIEW_OWN: 'bills:view_own',
  BILLS_VIEW_ALL: 'bills:view_all',
  BILLS_GENERATE: 'bills:generate',
  PAYMENTS_RECORD: 'payments:record',

  // Deliveries & Parking
  DELIVERIES_MANAGE: 'deliveries:manage',
  DELIVERIES_VIEW_OWN: 'deliveries:view_own',
  PARKING_RESERVE: 'parking:reserve',
  PARKING_MANAGE: 'parking:manage',

  // Directory & Staff
  DIRECTORY_VIEW: 'directory:view',
  STAFF_ATTENDANCE_LOG: 'staff:attendance_log',
  STAFF_VIEW_OWN: 'staff:view_own',

  // Society Governance
  RULES_MANAGE: 'rules:manage',
  FLATS_MANAGE: 'flats:manage',
  USERS_MANAGE: 'users:manage',
  AUDIT_LOGS_VIEW: 'audit_logs:view',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<UserRole, PermissionCode[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS),
  COMMITTEE: [
    PERMISSIONS.VISITORS_VIEW_ALL,
    PERMISSIONS.VISITORS_REGISTER,
    PERMISSIONS.VISITORS_APPROVE,
    PERMISSIONS.VISITORS_CHECKOUT,
    PERMISSIONS.COMPLAINTS_CREATE,
    PERMISSIONS.COMPLAINTS_VIEW_ALL,
    PERMISSIONS.COMPLAINTS_TRIAGE,
    PERMISSIONS.COMPLAINTS_OVERRIDE_PRIORITY,
    PERMISSIONS.BILLS_VIEW_ALL,
    PERMISSIONS.BILLS_GENERATE,
    PERMISSIONS.PAYMENTS_RECORD,
    PERMISSIONS.DELIVERIES_MANAGE,
    PERMISSIONS.PARKING_MANAGE,
    PERMISSIONS.DIRECTORY_VIEW,
    PERMISSIONS.RULES_MANAGE,
    PERMISSIONS.FLATS_MANAGE,
    PERMISSIONS.AUDIT_LOGS_VIEW,
  ],
  GUARD: [
    PERMISSIONS.VISITORS_VIEW_ALL,
    PERMISSIONS.VISITORS_REGISTER,
    PERMISSIONS.VISITORS_APPROVE,
    PERMISSIONS.VISITORS_CHECKOUT,
    PERMISSIONS.DELIVERIES_MANAGE,
    PERMISSIONS.STAFF_ATTENDANCE_LOG,
    PERMISSIONS.PARKING_MANAGE,
    PERMISSIONS.DIRECTORY_VIEW,
  ],
  RESIDENT: [
    PERMISSIONS.VISITORS_VIEW_OWN,
    PERMISSIONS.VISITORS_REGISTER,
    PERMISSIONS.VISITORS_APPROVE,
    PERMISSIONS.COMPLAINTS_CREATE,
    PERMISSIONS.COMPLAINTS_VIEW_OWN,
    PERMISSIONS.BILLS_VIEW_OWN,
    PERMISSIONS.DELIVERIES_VIEW_OWN,
    PERMISSIONS.PARKING_RESERVE,
    PERMISSIONS.DIRECTORY_VIEW,
    PERMISSIONS.STAFF_VIEW_OWN,
  ],
};

/**
 * Checks if a given role possesses a required permission.
 */
export function hasPermission(role: UserRole, permission: PermissionCode): boolean {
  if (role === 'SUPER_ADMIN') return true;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Checks whether a user has permission to access or view records of a specific flat.
 * Residents may only access flats they are verified members of.
 * Committee and Super Admin have society-wide clearance.
 */
export function canAccessFlat(
  userRole: UserRole,
  userFlatIds: string[],
  targetFlatId: string
): boolean {
  if (userRole === 'SUPER_ADMIN' || userRole === 'COMMITTEE') {
    return true;
  }
  return userFlatIds.includes(targetFlatId);
}
