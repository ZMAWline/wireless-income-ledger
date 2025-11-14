
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Phone, User, Calendar, Package } from 'lucide-react';
import { format } from 'date-fns';

const LineDetail = () => {
  const { id } = useParams<{ id: string }>();

  const { data: line, isLoading: lineLoading } = useQuery({
    queryKey: ['line', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lines')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', id, line?.mdn],
    enabled: !!id,
    queryFn: async () => {
      const mdn = line?.mdn;
      let query = supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (mdn) {
        query = query.or(`line_id.eq.${id},mdn.eq.${mdn}`);
      } else {
        query = query.eq('line_id', id as string);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  if (lineLoading || transactionsLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!line) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Line not found</h2>
        <p className="text-gray-600 mt-2">The requested line could not be found.</p>
        <Link to="/lines" className="mt-4 inline-block">
          <Button>Back to All Lines</Button>
        </Link>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'ACT':
        return 'bg-blue-100 text-blue-800';
      case 'RESIDUAL':
        return 'bg-green-100 text-green-800';
      case 'DEACT':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalCommissions = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/lines">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Lines
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Line Details</h1>
      </div>

      {/* Line Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            {line.mdn}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">{line.customer || 'Unknown'}</p>
                <p className="text-xs text-gray-500">Customer</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">{line.provider || 'Unknown'}</p>
                <p className="text-xs text-gray-500">Provider</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {line.created_at ? format(new Date(line.created_at), 'MMM dd, yyyy') : 'Unknown'}
                </p>
                <p className="text-xs text-gray-500">Created At</p>
              </div>
            </div>
            
            <div>
              <Badge className={getStatusColor(line.status)}>
                {line.status}
              </Badge>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Commissions:</span>
              <span className="text-lg font-bold text-green-600">
                ${totalCommissions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {!transactions || transactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No transactions found for this line.</p>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={getActivityTypeColor(transaction.activity_type)}>
                        {transaction.activity_type}
                      </Badge>
                      <div>
                        <p className="font-medium">{transaction.note || '—'}</p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(transaction.created_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${Number(transaction.amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${Number(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      {transaction.provider && (
                        <p className="text-xs text-gray-500">{transaction.provider}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LineDetail;
