
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface PaymentStatusIndicatorProps {
  hasUpfront: boolean;
  hasMonthlyCommission: boolean;
  className?: string;
}

const PaymentStatusIndicator = ({ hasUpfront, hasMonthlyCommission, className }: PaymentStatusIndicatorProps) => {
  if (hasUpfront && hasMonthlyCommission) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <CheckCircle className="h-4 w-4 text-green-500" />
        <Badge variant="default" className="bg-green-100 text-green-800">
          Complete
        </Badge>
      </div>
    );
  }

  if (!hasUpfront && !hasMonthlyCommission) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <XCircle className="h-4 w-4 text-red-500" />
        <Badge variant="destructive">
          No Payments
        </Badge>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <AlertCircle className="h-4 w-4 text-yellow-500" />
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
        {!hasUpfront ? 'Missing Upfront' : 'Missing Monthly'}
      </Badge>
    </div>
  );
};

export default PaymentStatusIndicator;
