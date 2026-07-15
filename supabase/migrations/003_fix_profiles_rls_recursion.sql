-- Fix infinite recursion: get_user_org_id() must bypass RLS when reading profiles

CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Drop conflicting / recursive profile policies
DROP POLICY IF EXISTS "Users can view org profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Single SELECT policy: own row OR same organization
CREATE POLICY "Users can view org profiles" ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR organization_id = public.get_user_org_id()
  );
