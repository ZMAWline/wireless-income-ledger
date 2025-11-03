-- Create lines table to store phone line information
CREATE TABLE public.lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mdn TEXT NOT NULL,
  customer TEXT,
  provider TEXT,
  status TEXT DEFAULT 'ACTIVE',
  product_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.lines ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own lines" 
ON public.lines 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lines" 
ON public.lines 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lines" 
ON public.lines 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lines" 
ON public.lines 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create transactions table to store commission transactions
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  line_id UUID REFERENCES public.lines(id) ON DELETE CASCADE,
  mdn TEXT NOT NULL,
  customer TEXT,
  provider TEXT,
  activity_type TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  cycle TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own transactions" 
ON public.transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions" 
ON public.transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" 
ON public.transactions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions" 
ON public.transactions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates on lines
CREATE TRIGGER update_lines_updated_at
BEFORE UPDATE ON public.lines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();