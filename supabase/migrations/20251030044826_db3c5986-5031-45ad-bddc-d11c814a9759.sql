-- Drop the mfa_secrets table since MFA feature is removed
DROP TABLE IF EXISTS public.mfa_secrets CASCADE;

-- Fix tutor_progress RLS policy to include WITH CHECK condition
DROP POLICY IF EXISTS "Users can manage own tutor progress" ON public.tutor_progress;

CREATE POLICY "Users can manage own tutor progress" 
ON public.tutor_progress 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);