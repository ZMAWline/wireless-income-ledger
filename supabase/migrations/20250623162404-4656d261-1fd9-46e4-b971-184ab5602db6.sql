
-- Create enum for transaction types
CREATE TYPE transaction_type AS ENUM ('ACT', 'RESIDUAL', 'DEACT');

-- Create enum for line status
CREATE TYPE line_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- Create lines table to store service numbers and customer info
CREATE TABLE public.lines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mdn TEXT NOT NULL UNIQUE, -- Service number (phone number)
  customer_name TEXT NOT NULL,
  plan TEXT,
  status line_status DEFAULT 'ACTIVE',
  activation_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create transactions table to store commission data
CREATE TABLE public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  line_id UUID REFERENCES public.lines(id) ON DELETE CASCADE NOT NULL,
  transaction_date DATE NOT NULL,
  activity_type transaction_type NOT NULL,
  product_category TEXT,
  amount DECIMAL(10,2) NOT NULL, -- Partner compensation amount
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_lines_mdn ON public.lines(mdn);
CREATE INDEX idx_lines_customer_name ON public.lines(customer_name);
CREATE INDEX idx_transactions_line_id ON public.transactions(line_id);
CREATE INDEX idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX idx_transactions_type ON public.transactions(activity_type);

-- Enable Row Level Security (RLS)
ALTER TABLE public.lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access only
-- Note: For now, making these permissive - will implement proper auth later
CREATE POLICY "Allow all operations on lines" ON public.lines
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on transactions" ON public.transactions
  FOR ALL USING (true) WITH CHECK (true);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_lines_updated_at 
  BEFORE UPDATE ON public.lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
