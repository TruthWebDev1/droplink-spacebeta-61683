-- Add subscription tracking to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free', 'premium', 'pro')),
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_period TEXT CHECK (subscription_period IN ('monthly', 'yearly'));

-- Create subscription transactions table to track payments
CREATE TABLE IF NOT EXISTS public.subscription_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('premium', 'pro')),
  period TEXT NOT NULL CHECK (period IN ('monthly', 'yearly')),
  pi_amount NUMERIC NOT NULL,
  pi_payment_id TEXT NOT NULL,
  pi_txid TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Enable RLS on subscription_transactions
ALTER TABLE public.subscription_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription transactions
CREATE POLICY "Users can view their own subscription transactions"
ON public.subscription_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = subscription_transactions.profile_id
    AND profiles.user_id = auth.uid()
  )
);

-- Anyone can insert subscription transactions (edge function will handle this)
CREATE POLICY "System can insert subscription transactions"
ON public.subscription_transactions
FOR INSERT
WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscription_transactions_profile_id ON public.subscription_transactions(profile_id);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_expires ON public.profiles(subscription_expires_at);