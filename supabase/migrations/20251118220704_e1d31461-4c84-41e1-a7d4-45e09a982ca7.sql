-- Add status column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN status TEXT;