-- Hemratan Apartment Manager: Migration 007 - Financial Accounting, Maintenance Billing & Online Payments
-- Normalized Schema: billing_configurations, billing_periods, billing_batches, invoices, invoice_line_items,
-- invoice_adjustments, payments, payment_provider_orders, payment_webhook_events, payment_receipts,
-- expenses, expense_attachments, expense_approvals, billing_disputes, financial_audit_logs
-- ALL MONETARY VALUES ARE STORED IN INTEGER PAISE (1 INR = 100 PAISE) TO PREVENT FLOATING-POINT ERRORS.

-- 1. BILLING CONFIGURATIONS
CREATE TABLE IF NOT EXISTS public.billing_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID REFERENCES public.buildings(id),
    billing_model VARCHAR(30) NOT NULL DEFAULT 'HYBRID'
        CHECK (billing_model IN ('FIXED', 'AREA_BASED', 'HYBRID')),
    frequency VARCHAR(30) NOT NULL DEFAULT 'MONTHLY'
        CHECK (frequency IN ('MONTHLY', 'QUARTERLY', 'ANNUALLY')),
    fixed_charge_paise BIGINT NOT NULL DEFAULT 200000 CHECK (fixed_charge_paise >= 0), -- ₹2,000.00
    rate_per_sq_ft_paise BIGINT NOT NULL DEFAULT 350 CHECK (rate_per_sq_ft_paise >= 0), -- ₹3.50 / sq ft
    late_fee_percentage NUMERIC(5,2) NOT NULL DEFAULT 2.00 CHECK (late_fee_percentage >= 0),
    grace_period_days INT NOT NULL DEFAULT 10 CHECK (grace_period_days >= 0),
    gst_handling VARCHAR(30) NOT NULL DEFAULT 'MANUAL'
        CHECK (gst_handling IN ('NOT_APPLICABLE', 'MANUAL', 'AUTOMATIC')),
    gst_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (gst_percentage >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2. BILLING PERIODS
CREATE TABLE IF NOT EXISTS public.billing_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    financial_year VARCHAR(10) NOT NULL, -- e.g. '2026-2027'
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INT NOT NULL CHECK (year >= 2025),
    billing_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'LOCKED', 'CLOSED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(year, month)
);

-- 3. BILLING BATCHES
CREATE TABLE IF NOT EXISTS public.billing_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    billing_period_id UUID NOT NULL REFERENCES public.billing_periods(id) ON DELETE RESTRICT,
    batch_number VARCHAR(50) NOT NULL UNIQUE,
    total_flats INT NOT NULL DEFAULT 0 CHECK (total_flats >= 0),
    total_amount_paise BIGINT NOT NULL DEFAULT 0 CHECK (total_amount_paise >= 0),
    total_collected_paise BIGINT NOT NULL DEFAULT 0 CHECK (total_collected_paise >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'GENERATED'
        CHECK (status IN ('GENERATED', 'APPROVED', 'DISPATCHED', 'CANCELLED')),
    generated_by_profile_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 4. INVOICES (Immutable historical snapshots of flat maintenance calculation)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    batch_id UUID REFERENCES public.billing_batches(id) ON DELETE SET NULL,
    flat_id UUID NOT NULL REFERENCES public.flats(id) ON DELETE RESTRICT,
    billing_period_id UUID NOT NULL REFERENCES public.billing_periods(id) ON DELETE RESTRICT,
    flat_area_sq_ft NUMERIC(8,2) NOT NULL CHECK (flat_area_sq_ft > 0),
    base_fixed_paise BIGINT NOT NULL DEFAULT 0 CHECK (base_fixed_paise >= 0),
    base_area_charge_paise BIGINT NOT NULL DEFAULT 0 CHECK (base_area_charge_paise >= 0),
    additional_charges_paise BIGINT NOT NULL DEFAULT 0 CHECK (additional_charges_paise >= 0),
    adjustments_paise BIGINT NOT NULL DEFAULT 0,
    late_fee_paise BIGINT NOT NULL DEFAULT 0 CHECK (late_fee_paise >= 0),
    gst_rate_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (gst_rate_percentage >= 0),
    gst_amount_paise BIGINT NOT NULL DEFAULT 0 CHECK (gst_amount_paise >= 0),
    discount_credits_paise BIGINT NOT NULL DEFAULT 0 CHECK (discount_credits_paise >= 0),
    total_amount_paise BIGINT NOT NULL CHECK (total_amount_paise >= 0),
    paid_amount_paise BIGINT NOT NULL DEFAULT 0 CHECK (paid_amount_paise >= 0),
    outstanding_balance_paise BIGINT NOT NULL CHECK (outstanding_balance_paise >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'GENERATED'
        CHECK (status IN ('DRAFT', 'GENERATED', 'APPROVED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED')),
    due_date DATE NOT NULL,
    calculation_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(flat_id, billing_period_id)
);

-- 5. INVOICE LINE ITEMS (Itemized breakdown)
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    description VARCHAR(200) NOT NULL,
    amount_paise BIGINT NOT NULL CHECK (amount_paise >= 0),
    category VARCHAR(50) NOT NULL
        CHECK (category IN ('FIXED', 'AREA_BASED', 'WATER', 'ELECTRICITY', 'PARKING', 'LIFT', 'SINKING_FUND', 'REPAIR_FUND', 'AMENITY', 'CUSTOM')),
    tax_applicable BOOLEAN NOT NULL DEFAULT false,
    sort_order INT NOT NULL DEFAULT 0
);

