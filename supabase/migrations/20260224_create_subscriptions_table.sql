-- Create subscriptions table for GoCardless integration
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- GoCardless IDs
  gocardless_subscription_id TEXT NOT NULL UNIQUE,
  gocardless_customer_id TEXT NOT NULL,
  gocardless_mandate_id TEXT NOT NULL,

  -- Subscription details
  plan TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'active',
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  interval TEXT NOT NULL CHECK (interval IN ('monthly', 'yearly')),

  -- Dates
  start_date TIMESTAMPTZ NOT NULL,
  next_payment_date TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_user_subscription UNIQUE (user_id)
);

-- Enable Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own subscriptions
CREATE POLICY "Users can read their own subscriptions"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can do anything (for edge functions)
CREATE POLICY "Service role has full access"
  ON public.subscriptions
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_gocardless_subscription_id ON public.subscriptions(gocardless_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscriptions_updated_at();

-- Comment on table
COMMENT ON TABLE public.subscriptions IS 'GoCardless subscription data for users';
