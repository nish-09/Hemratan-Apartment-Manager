-- Hemratan Apartment Manager: Migration 005 - Complaint Management & Task Assignment
-- Schema: complaints, complaint_identity_mappings, complaint_media, complaint_priority_history, complaint_tasks, complaint_task_progress, complaint_feedback

-- 1. COMPLAINTS TABLE
CREATE TABLE IF NOT EXISTS public.complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_no VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(30) NOT NULL
        CHECK (category IN ('PLUMBING', 'ELECTRICAL', 'LIFT', 'HOUSEKEEPING', 'SECURITY', 'PARKING', 'NOISE', 'STRUCTURAL', 'AMENITIES', 'OTHER')),
    flat_id UUID REFERENCES public.flats(id) ON DELETE SET NULL,
    is_anonymous BOOLEAN NOT NULL DEFAULT false,
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM'
        CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    urgency VARCHAR(20) NOT NULL DEFAULT 'MEDIUM'
        CHECK (urgency IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    affected_flats_count INTEGER NOT NULL DEFAULT 1 CHECK (affected_flats_count >= 1),
    property_damage BOOLEAN NOT NULL DEFAULT false,
    recurrence BOOLEAN NOT NULL DEFAULT false,
    safety_override_triggered BOOLEAN NOT NULL DEFAULT false,
    safety_override_type VARCHAR(50),
    computed_score INTEGER NOT NULL CHECK (computed_score >= 0 AND computed_score <= 100),
    priority_band VARCHAR(20) NOT NULL DEFAULT 'MEDIUM'
        CHECK (priority_band IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    priority_explanation JSONB NOT NULL DEFAULT '{}'::jsonb,
    committee_priority VARCHAR(20)
        CHECK (committee_priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED', 'REOPENED')),
    confirmed_eta TIMESTAMPTZ,
    confirmed_eta_by UUID REFERENCES public.profiles(id),
    created_by_profile_id UUID REFERENCES public.profiles(id),
    reopened_count INTEGER NOT NULL DEFAULT 0,
    reopened_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    resolved_at TIMESTAMPTZ
);

-- 2. ANONYMOUS COMPLAINT IDENTITY MAPPING (Private, Super Admin Only)
CREATE TABLE IF NOT EXISTS public.complaint_identity_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL UNIQUE REFERENCES public.complaints(id) ON DELETE CASCADE,
    real_complainant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    real_flat_id UUID NOT NULL REFERENCES public.flats(id) ON DELETE CASCADE,
    access_audit_log JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3. COMPLAINT MEDIA ATTACHMENTS (Images up to 10MB, Videos up to 50MB in private bucket)
CREATE TABLE IF NOT EXISTS public.complaint_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('IMAGE', 'VIDEO')),
    file_path VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    is_sanitized_name BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT chk_media_size_limit CHECK (
        (file_type = 'IMAGE' AND file_size_bytes <= 10485760) OR -- 10MB
        (file_type = 'VIDEO' AND file_size_bytes <= 52428800)    -- 50MB
    )
);

-- 4. PRIORITY OVERRIDE HISTORY (Audit Trail)
CREATE TABLE IF NOT EXISTS public.complaint_priority_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    previous_priority VARCHAR(20) NOT NULL,
    new_priority VARCHAR(20) NOT NULL,
    override_reason TEXT NOT NULL,
    overridden_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 5. COMPLAINT TASKS (Task Assignment)
CREATE TABLE IF NOT EXISTS public.complaint_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    assigned_staff_id UUID REFERENCES public.profiles(id),
    assigned_committee_id UUID REFERENCES public.profiles(id),
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM'
        CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED')),
    due_date TIMESTAMPTZ,
    estimated_duration_hours NUMERIC(5,2),
    eta TIMESTAMPTZ,
    eta_status VARCHAR(30) NOT NULL DEFAULT 'PROPOSED'
        CHECK (eta_status IN ('PROPOSED', 'CONFIRMED', 'REVISED')),
    internal_notes TEXT,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    resolved_at TIMESTAMPTZ
);

-- 6. COMPLAINT TASK PROGRESS UPDATES
CREATE TABLE IF NOT EXISTS public.complaint_task_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.complaint_tasks(id) ON DELETE CASCADE,
    updated_by UUID NOT NULL REFERENCES public.profiles(id),
    status_update VARCHAR(30) NOT NULL,
    notes TEXT NOT NULL,
    evidence_photo_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 7. COMPLAINT FEEDBACK
CREATE TABLE IF NOT EXISTS public.complaint_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL UNIQUE REFERENCES public.complaints(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback_comments TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 8. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_complaints_flat ON public.complaints(flat_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_priority ON public.complaints(priority_band);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON public.complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaint_tasks_complaint ON public.complaint_tasks(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_tasks_staff ON public.complaint_tasks(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_complaint_tasks_status ON public.complaint_tasks(status);

-- 9. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_identity_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_priority_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_task_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_feedback ENABLE ROW LEVEL SECURITY;

-- Complaints: Committee & Super Admin can view all complaints
CREATE POLICY "Committee can manage all complaints"
  ON public.complaints FOR ALL
  TO authenticated
  USING (public.has_role('COMMITTEE') OR public.has_role('SUPER_ADMIN'));

-- Complaints: Operational Staff & Guards can view assigned or active complaints
CREATE POLICY "Staff can view active complaints"
  ON public.complaints FOR SELECT
  TO authenticated
  USING (public.has_role('GUARD'));

-- Complaints: Residents can view their own non-anonymous complaints
CREATE POLICY "Residents can view own flat complaints"
  ON public.complaints FOR SELECT
  TO authenticated
  USING (flat_id IS NOT NULL AND public.has_flat_access(flat_id));

-- Complaints: Residents can insert new complaints
CREATE POLICY "Residents can submit complaints"
  ON public.complaints FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Anonymous Identity Mapping: STRICTLY Super Admin only
CREATE POLICY "Super Admin exclusively can access identity mapping"
  ON public.complaint_identity_mappings FOR ALL
  TO authenticated
  USING (public.has_role('SUPER_ADMIN'));

-- Tasks: Staff can view and update tasks assigned to them
CREATE POLICY "Staff can view assigned tasks"
  ON public.complaint_tasks FOR SELECT
  TO authenticated
  USING (assigned_staff_id = auth.uid() OR public.has_role('COMMITTEE') OR public.has_role('SUPER_ADMIN'));

CREATE POLICY "Staff can update assigned tasks"
  ON public.complaint_tasks FOR UPDATE
  TO authenticated
  USING (assigned_staff_id = auth.uid() OR public.has_role('COMMITTEE') OR public.has_role('SUPER_ADMIN'));
