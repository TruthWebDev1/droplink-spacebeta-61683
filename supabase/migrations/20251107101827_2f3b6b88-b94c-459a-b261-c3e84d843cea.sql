-- Create trigger to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, business_name, subscription_plan)
  VALUES (
    NEW.id, 
    LOWER(SPLIT_PART(NEW.email, '@', 1)) || '-' || SUBSTRING(NEW.id::text, 1, 8),
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    'free'
  );
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();