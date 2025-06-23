
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Phone } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface KPICardsProps {
  stats?: {
    totalUpfront: number;
    totalMonthly: number;
    totalChargebacks: number;
    activeLines: number;
  };
  isLoading: boolean;
}

const KPICards = ({ stats, isLoading }: KPICardsProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const kpis = [
    {
      title: 'Total Upfront Commissions',
      value: stats?.totalUpfront || 0,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      format: 'currency',
    },
    {
      title: 'Total Monthly Commissions',
      value: stats?.totalMonthly || 0,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      format: 'currency',
    },
    {
      title: 'Total Chargebacks',
      value: stats?.totalChargebacks || 0,
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      format: 'currency',
    },
    {
      title: 'Active Lines',
      value: stats?.activeLines || 0,
      icon: Phone,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      format: 'number',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.title}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {kpi.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${kpi.bgColor}`}>
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpi.format === 'currency' 
                  ? formatCurrency(kpi.value)
                  : kpi.value.toLocaleString()
                }
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default KPICards;
