-- Update RLS policies to require email verification for sensitive financial tables
-- This prevents anonymous/unverified users from accessing financial data

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can manage own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can manage own investments" ON public.investments;
DROP POLICY IF EXISTS "Users can manage own savings goals" ON public.savings_goals;
DROP POLICY IF EXISTS "Users can manage own MFA" ON public.mfa_secrets;

-- Budgets: Require verified email
CREATE POLICY "Users can manage own budgets"
ON public.budgets FOR ALL
USING (
  auth.uid() = user_id 
  AND (auth.jwt()->>'email_verified')::boolean = true
)
WITH CHECK (
  auth.uid() = user_id 
  AND (auth.jwt()->>'email_verified')::boolean = true
);

-- Expenses: Require verified email
CREATE POLICY "Users can manage own expenses"
ON public.expenses FOR ALL
USING (
  auth.uid() = user_id 
  AND (auth.jwt()->>'email_verified')::boolean = true
)
WITH CHECK (
  auth.uid() = user_id 
  AND (auth.jwt()->>'email_verified')::boolean = true
);

-- Investments: Require verified email
CREATE POLICY "Users can manage own investments"
ON public.investments FOR ALL
USING (
  auth.uid() = user_id 
  AND (auth.jwt()->>'email_verified')::boolean = true
)
WITH CHECK (
  auth.uid() = user_id 
  AND (auth.jwt()->>'email_verified')::boolean = true
);

-- Savings Goals: Require verified email
CREATE POLICY "Users can manage own savings goals"
ON public.savings_goals FOR ALL
USING (
  auth.uid() = user_id 
  AND (auth.jwt()->>'email_verified')::boolean = true
)
WITH CHECK (
  auth.uid() = user_id 
  AND (auth.jwt()->>'email_verified')::boolean = true
);

-- MFA Secrets: Require verified email
CREATE POLICY "Users can manage own MFA"
ON public.mfa_secrets FOR ALL
USING (
  auth.uid() = user_id 
  AND (auth.jwt()->>'email_verified')::boolean = true
)
WITH CHECK (
  auth.uid() = user_id 
  AND (auth.jwt()->>'email_verified')::boolean = true
);