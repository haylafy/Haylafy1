import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';

export default function Claims() {
  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list('-created_date'),
  });

  const statusConfig = {
    paid: { label: 'Paid', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
    overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700', icon: XCircle },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Claims</h1>
          <p className="text-slate-500 mt-1">Billing and insurance claims management</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Paid Claims</p>
              <p className="text-2xl font-bold text-slate-900">
                {payments.filter(p => p.status === 'paid').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending Claims</p>
              <p className="text-2xl font-bold text-slate-900">
                {payments.filter(p => p.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Amount</p>
              <p className="text-2xl font-bold text-slate-900">
                ${payments.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {payments.map((payment) => {
          const StatusIcon = statusConfig[payment.status]?.icon || Clock;
          return (
            <div key={payment.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-slate-900">{payment.client_name}</h3>
                    <Badge className={statusConfig[payment.status]?.color}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusConfig[payment.status]?.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-slate-600">
                    <span>Invoice: {payment.invoice_number}</span>
                    {payment.due_date && (
                      <span>Due: {format(new Date(payment.due_date), 'MMM d, yyyy')}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">
                    ${payment.amount?.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}