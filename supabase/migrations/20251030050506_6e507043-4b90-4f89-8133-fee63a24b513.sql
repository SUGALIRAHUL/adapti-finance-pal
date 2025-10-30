-- Add recovery_email column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS recovery_email TEXT;

-- Add check constraint for valid email format
ALTER TABLE public.profiles 
ADD CONSTRAINT recovery_email_format CHECK (recovery_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR recovery_email IS NULL);