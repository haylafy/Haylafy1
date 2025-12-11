import React from 'react';
import { format } from 'date-fns';
import { DollarSign, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig = {
  paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  overdue: { label: 'Overdue', color: 'bg-rose-100 text-rose-700', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-700', icon: AlertCircle },
};

export default function RecentPayments({ payments }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
      <div className="p-6 border-b border-slate-100">
        <h3 className="text-lg font-semibold text-slate-900">Recent Payments</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {payments.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500">No payments yet</p>
          </div>
        ) : (
          payments.map((payment) => {
            const StatusIcon = statusConfig[payment.status]?.icon || Clock;
            return (
              <div key={payment.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    payment.status === 'paid' ? 'bg-emerald-100' : 'bg-slate-100'
                  )}>
                    <StatusIcon className={cn(
                      "w-5 h-5",
                      payment.status === 'paid' ? 'text-emerald-600' : 'text-slate-500'
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-900 truncate">{payment.client_name}</h4>
                    <p className="text-sm text-slate-500">
                      {payment.invoice_number || `INV-${payment.id?.slice(0, 8)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">${payment.amount?.toLocaleString()}</p>
                    <Badge className={cn("text-xs mt-1", statusConfig[payment.status]?.color)}>
                      {statusConfig[payment.status]?.label}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}