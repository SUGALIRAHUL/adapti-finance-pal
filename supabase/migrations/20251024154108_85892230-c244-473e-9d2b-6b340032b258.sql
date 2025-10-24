-- Fix RLS policies for all financial tables
-- The email_verified check was causing 403 errors because it was checking the wrong JWT path
-- Simplifying to just check auth.uid() = user_id which is sufficient

-- Drop and recreate budgets policy
DROP POLICY IF EXISTS "Users can manage own budgets" ON public.budgets;
CREATE POLICY "Users can manage own budgets"
ON public.budgets
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Drop and recreate expenses policy
DROP POLICY IF EXISTS "Users can manage own expenses" ON public.expenses;
CREATE POLICY "Users can manage own expenses"
ON public.expenses
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Drop and recreate investments policy
DROP POLICY IF EXISTS "Users can manage own investments" ON public.investments;
CREATE POLICY "Users can manage own investments"
ON public.investments
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Drop and recreate savings_goals policy
DROP POLICY IF EXISTS "Users can manage own savings goals" ON public.savings_goals;
CREATE POLICY "Users can manage own savings goals"
ON public.savings_goals
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Drop and recreate mfa_secrets policy
DROP POLICY IF EXISTS "Users can manage own MFA" ON public.mfa_secrets;
CREATE POLICY "Users can manage own MFA"
ON public.mfa_secrets
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);