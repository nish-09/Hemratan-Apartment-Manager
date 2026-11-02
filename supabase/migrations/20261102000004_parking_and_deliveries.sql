-- Hemratan Apartment Manager: Migration 004 - Parking & Delivery Management
-- Schema: parking_spaces, parking_allocations, parking_audit_logs, deliveries, delivery_status_history, delivery_notifications

-- 1. PARKING SPACES (Configurable capacity, not hardcoded to 5)
CREATE TABLE IF NOT EXISTS public.parking_spaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    display_name VARCHAR(50) NOT NULL UNIQUE,
    parking_type VARCHAR(30) NOT NULL DEFAULT 'VISITOR'
        CHECK (parking_type IN ('VISITOR', 'TWO_WHEELER', 'FOUR_WHEELER', 'RESERVED')),
    location VARCHAR(100) NOT NULL DEFAULT 'Courtyard Gate 1',
    is_active BOOLEAN NOT NULL DEFAULT true,
    vehicle_type_restriction VARCHAR(30) NOT NULL DEFAULT 'ANY'
        CHECK (vehicle_type_restriction IN ('TWO_WHEELER', 'FOUR_WHEELER', 'ANY')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Seed initial 5 visitor parking spaces (P1 to P5)
INSERT INTO public.parking_spaces (display_name, parking_type, location, is_active, vehicle_type_restriction)
VALUES 
    ('P1', 'VISITOR', 'Courtyard Gate 1', true, 'ANY'),
    ('P2', 'VISITOR', 'Courtyard Gate 1', true, 'ANY'),
    ('P3', 'VISITOR', 'Courtyard Gate 1', true, 'ANY'),
    ('P4', 'VISITOR', 'Courtyard Gate 1', true, 'ANY'),
    ('P5', 'VISITOR', 'Courtyard Gate 1', true, 'ANY')
ON CONFLICT (display_name) DO NOTHING;

-- 2. PARKING ALLOCATIONS
CREATE TABLE IF NOT EXISTS public.parking_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parking_space_id UUID NOT NULL REFERENCES public.parking_spaces(id) ON DELETE RESTRICT,
    visit_id UUID REFERENCES public.visits(id) ON DELETE SET NULL,
    flat_id UUID REFERENCES public.flats(id) ON DELETE SET NULL,
    vehicle_number VARCHAR(30) NOT NULL,
    vehicle_type VARCHAR(30) NOT NULL CHECK (vehicle_type IN ('TWO_WHEELER', 'FOUR_WHEELER')),
    allocated_by_guard_id UUID REFERENCES public.profiles(id),
    checked_out_by_guard_id UUID REFERENCES public.profiles(id),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'OVERDUE', 'COMPLETED', 'CANCELLED')),
    expected_duration_minutes INTEGER NOT NULL DEFAULT 120,
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    checked_out_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT chk_checkout_after_allocation CHECK (checked_out_at IS NULL OR checked_out_at >= allocated_at)
);

-- 3. PARKING AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.parking_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parking_space_id UUID REFERENCES public.parking_spaces(id) ON DELETE SET NULL,
    allocation_id UUID REFERENCES public.parking_allocations(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    performed_by UUID REFERENCES public.profiles(id),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 4. DELIVERIES (Parcels & Couriers)
CREATE TABLE IF NOT EXISTS public.deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(100) NOT NULL,
    tracking_number VARCHAR(100),
    recipient_name VARCHAR(150) NOT NULL,
    flat_id UUID NOT NULL REFERENCES public.flats(id) ON DELETE CASCADE,
    category VARCHAR(30) NOT NULL
        CHECK (category IN ('FOOD', 'GROCERY', 'COURIER', 'ECOMMERCE', 'DOCUMENTS', 'OTHER')),
    package_description TEXT,
    package_photo_path TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'RECEIVED'
        CHECK (status IN ('RECEIVED', 'NOTIFIED', 'READY_FOR_COLLECTION', 'COLLECTED', 'RETURNED', 'CANCELLED')),
    received_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    received_by_guard_id UUID REFERENCES public.profiles(id),
    collected_at TIMESTAMPTZ,
    collected_by_name VARCHAR(150),
    collected_by_resident_id UUID REFERENCES public.profiles(id),
    handover_guard_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT chk_delivery_collected_after_received CHECK (collected_at IS NULL OR collected_at >= received_at)
);

-- 5. DELIVERY STATUS HISTORY (Audit Trail)
CREATE TABLE IF NOT EXISTS public.delivery_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    changed_by UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 6. DELIVERY NOTIFICATIONS (In-app resident alerts)
CREATE TABLE IF NOT EXISTS public.delivery_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
    flat_id UUID NOT NULL REFERENCES public.flats(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 7. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_parking_allocations_active ON public.parking_allocations(parking_space_id) WHERE status IN ('ACTIVE', 'OVERDUE');
CREATE INDEX IF NOT EXISTS idx_parking_allocations_visit ON public.parking_allocations(visit_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_flat ON public.deliveries(flat_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON public.deliveries(status);
CREATE INDEX IF NOT EXISTS idx_delivery_notifications_flat ON public.delivery_notifications(flat_id);

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.parking_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_notifications ENABLE ROW LEVEL SECURITY;

-- Parking spaces are viewable by all authenticated users
CREATE POLICY "Allow authenticated read on parking spaces"
  ON public.parking_spaces FOR SELECT
  TO authenticated
  USING (true);

-- Parking spaces can only be managed by Committee or Super Admin
CREATE POLICY "Committee can manage parking spaces"
  ON public.parking_spaces FOR ALL
  TO authenticated
  USING (public.has_role('COMMITTEE'));

-- Guards and Committee can manage parking allocations
CREATE POLICY "Guards can manage parking allocations"
  ON public.parking_allocations FOR ALL
  TO authenticated
  USING (public.has_role('GUARD') OR public.has_role('COMMITTEE'));

-- Residents can view parking allocations associated with their visits
CREATE POLICY "Residents can view allocations for own flat"
  ON public.parking_allocations FOR SELECT
  TO authenticated
  USING (flat_id IS NOT NULL AND public.has_flat_access(flat_id));

-- Guards and Committee can manage deliveries
CREATE POLICY "Guards can manage deliveries"
  ON public.deliveries FOR ALL
  TO authenticated
  USING (public.has_role('GUARD') OR public.has_role('COMMITTEE'));

-- Residents can view deliveries for their own flat
CREATE POLICY "Residents can view deliveries for own flat"
  ON public.deliveries FOR SELECT
  TO authenticated
  USING (public.has_flat_access(flat_id));

-- Residents can view notifications for their own flat
CREATE POLICY "Residents can view notifications for own flat"
  ON public.delivery_notifications FOR SELECT
  TO authenticated
  USING (public.has_flat_access(flat_id));
