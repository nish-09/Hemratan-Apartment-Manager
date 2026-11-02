-- Hemratan Apartment Manager: Migration 003 - Visitor Management & Access Logs
-- Schema: visitors, visitor_media, visits, visitor_approvals, otp_verifications, visitor_consents

-- 1. VISITORS MASTER RECORD
CREATE TABLE IF NOT EXISTS public.visitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(150) NOT NULL,
    mobile_number VARCHAR(20) NOT NULL,
    age_range VARCHAR(30) NOT NULL CHECK (age_range IN ('UNDER_18', '18_TO_30', '31_TO_50', '51_TO_65', 'ABOVE_65')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2. VISITOR MEDIA (Stored in private Supabase Storage, referenced by path)
CREATE TABLE IF NOT EXISTS public.visitor_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_id UUID NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes <= 10485760), -- Max 10MB
    mime_type VARCHAR(100) NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3. VISITS LOG
CREATE TABLE IF NOT EXISTS public.visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_id UUID NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
    flat_id UUID NOT NULL REFERENCES public.flats(id) ON DELETE CASCADE,
    guard_id UUID REFERENCES public.profiles(id),
    purpose VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_CHECKS' 
        CHECK (status IN ('PENDING_CHECKS', 'OTP_VERIFIED', 'RESIDENT_APPROVED', 'INSIDE', 'COMPLETED', 'REJECTED')),
    entry_time TIMESTAMPTZ,
    exit_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT chk_visit_exit_after_entry CHECK (exit_time IS NULL OR exit_time >= entry_time)
);

-- 4. OTP VERIFICATIONS
CREATE TABLE IF NOT EXISTS public.otp_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
    visitor_mobile VARCHAR(20) NOT NULL,
    otp_hash VARCHAR(128) NOT NULL, -- Never store raw OTP
    expires_at TIMESTAMPTZ NOT NULL,
    attempts_count INTEGER NOT NULL DEFAULT 0 CHECK (attempts_count <= 3),
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 5. VISITOR APPROVALS (Independent Godrej Intercom or Resident App)
CREATE TABLE IF NOT EXISTS public.visitor_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
    resident_id UUID REFERENCES public.profiles(id),
    channel VARCHAR(30) NOT NULL CHECK (channel IN ('GODREJ_INTERCOM', 'RESIDENT_APP', 'COMMITTEE_CLEARANCE')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('APPROVED', 'REJECTED')),
    notes TEXT,
    recorded_by_guard_id UUID REFERENCES public.profiles(id),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 6. VISITOR CONSENTS (Data Privacy & DPDP Compliance)
CREATE TABLE IF NOT EXISTS public.visitor_consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_id UUID NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
    consent_purpose TEXT NOT NULL,
    consented_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    retention_days INTEGER NOT NULL DEFAULT 90
);

-- 7. PERFORMANCE & COMPOSITE INDEXES
CREATE INDEX IF NOT EXISTS idx_visitors_mobile ON public.visitors(mobile_number);
CREATE INDEX IF NOT EXISTS idx_visits_flat_id ON public.visits(flat_id);
CREATE INDEX IF NOT EXISTS idx_visits_status ON public.visits(status);
CREATE INDEX IF NOT EXISTS idx_visits_entry_time ON public.visits(entry_time);
CREATE INDEX IF NOT EXISTS idx_otp_visit_id ON public.otp_verifications(visit_id);

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_consents ENABLE ROW LEVEL SECURITY;

-- Guards have full operational access to visitor workflows
CREATE POLICY "Guards can manage visitors"
  ON public.visitors FOR ALL
  TO authenticated
  USING (public.has_role('GUARD') OR public.has_role('COMMITTEE'));

CREATE POLICY "Guards can manage visits"
  ON public.visits FOR ALL
  TO authenticated
  USING (public.has_role('GUARD') OR public.has_role('COMMITTEE'));

-- Residents can view and approve visits for their own flats
CREATE POLICY "Residents can view visits for own flats"
  ON public.visits FOR SELECT
  TO authenticated
  USING (public.has_flat_access(flat_id));

CREATE POLICY "Residents can approve visits for own flats"
  ON public.visitor_approvals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.visits v
      WHERE v.id = visit_id AND public.has_flat_access(v.flat_id)
    )
  );

CREATE POLICY "Allow authenticated read approvals for own flat"
  ON public.visitor_approvals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.visits v
      WHERE v.id = visit_id AND (public.has_flat_access(v.flat_id) OR public.has_role('GUARD'))
    )
  );
