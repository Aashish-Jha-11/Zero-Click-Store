-- DukaanPilot — auth fixes. Run this in the Supabase SQL Editor.
-- Safe to re-run.

-- 1. profiles had SELECT + UPDATE policies but no INSERT policy, so first-login
--    profile creation was silently rejected by RLS.
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Belt and braces: create the profile automatically on signup, so the app
--    never depends on a client-side insert succeeding.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Backfill profiles for anyone who already signed in before this ran.
INSERT INTO public.profiles (id, email, name, avatar_url)
SELECT
  u.id,
  COALESCE(u.email, ''),
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
  u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- 4. The demo store has owner_id = NULL, so RLS hides every product from a
--    logged-in shopkeeper. Claim it for the first real user.
UPDATE stores
SET owner_id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)
WHERE owner_id IS NULL;

-- 5. Verify
SELECT 'profiles' AS table_name, count(*) FROM profiles
UNION ALL SELECT 'auth.users', count(*) FROM auth.users
UNION ALL SELECT 'stores w/ owner', count(*) FROM stores WHERE owner_id IS NOT NULL;
