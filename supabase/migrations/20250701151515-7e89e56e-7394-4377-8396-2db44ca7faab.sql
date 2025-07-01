
-- Add user_id columns to existing tables to associate data with users
ALTER TABLE public.lines ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Make user_id required for new records (existing records will need to be handled separately)
-- We'll set a default temporarily to avoid issues with existing data
ALTER TABLE public.lines ALTER COLUMN user_id SET DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE public.transactions ALTER COLUMN user_id SET DEFAULT '00000000-0000-0000-0000-000000000000';

-- Drop the overly permissive RLS policies
DROP POLICY IF EXISTS "Allow all operations on lines" ON public.lines;
DROP POLICY IF EXISTS "Allow all operations on transactions" ON public.transactions;

-- Create secure RLS policies that restrict access to authenticated users' own data
CREATE POLICY "Users can view their own lines" ON public.lines
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lines" ON public.lines
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lines" ON public.lines
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lines" ON public.lines
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" ON public.transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions" ON public.transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance on user_id lookups
CREATE INDEX idx_lines_user_id ON public.lines(user_id);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);

-- Create a profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update the updated_at trigger for profiles
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
