-- Add transaction_date column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN transaction_date DATE;

-- Create index for better query performance
CREATE INDEX idx_transactions_transaction_date ON public.transactions(transaction_date);

-- Update existing transactions to use cycle as transaction_date where possible
-- This will attempt to parse cycle field as a date
UPDATE public.transactions
SET transaction_date = CASE
  WHEN cycle ~ '^\d{1,2}/\d{1,2}/\d{4}$' THEN TO_DATE(cycle, 'MM/DD/YYYY')
  WHEN cycle ~ '^\d{4}-\d{2}-\d{2}$' THEN TO_DATE(cycle, 'YYYY-MM-DD')
  ELSE NULL
END
WHERE transaction_date IS NULL AND cycle IS NOT NULL;