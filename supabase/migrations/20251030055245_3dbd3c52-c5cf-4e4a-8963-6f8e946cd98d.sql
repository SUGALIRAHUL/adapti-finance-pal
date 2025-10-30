-- Create mfa_secrets table for storing encrypted MFA TOTP secrets
CREATE TABLE IF NOT EXISTS public.mfa_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  secret TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.mfa_secrets ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can only manage their own MFA settings
CREATE POLICY "Users can manage own MFA settings"
ON public.mfa_secrets
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add trigger for automatic updated_at timestamp
CREATE TRIGGER set_mfa_secrets_updated_at
BEFORE UPDATE ON public.mfa_secrets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_mfa_secrets_user_id ON public.mfa_secrets(user_id);