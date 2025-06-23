
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Eye, Download, AlertTriangle, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import PaymentStatusIndicator from '@/components/PaymentStatusIndicator';

const AllLines = () => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const { data: lines, isLoading } = useQuery({
    queryKey: ['lines', search],
    queryFn: async () => {
      let query = supabase
        .from('lines')
        .select(`
          id,
          mdn,
          customer_name,
          plan,
          status,
          activation_date,
          transactions(
            id,
            activity_type,
            amount,
            transaction_date
          )
        `)
        .order('created_at', { ascending: false });

      if (search) {
        query = query.ilike('mdn', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Process lines to determine payment status
  const processedLines = lines?.map(line => {
    const hasUpfront = line.transactions.some(t => t.activity_type === 'ACT');
    const hasMonthlyCommission = line.transactions.some(t => t.activity_type === 'RESIDUAL');
    const totalEarnings = line.transactions
      .filter(t => t.activity_type !== 'DEACT')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const chargebacks = line.transactions
      .filter(t => t.activity_type === 'DEACT')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      ...line,
      hasUpfront,
      hasMonthlyCommission,
      totalEarnings,
      chargebacks,
      paymentStatus: hasUpfront && hasMonthlyCommission ? 'complete' : 
                    !hasUpfront && !hasMonthlyCommission ? 'none' : 'partial'
    };
  }) || [];

  const filteredLines = processedLines.filter(line => {
    if (activeTab === 'missing-upfront') return !line.hasUpfront;
    if (activeTab === 'missing-monthly') return !line.hasMonthlyCommission;
    if (activeTab === 'no-payments') return line.paymentStatus === 'none';
    return true; // 'all' tab
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      ACTIVE: 'default',
      INACTIVE: 'secondary',
      SUSPENDED: 'destructive',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {status}
      </Badge>
    );
  };

  const exportToCSV = () => {
    if (!filteredLines?.length) return;

    const headers = ['MDN', 'Customer Name', 'Provider', 'Status', 'Activation Date', 'Has Upfront', 'Has Monthly', 'Total Earnings', 'Chargebacks'];
    const csvContent = [
      headers.join(','),
      ...filteredLines.map(line => [
        line.mdn,
        `"${line.customer_name}"`,
        `"${line.plan || ''}"`,
        line.status,
        line.activation_date ? format(new Date(line.activation_date), 'yyyy-MM-dd') : '',
        line.hasUpfront ? 'Yes' : 'No',
        line.hasMonthlyCommission ? 'Yes' : 'No',
        line.totalEarnings.toFixed(2),
        Math.abs(line.chargebacks).toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lines-payment-status-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const stats = {
    total: processedLines.length,
    missingUpfront: processedLines.filter(l => !l.hasUpfront).length,
    missingMonthly: processedLines.filter(l => !l.hasMonthlyCommission).length,
    noPayments: processedLines.filter(l => l.paymentStatus === 'none').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Status Overview</h1>
          <p className="text-gray-600 mt-2">Track which lines are missing upfront or monthly commissions</p>
        </div>
        <Button onClick={exportToCSV} disabled={!filteredLines?.length}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Payment Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Lines</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Missing Upfront</p>
                <p className="text-2xl font-bold text-red-600">{stats.missingUpfront}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Missing Monthly</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.missingMonthly}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">No Payments</p>
                <p className="text-2xl font-bold text-red-600">{stats.noPayments}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Lines by Payment Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All Lines ({stats.total})</TabsTrigger>
              <TabsTrigger value="missing-upfront">Missing Upfront ({stats.missingUpfront})</TabsTrigger>
              <TabsTrigger value="missing-monthly">Missing Monthly ({stats.missingMonthly})</TabsTrigger>
              <TabsTrigger value="no-payments">No Payments ({stats.noPayments})</TabsTrigger>
            </TabsList>

            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              <Input
                placeholder="Search by phone number (MDN)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <TabsContent value={activeTab} className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                  <p className="mt-2 text-gray-600">Loading lines...</p>
                </div>
              ) : !filteredLines?.length ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No lines found for this filter.</p>
                  {search && (
                    <p className="text-sm mt-1">Try adjusting your search criteria.</p>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>MDN</TableHead>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Total Earnings</TableHead>
                      <TableHead>Chargebacks</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell className="font-mono">{line.mdn}</TableCell>
                        <TableCell>{line.customer_name}</TableCell>
                        <TableCell>{line.plan || 'N/A'}</TableCell>
                        <TableCell>{getStatusBadge(line.status)}</TableCell>
                        <TableCell>
                          <PaymentStatusIndicator 
                            hasUpfront={line.hasUpfront}
                            hasMonthlyCommission={line.hasMonthlyCommission}
                          />
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-green-600">
                            ${line.totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                        <TableCell>
                          {line.chargebacks !== 0 && (
                            <span className="font-medium text-red-600">
                              -${Math.abs(line.chargebacks).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button asChild variant="outline" size="sm">
                            <Link to={`/lines/${line.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              Details
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AllLines;