-- 6. INVOICE ADJUSTMENTS (Credits, waivers, penalties)
CREATE TABLE IF NOT EXISTS public.invoice_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    adjustment_type VARCHAR(30) NOT NULL
        CHECK (adjustment_type IN ('CREDIT', 'DEBIT', 'WAIVER', 'PENALTY')),
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    reason TEXT NOT NULL,
    approved_by_profile_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 7. PAYMENTS (Immutable transaction ledger)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_reference_no VARCHAR(50) NOT NULL UNIQUE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
    flat_id UUID NOT NULL REFERENCES public.flats(id) ON DELETE RESTRICT,
    payer_profile_id UUID REFERENCES public.profiles(id),
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    payment_method VARCHAR(30) NOT NULL
        CHECK (payment_method IN ('ONLINE_GATEWAY', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CASH', 'OTHER')),
    payment_channel VARCHAR(50),
    provider_order_id VARCHAR(100),
    provider_payment_id VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'INITIATED'
        CHECK (status IN ('INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED')),
    transaction_timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    verified_by_profile_id UUID REFERENCES public.profiles(id),
    verified_at TIMESTAMPTZ,
    idempotency_key VARCHAR(100) UNIQUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 8. PAYMENT PROVIDER ORDERS
CREATE TABLE IF NOT EXISTS public.payment_provider_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('RAZORPAY', 'CASHFREE', 'MOCK')),
    order_id VARCHAR(100) NOT NULL UNIQUE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status VARCHAR(30) NOT NULL DEFAULT 'CREATED',
    raw_response JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 9. PAYMENT WEBHOOK EVENTS (Replay-protected audit log)
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(50) NOT NULL,
    event_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    signature VARCHAR(255),
    status VARCHAR(30) NOT NULL DEFAULT 'RECEIVED'
        CHECK (status IN ('RECEIVED', 'PROCESSED', 'FAILED', 'REPLAY_IGNORED')),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(provider, event_id)
);

-- 10. PAYMENT RECEIPTS
CREATE TABLE IF NOT EXISTS public.payment_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
    flat_id UUID NOT NULL REFERENCES public.flats(id) ON DELETE RESTRICT,
    amount_received_paise BIGINT NOT NULL CHECK (amount_received_paise > 0),
    remaining_balance_paise BIGINT NOT NULL CHECK (remaining_balance_paise >= 0),
    receipt_pdf_path TEXT,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 11. SOCIETY EXPENSES
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_number VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL
        CHECK (category IN (
            'SECURITY', 'HOUSEKEEPING', 'ELECTRICITY', 'WATER', 'LIFT_MAINTENANCE',
            'REPAIRS', 'PLUMBING', 'ELECTRICAL', 'GARDENING', 'STAFF_SALARIES',
            'INSURANCE', 'ADMINISTRATIVE', 'EVENTS', 'OTHER'
        )),
    vendor_name VARCHAR(150) NOT NULL,
    description TEXT,
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    expense_date DATE NOT NULL,
    invoice_reference VARCHAR(100),
    payment_method VARCHAR(30) NOT NULL DEFAULT 'BANK_TRANSFER'
        CHECK (payment_method IN ('BANK_TRANSFER', 'UPI', 'CHEQUE', 'CASH', 'OTHER')),
    status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED'
        CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID')),
    entered_by_profile_id UUID NOT NULL REFERENCES public.profiles(id),
    approved_by_profile_id UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    attachment_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 12. EXPENSE ATTACHMENTS
