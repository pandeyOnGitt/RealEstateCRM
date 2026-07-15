-- Allow users to read their own profile (fixes auth bootstrap / RLS chicken-and-egg)
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Allow users to insert their own profile during onboarding (service role still used for signup)
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());
