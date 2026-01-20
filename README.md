# Wireless Income Ledger

A modern web application for tracking and managing wireless commission income. Built with React, TypeScript, and Supabase.

## Features

- 📊 **Dashboard** - Overview of total commissions, active lines, and recent activity
- 💰 **Commission Tracking** - Track upfront payments, monthly residuals, and chargebacks
- 📱 **Line Management** - Manage wireless lines with detailed transaction history
- 📈 **Payment Status** - Visual indicators for missing upfront or monthly commissions
- 📄 **CSV Import** - Bulk import commission data from CSV files
- 🔐 **Secure Authentication** - User authentication powered by Supabase
- 📊 **Export Reports** - Export data to CSV with monthly breakdowns

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI)
- **Backend**: Supabase (PostgreSQL + Auth)
- **State Management**: TanStack Query (React Query)
- **Form Handling**: React Hook Form + Zod
- **Routing**: React Router v6
- **CSV Parsing**: PapaParse
- **Date Handling**: date-fns

## Prerequisites

- Node.js 18+ and npm
- Supabase account and project

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/ZMAWline/wireless-income-ledger.git
cd wireless-income-ledger
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Replace the values with your Supabase project credentials.

### 4. Set up Supabase

You'll need to create the following tables in your Supabase database:

#### `lines` table
```sql
create table lines (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  mdn text not null,
  customer text,
  provider text,
  status text default 'ACTIVE',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table lines enable row level security;

-- Create policy
create policy "Users can only access their own lines"
  on lines for all
  using (auth.uid() = user_id);
```

#### `transactions` table
```sql
create table transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  line_id uuid references lines(id),
  mdn text not null,
  activity_type text not null,
  amount numeric not null,
  customer text,
  provider text,
  cycle text,
  note text,
  transaction_date timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table transactions enable row level security;

-- Create policy
create policy "Users can only access their own transactions"
  on transactions for all
  using (auth.uid() = user_id);
```

### 5. Start the development server

```bash
npm run dev
```

The app will be available at `http://localhost:8080`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
wireless-income-ledger/
├── src/
│   ├── components/        # Reusable UI components
│   ├── hooks/            # Custom React hooks
│   ├── integrations/     # Supabase client configuration
│   ├── lib/              # Utility functions
│   ├── pages/            # Page components
│   └── main.tsx          # Application entry point
├── public/               # Static assets
└── supabase/            # Supabase configuration (if using local dev)
```

## Key Features Explained

### CSV Import
Upload commission reports in CSV format. The system automatically:
- Creates or updates line records
- Imports transactions
- Prevents duplicate entries
- Associates transactions with the authenticated user

### Payment Status Tracking
Visual indicators show which lines are:
- Missing upfront commissions
- Missing monthly residuals
- Have no payments at all

### Monthly Export
Export functionality generates CSV reports with:
- Line details
- Monthly commission totals
- Total earnings and chargebacks
- Customizable date ranges

## Security

- Row Level Security (RLS) enabled on all tables
- User data isolation - users can only see their own data
- Secure authentication via Supabase Auth
- Environment variables for sensitive credentials

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For issues and questions, please open an issue on GitHub.
