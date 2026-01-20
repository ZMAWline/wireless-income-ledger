import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { classifyTransaction, normalizeType } from '@/lib/transactions';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

const Debug = () => {
  const [searchMdn, setSearchMdn] = useState('3476225816');

  const { data: transactions } = useQuery({
    queryKey: ['debug-transactions', searchMdn],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchMdn) {
        query = query.eq('mdn', searchMdn);
      } else {
        query = query.limit(20);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const activityTypeStats = transactions?.reduce((acc: any, tx) => {
    const type = tx.activity_type || 'null';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Transaction Debug</h1>

      <Card>
        <CardContent className="pt-6">
          <Input
            placeholder="Enter MDN to search (or leave empty for first 20)"
            value={searchMdn}
            onChange={(e) => setSearchMdn(e.target.value)}
          />
        </CardContent>
      </Card>

      {activityTypeStats && (
        <Card>
          <CardHeader>
            <CardTitle>Activity Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm font-mono">
              {Object.entries(activityTypeStats).map(([type, count]) => (
                <div key={type}>{type}: {count as number}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {transactions?.map((tx) => {
        const classified = classifyTransaction(tx);
        const normalized = normalizeType(tx);
        return (
          <Card key={tx.id}>
            <CardHeader>
              <CardTitle>MDN: {tx.mdn}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm font-mono">
                <div><strong>id:</strong> {tx.id}</div>
                <div><strong>line_id:</strong> {tx.line_id || 'NULL'}</div>
                <div><strong>mdn:</strong> {tx.mdn}</div>
                <div><strong>activity_type:</strong> "{tx.activity_type}" (length: {tx.activity_type?.length})</div>
                <div><strong>note:</strong> "{tx.note}"</div>
                <div><strong>amount:</strong> {tx.amount}</div>
                <div><strong>cycle:</strong> "{tx.cycle}"</div>
                <div className="pt-2 border-t"><strong>NORMALIZED:</strong></div>
                <div>normalized type: {normalized}</div>
                <div className="pt-2 border-t"><strong>CLASSIFIED:</strong></div>
                <div>type: {classified.type}</div>
                <div className={classified.isUpfront ? 'text-green-600 font-bold' : ''}>isUpfront: {String(classified.isUpfront)}</div>
                <div className={classified.isMonthly ? 'text-blue-600 font-bold' : ''}>isMonthly: {String(classified.isMonthly)}</div>
                <div className={classified.isChargeback ? 'text-red-600 font-bold' : ''}>isChargeback: {String(classified.isChargeback)}</div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default Debug;
