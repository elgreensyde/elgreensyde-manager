-- Fix financial_ledger RLS blocking POS inserts
ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access" ON public.financial_ledger;
CREATE POLICY "Allow all access"
ON public.financial_ledger
FOR ALL
USING (true)
WITH CHECK (true);
