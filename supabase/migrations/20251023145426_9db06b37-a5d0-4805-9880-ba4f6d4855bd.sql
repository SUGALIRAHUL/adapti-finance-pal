-- Add explicit DENY policies for write operations on user_roles table
-- This prevents privilege escalation attacks by ensuring roles can only be managed
-- through the handle_new_user() trigger or admin functions with SECURITY DEFINER

CREATE POLICY "No direct inserts on user_roles"
  ON public.user_roles 
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No direct updates on user_roles"
  ON public.user_roles 
  FOR UPDATE
  USING (false);

CREATE POLICY "No direct deletes on user_roles"
  ON public.user_roles 
  FOR DELETE
  USING (false);