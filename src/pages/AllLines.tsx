
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
import { toNum, computeLineTotals } from '@/lib/transactions';

const AllLines = () => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const { data: lines, isLoading } = useQuery({
    queryKey: ['lines', search],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: linesData, error: linesError } = await supabase
        .from('lines')
        .select(`
          id,
          mdn,
          customer,
          provider,
          status,
          created_at,
          updated_at,
          transactions (
            id,
            line_id,
            mdn,
            activity_type,
            amount,
            created_at,
            note,
            provider,
            cycle
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (linesError) throw linesError;

      const filteredLines = (linesData || []).filter((l) =>
        search ? l.mdn.toLowerCase().includes(search.toLowerCase()) : true
      );

      return filteredLines;
    },
  });

  // Process lines with payment status using shared helper
  type Tx = { activity_type?: string; note?: string; cycle?: string; amount?: any };

  const processedLines = (lines || []).map((line) => {
    const txs = (line.transactions as Tx[]) || [];
    const totals = computeLineTotals(txs);

    // Temporary debug logging for specific MDNs to verify classification
    if (['6402451376', '9296835627'].includes(line.mdn)) {
      console.log('LINE_DEBUG', {
        mdn: line.mdn,
        txCount: txs.length,
        totals,
        sampleTx: txs.slice(0, 5),
      });
    }

    return {
      ...line,
      ...totals,
    };
  });

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

    // Get all unique months from all transactions
    const allMonths = new Set<string>();
    
    filteredLines.forEach(line => {
      line.transactions.forEach(transaction => {
        if (transaction.created_at) {
          const monthYear = format(new Date(transaction.created_at), 'yyyy-MM');
          allMonths.add(monthYear);
        }
      });
    });

    // Sort months chronologically
    const sortedMonths = Array.from(allMonths).sort();

    // Create headers
    const baseHeaders = [
      'MDN',
      'Customer Name', 
      'Provider',
      'Status',
      'Activation Date',
      'Created At',
      'Updated At',
      'Has Upfront',
      'Has Monthly',
      'Total Earnings',
      'Chargebacks'
    ];

    const monthHeaders = sortedMonths.map(month => `${month} Total`);
    const headers = [...baseHeaders, ...monthHeaders];

    // Generate CSV content
    const csvContent = [
      headers.join(','),
      ...filteredLines.map(line => {
        // Calculate monthly totals for this line
        const monthlyTotals = sortedMonths.map(month => {
          const monthTotal = line.transactions
            .filter(t => {
              if (!t.created_at) return false;
              const transactionMonth = format(new Date(t.created_at), 'yyyy-MM');
              return transactionMonth === month;
            })
            .reduce((sum, t) => sum + toNum(t.amount), 0);
          
          return monthTotal.toFixed(2);
        });

        const baseData = [
          line.mdn,
          `"${line.customer || ''}"`,
          `"${line.provider || ''}"`,
          line.status,
          line.created_at ? format(new Date(line.created_at), 'yyyy-MM-dd') : '',
          line.created_at ? format(new Date(line.created_at), 'yyyy-MM-dd HH:mm:ss') : '',
          line.updated_at ? format(new Date(line.updated_at), 'yyyy-MM-dd HH:mm:ss') : '',
          line.hasUpfront ? 'Yes' : 'No',
          line.hasMonthlyCommission ? 'Yes' : 'No',
          line.netTotal.toFixed(2),
          Math.abs(line.chargebacks).toFixed(2)
        ];

        return [...baseData, ...monthlyTotals].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lines-monthly-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
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
                        <TableCell>{line.customer || 'N/A'}</TableCell>
                        <TableCell>{line.provider || 'N/A'}</TableCell>
                        <TableCell>{getStatusBadge(line.status)}</TableCell>
                        <TableCell>
                          <PaymentStatusIndicator 
                            hasUpfront={line.hasUpfront}
                            hasMonthlyCommission={line.hasMonthlyCommission}
                          />
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-green-600">
                            ${line.netTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
