
-- Migration: 20251102211700

-- Migration: 20251102193505

-- Migration: 20251102181943

-- Migration: 20251030083704
-- Create profiles table for storing user store data
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  business_name text NOT NULL,
  description text,
  logo text,
  social_links jsonb DEFAULT '[]'::jsonb,
  theme_settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  price text NOT NULL,
  description text,
  image text,
  file_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Profiles policies: Anyone can view, only owner can modify
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Products policies: Anyone can view, only profile owner can modify
CREATE POLICY "Products are viewable by everyone"
  ON public.products FOR SELECT
  USING (true);

CREATE POLICY "Users can insert products for their profile"
  ON public.products FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = products.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own products"
  ON public.products FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = products.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own products"
  ON public.products FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = products.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create index on username for fast lookups
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_products_profile_id ON public.products(profile_id);

-- Migration: 20251030083725
-- Fix search_path security warning for handle_updated_at function
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate triggers
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Migration: 20251101090829
-- Create analytics table for tracking views and clicks
CREATE TABLE public.analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'social_click', 'product_click')),
  event_data JSONB DEFAULT '{}'::jsonb,
  visitor_ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can insert analytics"
ON public.analytics
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Profile owners can view their analytics"
ON public.analytics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = analytics.profile_id
    AND profiles.user_id = auth.uid()
  )
);

-- Create index for better query performance
CREATE INDEX idx_analytics_profile_id ON public.analytics(profile_id);
CREATE INDEX idx_analytics_created_at ON public.analytics(created_at DESC);
CREATE INDEX idx_analytics_event_type ON public.analytics(event_type);

-- Migration: 20251102065738
-- Add support for custom links, button styles, and subscription plans
-- Update profiles table to add has_premium field
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_premium BOOLEAN DEFAULT FALSE;

-- Add comment to explain the field
COMMENT ON COLUMN profiles.has_premium IS 'Whether user has premium subscription to hide Droplink branding';


-- Migration: 20251102183158
-- Add youtube_video_url column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN youtube_video_url text;

-- Migration: 20251102184331
-- Add location tracking to analytics
ALTER TABLE analytics ADD COLUMN IF NOT EXISTS location_country TEXT;
ALTER TABLE analytics ADD COLUMN IF NOT EXISTS location_city TEXT;

-- Add wallet addresses for donations to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS crypto_wallets JSONB DEFAULT '{}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_details JSONB DEFAULT '{}'::jsonb;

-- Migration: 20251102191043
-- Add columns for share button toggle and subscription status
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS show_share_button BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS has_premium BOOLEAN DEFAULT false;

-- Migration: 20251102192451
-- Create followers table
CREATE TABLE public.followers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_profile_id, following_profile_id)
);

-- Enable RLS
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view followers"
ON public.followers
FOR SELECT
USING (true);

CREATE POLICY "Users can follow profiles"
ON public.followers
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = follower_profile_id
    AND profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Users can unfollow"
ON public.followers
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = follower_profile_id
    AND profiles.user_id = auth.uid()
  )
);

-- Create index for better performance
CREATE INDEX idx_followers_follower ON public.followers(follower_profile_id);
CREATE INDEX idx_followers_following ON public.followers(following_profile_id);


-- Migration: 20251102194529
-- Create user_wallets table to store DropToken balances
CREATE TABLE IF NOT EXISTS public.user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  drop_tokens BIGINT NOT NULL DEFAULT 0 CHECK (drop_tokens >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id)
);

-- Enable RLS
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_wallets
CREATE POLICY "Users can view their own wallet"
  ON public.user_wallets
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = user_wallets.profile_id
    AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own wallet"
  ON public.user_wallets
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = user_wallets.profile_id
    AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own wallet"
  ON public.user_wallets
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = user_wallets.profile_id
    AND profiles.user_id = auth.uid()
  ));

-- Create gifts table with predefined gift types
CREATE TABLE IF NOT EXISTS public.gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  drop_token_cost INTEGER NOT NULL CHECK (drop_token_cost > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

-- Anyone can view available gifts
CREATE POLICY "Gifts are viewable by everyone"
  ON public.gifts
  FOR SELECT
  USING (true);

-- Insert default gifts
INSERT INTO public.gifts (name, icon, drop_token_cost) VALUES
  ('Heart', '❤️', 10),
  ('Star', '⭐', 20),
  ('Rose', '🌹', 50),
  ('Diamond', '💎', 100),
  ('Crown', '👑', 200),
  ('Fire', '🔥', 30);

-- Create gift_transactions table
CREATE TABLE IF NOT EXISTS public.gift_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gift_id UUID NOT NULL REFERENCES public.gifts(id) ON DELETE CASCADE,
  drop_tokens_spent INTEGER NOT NULL CHECK (drop_tokens_spent > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CHECK (sender_profile_id != receiver_profile_id)
);

-- Enable RLS
ALTER TABLE public.gift_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view gifts they sent or received
CREATE POLICY "Users can view their gift transactions"
  ON public.gift_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = gift_transactions.sender_profile_id
      AND profiles.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = gift_transactions.receiver_profile_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Users can insert gift transactions
CREATE POLICY "Users can send gifts"
  ON public.gift_transactions
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = gift_transactions.sender_profile_id
    AND profiles.user_id = auth.uid()
  ));

-- Add trigger for updated_at on user_wallets
CREATE TRIGGER update_user_wallets_updated_at
  BEFORE UPDATE ON public.user_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to automatically create wallet when profile is created
CREATE OR REPLACE FUNCTION public.handle_new_profile_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_wallets (profile_id, drop_tokens)
  VALUES (NEW.id, 0);
  RETURN NEW;
END;
$$;

-- Trigger to create wallet on profile creation
CREATE TRIGGER on_profile_created_wallet
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile_wallet();

-- Migration: 20251102202027
-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create table for AI configuration
CREATE TABLE IF NOT EXISTS public.ai_support_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false,
  business_info TEXT,
  faqs TEXT,
  custom_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id)
);

-- Enable RLS
ALTER TABLE public.ai_support_config ENABLE ROW LEVEL SECURITY;

-- Policies for ai_support_config
CREATE POLICY "Users can view their own AI config"
  ON public.ai_support_config FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id));

CREATE POLICY "Users can insert their own AI config"
  ON public.ai_support_config FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id));

CREATE POLICY "Users can update their own AI config"
  ON public.ai_support_config FOR UPDATE
  USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id));

-- Create table for chat messages
CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies for chat messages
CREATE POLICY "Anyone can view AI chat messages"
  ON public.ai_chat_messages FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert chat messages"
  ON public.ai_chat_messages FOR INSERT
  WITH CHECK (true);

-- Create updated_at trigger for ai_support_config
CREATE TRIGGER update_ai_support_config_updated_at
  BEFORE UPDATE ON public.ai_support_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- Migration: 20251102212132
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow users to view their own role
CREATE POLICY "Users can view own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Update analytics policies to allow admin access
CREATE POLICY "Admins can view all analytics"
ON public.analytics
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update gift_transactions policies for admin access
CREATE POLICY "Admins can view all gift transactions"
ON public.gift_transactions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update user_wallets policies for admin access
CREATE POLICY "Admins can view all wallets"
ON public.user_wallets
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Migration: 20251102212146
-- Fix search_path for existing functions
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_profile_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.user_wallets (profile_id, drop_tokens)
  VALUES (NEW.id, 0);
  RETURN NEW;
END;
$function$;
