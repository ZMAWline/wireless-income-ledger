
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

const RecentActivity = () => {
  const { data: recentTransactions, isLoading } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, amount, activity_type, created_at, transaction_date, mdn, customer')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getActivityBadge = (type: string) => {
    const variants = {
      ACT: 'default',
      RESIDUAL: 'secondary',
      DEACT: 'destructive',
    } as const;

    return (
      <Badge variant={variants[type as keyof typeof variants] || 'default'}>
        {type}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 border rounded">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (!recentTransactions?.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No recent activity found.</p>
        <p className="text-sm mt-1">Upload a CSV file to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recentTransactions.map((transaction) => (
        <div
          key={transaction.id}
          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm">
                {transaction.mdn}
              </p>
              {getActivityBadge(transaction.activity_type)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {(transaction.customer || 'Unknown')} • {format(new Date(transaction.transaction_date || transaction.created_at), 'MMM dd, yyyy')}
            </p>
          </div>
          <div className="text-right">
            <p className={`font-medium ${
              transaction.activity_type === 'DEACT' 
                ? 'text-red-600' 
                : 'text-green-600'
            }`}>
              {transaction.activity_type === 'DEACT' ? '-' : '+'}
              {formatCurrency(Math.abs(transaction.amount))}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecentActivity;
