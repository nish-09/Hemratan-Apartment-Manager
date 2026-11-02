-- Hemratan Apartment Manager: Migration 002 - Row-Level Security (RLS) & Access Control
-- Strict enforcement of Role-Based and Flat-Level permissions at the database level

-- 1. SECURITY DEFINER HELPER FUNCTIONS WITH FIXED SEARCH_PATH
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT r.name
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_role(required_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
      AND (r.name = required_role OR r.name = 'SUPER_ADMIN')
  );
$$;

CREATE OR REPLACE FUNCTION public.has_flat_access(target_flat_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    -- Direct flat member
    SELECT 1
    FROM public.user_flat_memberships
    WHERE user_id = auth.uid()
      AND flat_id = target_flat_id
  ) OR public.has_role('COMMITTEE') OR public.has_role('SUPER_ADMIN');
$$;

-- Explicitly revoke public execution from untrusted roles
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_flat_access(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_flat_access(UUID) TO authenticated;

-- 2. ENABLE RLS ACROSS ALL CORE TABLES
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_flat_memberships ENABLE ROW LEVEL SECURITY;

-- 3. RLS POLICIES FOR BUILDINGS, WINGS & FLATS
CREATE POLICY "Allow authenticated read buildings"
  ON public.buildings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow committee/super_admin manage buildings"
  ON public.buildings FOR ALL
  TO authenticated
  USING (public.has_role('COMMITTEE'));

CREATE POLICY "Allow authenticated read wings"
  ON public.wings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow committee/super_admin manage wings"
  ON public.wings FOR ALL
  TO authenticated
  USING (public.has_role('COMMITTEE'));

CREATE POLICY "Allow authenticated read flats"
  ON public.flats FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow committee/super_admin manage flats"
  ON public.flats FOR ALL
  TO authenticated
  USING (public.has_role('COMMITTEE'));

-- 4. RLS POLICIES FOR USER PROFILES
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.has_role('COMMITTEE') OR public.has_role('GUARD'));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Super admin can manage profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.has_role('SUPER_ADMIN'));

-- 5. RLS POLICIES FOR USER ROLES
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role('SUPER_ADMIN') OR public.has_role('COMMITTEE'));

CREATE POLICY "Only super admin can assign roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role('SUPER_ADMIN'));

-- 6. RLS POLICIES FOR USER FLAT MEMBERSHIPS
-- Residents can only view their own flat memberships
CREATE POLICY "Residents can view own memberships"
  ON public.user_flat_memberships FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR public.has_role('COMMITTEE') 
    OR public.has_role('GUARD')
  );

-- Committee and Super Admin can verify & manage memberships
CREATE POLICY "Committee can manage memberships"
  ON public.user_flat_memberships FOR ALL
  TO authenticated
  USING (public.has_role('COMMITTEE'));

-- 7. RLS POLICIES FOR ROLES AND PERMISSIONS
CREATE POLICY "Allow authenticated read roles"
  ON public.roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read permissions"
  ON public.permissions FOR SELECT
  TO authenticated
  USING (true);
