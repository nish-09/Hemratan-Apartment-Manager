-- Hemratan Apartment Manager: Migration 006 - Directory & Domestic Help Attendance
-- Schema: service_providers, domestic_staff, staff_flat_authorizations, staff_attendance_logs, directory_contact_access_logs

-- 1. SERVICE PROVIDERS & HELP DIRECTORY
CREATE TABLE IF NOT EXISTS public.service_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL
        CHECK (category IN ('PLUMBER', 'ELECTRICIAN', 'HOUSEKEEPING', 'DOMESTIC_HELP', 'COOK', 'MAID', 'DRIVER', 'CARPENTER', 'PAINTER', 'LIFT_MAINTENANCE', 'SECURITY', 'OTHER')),
    phone_number VARCHAR(30) NOT NULL,
    profile_photo_path TEXT,
    bio TEXT,
    languages VARCHAR(100) NOT NULL DEFAULT 'Hindi, Marathi, English',
    working_hours VARCHAR(100) NOT NULL DEFAULT '08:00 AM - 08:00 PM',
    verification_status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
        CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    verification_notes TEXT,
    has_police_verification BOOLEAN NOT NULL DEFAULT false,
    id_proof_type VARCHAR(50) DEFAULT 'AADHAAR',
    id_proof_number_masked VARCHAR(50),
    is_listing_active BOOLEAN NOT NULL DEFAULT true,
    consent_given_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    consent_withdrawn_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2. DOMESTIC STAFF (Workers tied specifically to residential flats)
CREATE TABLE IF NOT EXISTS public.domestic_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_provider_id UUID REFERENCES public.service_providers(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    service_type VARCHAR(50) NOT NULL
        CHECK (service_type IN ('MAID', 'COOK', 'DRIVER', 'BABYSITTER', 'ELDERCARE', 'CLEANER', 'OTHER')),
    phone_number VARCHAR(30) NOT NULL,
    profile_photo_path TEXT,
    emergency_contact VARCHAR(30),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3. STAFF FLAT AUTHORIZATIONS (Mapping workers to multiple flats with resident approval)
CREATE TABLE IF NOT EXISTS public.staff_flat_authorizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domestic_staff_id UUID NOT NULL REFERENCES public.domestic_staff(id) ON DELETE CASCADE,
    flat_id UUID NOT NULL REFERENCES public.flats(id) ON DELETE CASCADE,
    authorized_by_profile_id UUID REFERENCES public.profiles(id),
    status VARCHAR(30) NOT NULL DEFAULT 'APPROVED'
        CHECK (status IN ('PENDING', 'APPROVED', 'REVOKED')),
    morning_slot BOOLEAN NOT NULL DEFAULT true,
    evening_slot BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(domestic_staff_id, flat_id)
);

-- 4. STAFF ATTENDANCE LOGS (Gate check-in / check-out records)
CREATE TABLE IF NOT EXISTS public.staff_attendance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domestic_staff_id UUID NOT NULL REFERENCES public.domestic_staff(id) ON DELETE CASCADE,
    entry_time TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    entry_guard_id UUID REFERENCES public.profiles(id),
    entry_gate VARCHAR(50) NOT NULL DEFAULT 'Gate 1 Main Access',
    exit_time TIMESTAMPTZ,
    exit_guard_id UUID REFERENCES public.profiles(id),
    status VARCHAR(20) NOT NULL DEFAULT 'INSIDE'
        CHECK (status IN ('INSIDE', 'COMPLETED', 'CANCELLED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT chk_staff_exit_after_entry CHECK (exit_time IS NULL OR exit_time >= entry_time)
);

-- 5. DIRECTORY CONTACT ACCESS AUDIT LOGS (Privacy protection tracking)
CREATE TABLE IF NOT EXISTS public.directory_contact_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
    accessed_by_profile_id UUID NOT NULL REFERENCES public.profiles(id),
    accessed_by_flat_id UUID REFERENCES public.flats(id),
    reason VARCHAR(100) NOT NULL DEFAULT 'RESIDENT_SERVICE_INQUIRY',
    accessed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 6. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_service_providers_category ON public.service_providers(category);
CREATE INDEX IF NOT EXISTS idx_service_providers_status ON public.service_providers(verification_status, is_listing_active);
CREATE INDEX IF NOT EXISTS idx_domestic_staff_active ON public.domestic_staff(is_active);
CREATE INDEX IF NOT EXISTS idx_staff_flat_auth_flat ON public.staff_flat_authorizations(flat_id);
CREATE INDEX IF NOT EXISTS idx_staff_flat_auth_staff ON public.staff_flat_authorizations(domestic_staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_status ON public.staff_attendance_logs(status);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff ON public.staff_attendance_logs(domestic_staff_id);
CREATE INDEX IF NOT EXISTS idx_directory_contact_access_provider ON public.directory_contact_access_logs(service_provider_id);

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domestic_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_flat_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directory_contact_access_logs ENABLE ROW LEVEL SECURITY;

-- Service Providers: Active verified listings are viewable by all authenticated users
CREATE POLICY "Authenticated users can view active verified directory"
  ON public.service_providers FOR SELECT
  TO authenticated
  USING (is_listing_active = true AND verification_status = 'VERIFIED');

-- Service Providers: Committee & Super Admin can manage all listings
CREATE POLICY "Committee can manage directory listings"
  ON public.service_providers FOR ALL
  TO authenticated
  USING (public.has_role('COMMITTEE') OR public.has_role('SUPER_ADMIN'));

-- Domestic Staff: Guards, Committee, Super Admin can view all domestic staff
CREATE POLICY "Guards and Committee can view domestic staff"
  ON public.domestic_staff FOR SELECT
  TO authenticated
  USING (public.has_role('GUARD') OR public.has_role('COMMITTEE') OR public.has_role('SUPER_ADMIN'));

-- Staff Flat Authorizations: Residents can view staff authorized for their flats
CREATE POLICY "Residents can view authorizations for own flats"
  ON public.staff_flat_authorizations FOR SELECT
  TO authenticated
  USING (public.has_flat_access(flat_id) OR public.has_role('GUARD') OR public.has_role('COMMITTEE'));

-- Staff Attendance Logs: Guards and Committee can manage gate logs
CREATE POLICY "Guards can record staff attendance"
  ON public.staff_attendance_logs FOR ALL
  TO authenticated
  USING (public.has_role('GUARD') OR public.has_role('COMMITTEE'));

-- Staff Attendance Logs: Residents can view logs for staff authorized for their flat
CREATE POLICY "Residents can view attendance for their domestic staff"
  ON public.staff_attendance_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_flat_authorizations sfa
      WHERE sfa.domestic_staff_id = public.staff_attendance_logs.domestic_staff_id
        AND public.has_flat_access(sfa.flat_id)
        AND sfa.status = 'APPROVED'
    )
  );

-- Directory Contact Access Logs: Committee & Super Admin can inspect audit logs
CREATE POLICY "Committee can view contact access audit logs"
  ON public.directory_contact_access_logs FOR SELECT
  TO authenticated
  USING (public.has_role('COMMITTEE') OR public.has_role('SUPER_ADMIN'));

CREATE POLICY "Authenticated users can insert contact access audit"
  ON public.directory_contact_access_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);
