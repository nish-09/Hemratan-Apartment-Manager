import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { canAccessFlat, hasPermission, PERMISSIONS } from '@/lib/auth/rbac';
import { UserRole } from '@/types/roles';

describe('Database Row-Level Security (RLS) & Access Policy Audit', () => {
  const migrationPath = path.resolve(import.meta.dirname, '../../../supabase/migrations/20261102000002_rls_policies.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  it('verifies RLS is enabled on all core identity and permission tables in SQL migration', () => {
    const requiredTables = [
      'buildings',
      'wings',
      'flats',
      'roles',
      'permissions',
      'role_permissions',
      'profiles',
      'user_roles',
      'user_flat_memberships',
    ];

    for (const table of requiredTables) {
      expect(migrationSql).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
    }
  });

  it('verifies RLS is enabled on all visitor management tables in migration 003', () => {
    const migration003Path = path.resolve(import.meta.dirname, '../../../supabase/migrations/20261102000003_visitor_management.sql');
    const migration003Sql = fs.readFileSync(migration003Path, 'utf8');

    const visitorTables = [
      'visitors',
      'visitor_media',
      'visits',
      'otp_verifications',
      'visitor_approvals',
      'visitor_consents',
    ];

    for (const table of visitorTables) {
      expect(migration003Sql).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
    }
    expect(migration003Sql).toContain('Residents can view visits for own flats');
  });

  it('verifies RLS is enabled on all parking and delivery management tables in migration 004', () => {
    const migration004Path = path.resolve(import.meta.dirname, '../../../supabase/migrations/20261102000004_parking_and_deliveries.sql');
    const migration004Sql = fs.readFileSync(migration004Path, 'utf8');

    const stage3Tables = [
      'parking_spaces',
      'parking_allocations',
      'parking_audit_logs',
      'deliveries',
      'delivery_status_history',
      'delivery_notifications',
    ];

    for (const table of stage3Tables) {
      expect(migration004Sql).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
    }
    expect(migration004Sql).toContain('Residents can view deliveries for own flat');
    expect(migration004Sql).toContain('Guards can manage parking allocations');
  });

  it('verifies SECURITY DEFINER functions enforce safe search_path and revoke public execution', () => {
    expect(migrationSql).toContain('SET search_path = public, pg_temp');
    expect(migrationSql).toContain('REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM PUBLIC;');
    expect(migrationSql).toContain('REVOKE EXECUTE ON FUNCTION public.has_role(TEXT) FROM PUBLIC;');
    expect(migrationSql).toContain('REVOKE EXECUTE ON FUNCTION public.has_flat_access(UUID) FROM PUBLIC;');
  });

  it('strictly isolates cross-flat access for residents', () => {
    const residentFlat = 'flat-uuid-402';
    const neighborFlat = 'flat-uuid-403';

    // Resident can access own flat
    expect(canAccessFlat('RESIDENT', [residentFlat], residentFlat)).toBe(true);

    // Resident CANNOT access neighbor flat
    expect(canAccessFlat('RESIDENT', [residentFlat], neighborFlat)).toBe(false);

    // Multi-flat owner can access both of their flats
    const secondFlat = 'flat-uuid-101';
    expect(canAccessFlat('RESIDENT', [residentFlat, secondFlat], secondFlat)).toBe(true);
    expect(canAccessFlat('RESIDENT', [residentFlat, secondFlat], neighborFlat)).toBe(false);
  });

  it('strictly restricts financial and billing permissions away from Guards', () => {
    const guardRole: UserRole = 'GUARD';
    expect(hasPermission(guardRole, PERMISSIONS.BILLS_VIEW_ALL)).toBe(false);
    expect(hasPermission(guardRole, PERMISSIONS.BILLS_GENERATE)).toBe(false);
    expect(hasPermission(guardRole, PERMISSIONS.PAYMENTS_RECORD)).toBe(false);
  });

  it('grants Committee society-wide administrative clearance', () => {
    const committeeRole: UserRole = 'COMMITTEE';
    expect(hasPermission(committeeRole, PERMISSIONS.FLATS_MANAGE)).toBe(true);
    expect(hasPermission(committeeRole, PERMISSIONS.BILLS_GENERATE)).toBe(true);
    expect(hasPermission(committeeRole, PERMISSIONS.COMPLAINTS_TRIAGE)).toBe(true);
    expect(canAccessFlat(committeeRole, [], 'any-flat-uuid')).toBe(true);
  });

  it('verifies RLS is enabled on all complaints and tasks tables in migration 005', () => {
    const migration005Path = path.resolve(import.meta.dirname, '../../../supabase/migrations/20261102000005_complaints_and_tasks.sql');
    const migration005Sql = fs.readFileSync(migration005Path, 'utf8');

    const stage4Tables = [
      'complaints',
      'complaint_identity_mappings',
      'complaint_media',
      'complaint_priority_history',
      'complaint_tasks',
      'complaint_task_progress',
      'complaint_feedback',
    ];

    for (const table of stage4Tables) {
      expect(migration005Sql).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
    }
    expect(migration005Sql).toContain('Super Admin exclusively can access identity mapping');
    expect(migration005Sql).toContain('Residents can view own flat complaints');
    expect(migration005Sql).toContain('Committee can manage all complaints');
    expect(migration005Sql).toContain('Staff can view assigned tasks');
  });

  it('verifies RLS is enabled on all directory and domestic help tables in migration 006', () => {
    const migration006Path = path.resolve(import.meta.dirname, '../../../supabase/migrations/20261102000006_directory_and_domestic_help.sql');
    const migration006Sql = fs.readFileSync(migration006Path, 'utf8');

    const stage5Tables = [
      'service_providers',
      'domestic_staff',
      'staff_flat_authorizations',
      'staff_attendance_logs',
      'directory_contact_access_logs',
    ];

    for (const table of stage5Tables) {
      expect(migration006Sql).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
    }
    expect(migration006Sql).toContain('Guards can record staff attendance');
    expect(migration006Sql).toContain('Residents can view attendance for their domestic staff');
    expect(migration006Sql).toContain('Committee can manage directory listings');
    expect(migration006Sql).toContain('Authenticated users can view active verified directory');
  });

  it('verifies RLS is enabled on all financial accounting tables in migration 007', () => {
    const migration007Path = path.resolve(import.meta.dirname, '../../../supabase/migrations/20261102000007_financial_accounting.sql');
    const migration007Sql = fs.readFileSync(migration007Path, 'utf8');

    const stage6Tables = [
      'billing_configurations',
      'billing_periods',
      'billing_batches',
      'invoices',
      'invoice_line_items',
      'invoice_adjustments',
      'payments',
      'payment_provider_orders',
      'payment_webhook_events',
      'payment_receipts',
      'expenses',
      'expense_attachments',
      'expense_approvals',
      'billing_disputes',
      'financial_audit_logs',
    ];

    for (const table of stage6Tables) {
      expect(migration007Sql).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
    }
    expect(migration007Sql).toContain('Committee & Super Admin full billing access');
    expect(migration007Sql).toContain('Residents view own flat invoices only');
    expect(migration007Sql).toContain('Residents view own flat invoice line items');
    expect(migration007Sql).toContain('Residents view own flat payments');
    expect(migration007Sql).toContain('Residents view own flat receipts');
    expect(migration007Sql).toContain('Residents manage own billing disputes');
    expect(migration007Sql).toContain('Committee & Super Admin full expense access');
  });

  it('grants Super Admin full platform governance', () => {
    const superAdminRole: UserRole = 'SUPER_ADMIN';
    expect(hasPermission(superAdminRole, PERMISSIONS.USERS_MANAGE)).toBe(true);
    expect(hasPermission(superAdminRole, PERMISSIONS.AUDIT_LOGS_VIEW)).toBe(true);
    expect(canAccessFlat(superAdminRole, [], 'any-flat-uuid')).toBe(true);
  });
});
