-- Add DELETE policy to profiles table to make security posture explicit
CREATE POLICY "Users cannot delete profiles"
  ON public.profiles FOR DELETE
  USING (false);

-- Profile deletion should only happen through administrative processes
-- This policy explicitly denies all profile deletions via the API