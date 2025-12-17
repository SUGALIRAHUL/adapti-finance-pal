-- Create table for OTP verification
CREATE TABLE public.email_otp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'login', -- 'login' or 'signup'
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_otp ENABLE ROW LEVEL SECURITY;

-- Policy to allow inserting OTP (public for signup/login verification)
CREATE POLICY "Anyone can create OTP for verification"
ON public.email_otp
FOR INSERT
WITH CHECK (true);

-- Policy to allow selecting and updating OTP during verification
CREATE POLICY "Anyone can verify OTP"
ON public.email_otp
FOR SELECT
USING (true);

CREATE POLICY "Anyone can update OTP verification"
ON public.email_otp
FOR UPDATE
USING (true);

-- Clean up expired OTPs automatically (optional: can be done via cron)
CREATE POLICY "Anyone can delete expired OTPs"
ON public.email_otp
FOR DELETE
USING (expires_at < now());