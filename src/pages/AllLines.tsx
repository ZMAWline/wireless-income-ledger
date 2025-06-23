
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Eye, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const AllLines = () => {
  const [search, setSearch] = useState('');

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
          transactions(id)
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
    if (!lines?.length) return;

    const headers = ['MDN', 'Customer Name', 'Plan', 'Status', 'Activation Date', 'Transaction Count'];
    const csvContent = [
      headers.join(','),
      ...lines.map(line => [
        line.mdn,
        `"${line.customer_name}"`,
        `"${line.plan || ''}"`,
        line.status,
        line.activation_date ? format(new Date(line.activation_date), 'yyyy-MM-dd') : '',
        line.transactions.length
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lines-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Lines</h1>
          <p className="text-gray-600 mt-2">Manage and view all service lines</p>
        </div>
        <Button onClick={exportToCSV} disabled={!lines?.length}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Lines</CardTitle>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
            <Input
              placeholder="Search by phone number (MDN)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
              <p className="mt-2 text-gray-600">Loading lines...</p>
            </div>
          ) : !lines?.length ? (
            <div className="text-center py-8 text-gray-500">
              <p>No lines found.</p>
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
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Activation Date</TableHead>
                  <TableHead>Transactions</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-mono">{line.mdn}</TableCell>
                    <TableCell>{line.customer_name}</TableCell>
                    <TableCell>{line.plan || 'N/A'}</TableCell>
                    <TableCell>{getStatusBadge(line.status)}</TableCell>
                    <TableCell>
                      {line.activation_date 
                        ? format(new Date(line.activation_date), 'MMM dd, yyyy')
                        : 'N/A'
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {line.transactions.length}
                      </Badge>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default AllLines;
