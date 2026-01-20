# Supabase Setup Guide

This guide will help you create a new Supabase project and set up the database for the Wireless Income Ledger.

## Step 1: Create New Supabase Project

1. Go to **https://supabase.com/dashboard**
2. Click **"New Project"**
3. Fill in the details:
   - **Name**: `Wireless Income Ledger`
   - **Database Password**: Create a strong password (save it somewhere safe!)
   - **Region**: Choose closest to your location (e.g., US East, US West, Europe)
   - **Pricing Plan**: Free (sufficient for internal tools)
4. Click **"Create new project"**
5. Wait 2-3 minutes for the project to be ready

## Step 2: Get Your API Credentials

Once your project is ready:

1. Go to **Settings** → **API**
2. Copy these values (you'll need them later):
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: Long string starting with `eyJ...`

## Step 3: Run Database Migrations

Go to **SQL Editor** in the left sidebar and run each of these SQL scripts in order:

### Migration 1: Create Base Tables

```sql
-- Create lines table
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

-- Create policies for lines
CREATE POLICY "Users can view their own lines"
ON public.lines FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lines"
ON public.lines FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lines"
ON public.lines FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lines"
ON public.lines FOR DELETE USING (auth.uid() = user_id);

-- Create transactions table
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
  transaction_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for transactions
CREATE POLICY "Users can view their own transactions"
ON public.transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions"
ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
ON public.transactions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- Create function for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for lines table
CREATE TRIGGER update_lines_updated_at
BEFORE UPDATE ON public.lines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_lines_user_id ON public.lines(user_id);
CREATE INDEX idx_lines_mdn ON public.lines(mdn);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_line_id ON public.transactions(line_id);
CREATE INDEX idx_transactions_transaction_date ON public.transactions(transaction_date);
```

Click **"Run"** and wait for success message.

## Step 4: Configure Authentication

1. Go to **Authentication** → **Providers** in left sidebar
2. Make sure **Email** provider is enabled (it should be by default)
3. Go to **Authentication** → **URL Configuration**
4. Set these values:
   - **Site URL**: `http://localhost:8080` (for now, will update after deployment)
   - **Redirect URLs**: Add these (one per line):
     - `http://localhost:8080/**`
     - `http://localhost:8080`

## Step 5: Update Your .env File

1. Open `.env` file in your project root
2. Update with your new credentials:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

Replace:
- `YOUR_PROJECT_ID` with your actual project URL
- `YOUR_ANON_KEY_HERE` with your anon public key

## Step 6: Test Locally

1. Make sure you've updated the `.env` file
2. Run the install script:
   ```bash
   install.bat
   ```
3. Start the dev server:
   ```bash
   start.bat
   ```
4. Go to http://localhost:8080
5. Try signing up with a test account
6. Test uploading a CSV file

## Step 7: Deploy to Vercel

Once local testing works:

1. Update `.env` in your Vercel project with new credentials
2. Update Supabase redirect URLs to include your Vercel domain:
   - Go to **Authentication** → **URL Configuration**
   - Add: `https://your-app.vercel.app/**`
3. Redeploy your Vercel project

## Troubleshooting

### "relation does not exist" error
- Make sure you ran all the SQL migrations in order
- Refresh the SQL Editor page and try again

### "JWT expired" or authentication errors
- Double-check your API keys in `.env`
- Make sure you're using the `anon` key, not the `service_role` key

### Can't sign up
- Check Authentication → URL Configuration has correct URLs
- Verify email provider is enabled

### CSV upload fails
- Make sure you're logged in
- Check browser console for specific errors
- Verify the tables were created correctly

## Database Schema Summary

Your database has 2 main tables:

### `lines` table
- Stores phone line information
- Each line belongs to a user (`user_id`)
- Fields: mdn (phone number), customer, provider, status

### `transactions` table
- Stores commission transactions
- Each transaction belongs to a user (`user_id`)
- Links to a line (optional via `line_id`)
- Fields: activity_type, amount, cycle, note, transaction_date

### Security (Row Level Security)
- ✅ Users can only see their own data
- ✅ All tables have RLS policies enabled
- ✅ No user can access another user's information

## Next Steps

After setup is complete:

1. ✅ Test signup and login
2. ✅ Upload a test CSV file
3. ✅ Verify data appears in dashboard
4. ✅ Deploy to Vercel
5. ✅ Invite team members via Supabase Auth

## Support

- Supabase Docs: https://supabase.com/docs
- SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
- GitHub Issues: https://github.com/ZMAWline/wireless-income-ledger/issues
