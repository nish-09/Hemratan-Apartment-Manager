-- Hemratan Apartment Manager: Migration 001 - Core Identity & Flat Hierarchy
-- Schema: Buildings, Wings, Flats, Roles, Permissions, User Memberships

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BUILDINGS
CREATE TABLE IF NOT EXISTS public.buildings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    total_floors INTEGER NOT NULL CHECK (total_floors > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2. WINGS
CREATE TABLE IF NOT EXISTS public.wings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_building_wing UNIQUE (building_id, name)
);

-- 3. FLATS
CREATE TABLE IF NOT EXISTS public.flats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wing_id UUID NOT NULL REFERENCES public.wings(id) ON DELETE CASCADE,
    flat_number VARCHAR(20) NOT NULL,
    floor_number INTEGER NOT NULL CHECK (floor_number >= 0),
    super_built_up_area_sqft NUMERIC(10, 2) NOT NULL CHECK (super_built_up_area_sqft > 0),
    carpet_area_sqft NUMERIC(10, 2) CHECK (carpet_area_sqft > 0),
    intercom_number VARCHAR(20),
    is_occupied BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_wing_flat UNIQUE (wing_id, flat_number)
);

-- 4. ROLES & PERMISSIONS
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE, -- 'SUPER_ADMIN', 'COMMITTEE', 'GUARD', 'RESIDENT'
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 5. USER PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY, -- Maps to Supabase auth.users.id
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20),
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 6. USER ROLES
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    assigned_by UUID REFERENCES public.profiles(id),
    PRIMARY KEY (user_id, role_id)
);

-- 7. USER FLAT MEMBERSHIPS (Multi-flat support)
CREATE TABLE IF NOT EXISTS public.user_flat_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    flat_id UUID NOT NULL REFERENCES public.flats(id) ON DELETE CASCADE,
    membership_type VARCHAR(30) NOT NULL CHECK (membership_type IN ('OWNER_RESIDING', 'OWNER_NON_RESIDING', 'TENANT', 'FAMILY_MEMBER')),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_user_flat UNIQUE (user_id, flat_id)
);

-- 8. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_flats_wing_id ON public.flats(wing_id);
CREATE INDEX IF NOT EXISTS idx_flats_flat_number ON public.flats(flat_number);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.user_flat_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_flat_id ON public.user_flat_memberships(flat_id);

-- 9. INITIAL SYSTEM ROLES SEED
INSERT INTO public.roles (name, description) VALUES
    ('SUPER_ADMIN', 'Platform Administrator with system-wide configuration control'),
    ('COMMITTEE', 'Managing Committee Member with operations, approvals & financial management'),
    ('GUARD', 'Gate Security Guard with visitor verification, delivery & staff log access'),
    ('RESIDENT', 'Flat Resident with dues, visitors, complaints and community services')
ON CONFLICT (name) DO NOTHING;