CREATE TABLE IF NOT EXISTS public.expense_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
    mime_type VARCHAR(100) NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 13. EXPENSE APPROVALS
CREATE TABLE IF NOT EXISTS public.expense_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
    approver_profile_id UUID NOT NULL REFERENCES public.profiles(id),
    decision VARCHAR(30) NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED')),
    comments TEXT,
    decided_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 14. BILLING DISPUTES & CLARIFICATIONS
CREATE TABLE IF NOT EXISTS public.billing_disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispute_reference VARCHAR(50) NOT NULL UNIQUE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    flat_id UUID NOT NULL REFERENCES public.flats(id) ON DELETE CASCADE,
    complainant_profile_id UUID NOT NULL REFERENCES public.profiles(id),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED')),
    resolution_notes TEXT,
    resolved_by_profile_id UUID REFERENCES public.profiles(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 15. FINANCIAL AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.financial_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    actor_profile_id UUID REFERENCES public.profiles(id),
    actor_role VARCHAR(50),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- INDEXES FOR PERFORMANCE & AUDITING
CREATE INDEX IF NOT EXISTS idx_invoices_flat_period ON public.invoices(flat_id, billing_period_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments(payment_reference_no);
CREATE INDEX IF NOT EXISTS idx_expenses_category_date ON public.expenses(category, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(status);
CREATE INDEX IF NOT EXISTS idx_receipts_payment ON public.payment_receipts(payment_id);
CREATE INDEX IF NOT EXISTS idx_receipts_invoice ON public.payment_receipts(invoice_id);

-- ENABLE ROW-LEVEL SECURITY ON ALL 15 FINANCIAL TABLES
ALTER TABLE public.billing_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_provider_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- Super Admin & Committee have full management access on financial tables
CREATE POLICY "Committee & Super Admin full billing access"
    ON public.billing_configurations FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('SUPER_ADMIN', 'COMMITTEE')
        )
    );

CREATE POLICY "Committee & Super Admin view and manage billing periods"
    ON public.billing_periods FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('SUPER_ADMIN', 'COMMITTEE')
        )
    );

CREATE POLICY "Residents view own flat invoices only"
    ON public.invoices FOR SELECT TO authenticated
    USING (
        flat_id IN (
            SELECT flat_id FROM public.user_flat_memberships
            WHERE user_id = auth.uid() AND is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('SUPER_ADMIN', 'COMMITTEE')
        )
    );

CREATE POLICY "Residents view own flat invoice line items"
    ON public.invoice_line_items FOR SELECT TO authenticated
    USING (
        invoice_id IN (
            SELECT id FROM public.invoices
            WHERE flat_id IN (
                SELECT flat_id FROM public.user_flat_memberships
                WHERE user_id = auth.uid() AND is_active = true
            )
        )
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('SUPER_ADMIN', 'COMMITTEE')
        )
    );

CREATE POLICY "Residents view own flat payments"
    ON public.payments FOR SELECT TO authenticated
    USING (
        flat_id IN (
            SELECT flat_id FROM public.user_flat_memberships
            WHERE user_id = auth.uid() AND is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('SUPER_ADMIN', 'COMMITTEE')
        )
    );

CREATE POLICY "Residents view own flat receipts"
    ON public.payment_receipts FOR SELECT TO authenticated
    USING (
        flat_id IN (
            SELECT flat_id FROM public.user_flat_memberships
            WHERE user_id = auth.uid() AND is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('SUPER_ADMIN', 'COMMITTEE')
        )
    );

CREATE POLICY "Residents manage own billing disputes"
    ON public.billing_disputes FOR ALL TO authenticated
    USING (
        flat_id IN (
            SELECT flat_id FROM public.user_flat_memberships
            WHERE user_id = auth.uid() AND is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('SUPER_ADMIN', 'COMMITTEE')
        )
    );

CREATE POLICY "Committee & Super Admin full expense access"
    ON public.expenses FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('SUPER_ADMIN', 'COMMITTEE')
        )
    );
