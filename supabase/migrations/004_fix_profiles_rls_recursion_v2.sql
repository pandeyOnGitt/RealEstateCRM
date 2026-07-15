-- Fix profiles RLS infinite recursion (root cause: policies querying profiles from profiles)

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

-- Remove recursive ALL policy (EXISTS subquery on profiles caused infinite recursion)
DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view org profiles" ON profiles;

-- SELECT: own row or same org (get_user_org_id bypasses RLS)
CREATE POLICY "Users can view org profiles" ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR organization_id = public.get_user_org_id()
  );

-- UPDATE own profile
-- (Users can update own profile already exists)

-- Admin/manager can update org profiles (no subquery on profiles)
CREATE POLICY "Managers can update org profiles" ON profiles
  FOR UPDATE USING (
    organization_id = public.get_user_org_id()
    AND public.get_user_role() IN ('admin', 'sales_manager')
  );

CREATE POLICY "Managers can delete org profiles" ON profiles
  FOR DELETE USING (
    organization_id = public.get_user_org_id()
    AND public.get_user_role() IN ('admin', 'sales_manager')
  );

-- Fix organizations admin policy (also had recursive profiles subquery)
DROP POLICY IF EXISTS "Admins can update own organization" ON organizations;
CREATE POLICY "Admins can update own organization" ON organizations
  FOR UPDATE USING (
    id = public.get_user_org_id()
    AND public.get_user_role() = 'admin'
  );

-- Fix leads delete policy
DROP POLICY IF EXISTS "Admins can delete leads" ON leads;
CREATE POLICY "Admins can delete leads" ON leads
  FOR DELETE USING (
    organization_id = public.get_user_org_id()
    AND public.get_user_role() IN ('admin', 'sales_manager')
  );

-- Fix integration_settings policy
DROP POLICY IF EXISTS "Admins can manage integrations" ON integration_settings;
CREATE POLICY "Admins can manage integrations" ON integration_settings
  FOR ALL USING (
    organization_id = public.get_user_org_id()
    AND public.get_user_role() = 'admin'
  );

-- Fix team_invitations policy
DROP POLICY IF EXISTS "Admins can manage invitations" ON team_invitations;
CREATE POLICY "Admins can manage invitations" ON team_invitations
  FOR ALL USING (
    organization_id = public.get_user_org_id()
    AND public.get_user_role() = 'admin'
  );
