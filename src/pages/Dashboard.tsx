
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import KPICards from '@/components/KPICards';
import CSVUpload from '@/components/CSVUpload';
import RecentActivity from '@/components/RecentActivity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, TrendingUp } from 'lucide-react';

const Dashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get transaction stats for the authenticated user
      const { data: transactions } = await supabase
        .from('transactions')
        .select('activity_type, amount')
        .eq('user_id', user.id);

      // Get line count for the authenticated user
      const { data: lines } = await supabase
        .from('lines')
        .select('id, status')
        .eq('user_id', user.id);

      const totalUpfront = transactions?.filter(t => t.activity_type === 'ACT')
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      
      const totalMonthly = transactions?.filter(t => t.activity_type === 'RESIDUAL')
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      
      const totalChargebacks = transactions?.filter(t => t.activity_type === 'DEACT')
        .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0) || 0;
      
      const activeLines = lines?.filter(l => l.status === 'ACTIVE').length || 0;

      return {
        totalUpfront,
        totalMonthly,
        totalChargebacks,
        activeLines,
      };
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Track your wireless commissions and performance</p>
        </div>
      </div>

      <KPICards stats={stats} isLoading={isLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Commission Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CSVUpload />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RecentActivity />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
