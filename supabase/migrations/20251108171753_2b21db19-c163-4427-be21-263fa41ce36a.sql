-- Create table for MFA secrets used by Authenticator App (TOTP)
CREATE TABLE IF NOT EXISTS public.mfa_secrets (
  user_id uuid PRIMARY KEY,
  secret text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS for security
ALTER TABLE public.mfa_secrets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own mfa secret" ON public.mfa_secrets;
DROP POLICY IF EXISTS "Users can insert their own mfa secret" ON public.mfa_secrets;
DROP POLICY IF EXISTS "Users can update their own mfa secret" ON public.mfa_secrets;
DROP POLICY IF EXISTS "Users can delete their own mfa secret" ON public.mfa_secrets;

-- Policies: users can manage only their own MFA secret
CREATE POLICY "Users can view their own mfa secret"
ON public.mfa_secrets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mfa secret"
ON public.mfa_secrets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mfa secret"
ON public.mfa_secrets FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mfa secret"
ON public.mfa_secrets FOR DELETE
USING (auth.uid() = user_id);

-- Trigger to keep updated_at fresh
DROP TRIGGER IF EXISTS update_mfa_secrets_updated_at ON public.mfa_secrets;
CREATE TRIGGER update_mfa_secrets_updated_at
BEFORE UPDATE ON public.mfa_secrets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();