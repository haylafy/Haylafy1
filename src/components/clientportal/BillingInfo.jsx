import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CreditCard, DollarSign, FileText, Download, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const statusConfig = {
  paid: { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  pending: { color: 'bg-amber-100 text-amber-700', icon: Clock },
  overdue: { color: 'bg-red-100 text-red-700', icon: AlertCircle },
  cancelled: { color: 'bg-slate-100 text-slate-600', icon: FileText },
};

export default function BillingInfo({ clientId, clientName }) {
  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['client-payments', clientId],
    queryFn: () => base44.entities.Payment.list('-created_date'),
    enabled: !!clientId,
    select: (data) => data.filter(payment => payment.client_id === clientId)
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['client-invoices', clientId],
    queryFn: () => base44.entities.Invoice.list('-invoice_date'),
    enabled: !!clientId,
    select: (data) => data.filter(invoice => invoice.client_id === clientId)
  });

  const totalPaid = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalPending = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalOverdue = payments
    .filter(p => p.status === 'overdue')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  if (loadingPayments || loadingInvoices) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Total Paid</span>
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-emerald-600">
            ${totalPaid.toFixed(2)}
          </p>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-amber-50 to-white border-amber-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Pending</span>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-3xl font-bold text-amber-600">
            ${totalPending.toFixed(2)}
          </p>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-red-50 to-white border-red-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Overdue</span>
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-600">
            ${totalOverdue.toFixed(2)}
          </p>
        </Card>
      </div>

      {/* Recent Invoices */}
      <div>
        <h3 className="font-semibold text-slate-900 mb-4">Recent Invoices</h3>
        
        {invoices.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Invoices</h3>
            <p className="text-slate-500">Your billing information will appear here.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {invoices.map(invoice => {
              const StatusIcon = statusConfig[invoice.status]?.icon || FileText;
              
              return (
                <Card key={invoice.id} className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-slate-900">
                          Invoice #{invoice.invoice_number}
                        </h4>
                        <Badge className={statusConfig[invoice.status]?.color || 'bg-slate-100 text-slate-700'}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {invoice.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm text-slate-600">
                        <p>Date: {format(new Date(invoice.invoice_date), 'MMMM d, yyyy')}</p>
                        {invoice.due_date && (
                          <p>Due: {format(new Date(invoice.due_date), 'MMMM d, yyyy')}</p>
                        )}
                        {invoice.payer_name && (
                          <p>Payer: {invoice.payer_name}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900">
                        ${invoice.total_amount?.toFixed(2) || '0.00'}
                      </p>
                      {invoice.paid_amount > 0 && (
                        <p className="text-sm text-emerald-600 mt-1">
                          Paid: ${invoice.paid_amount.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>

                  {invoice.line_items && invoice.line_items.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <p className="text-sm font-medium text-slate-700 mb-2">Services:</p>
                      <div className="space-y-1">
                        {invoice.line_items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm text-slate-600">
                            <span>{item.service_type} ({item.units} units)</span>
                            <span>${item.amount?.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment History */}
      <div>
        <h3 className="font-semibold text-slate-900 mb-4">Payment History</h3>
        
        {payments.length === 0 ? (
          <Card className="p-12 text-center">
            <CreditCard className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Payments</h3>
            <p className="text-slate-500">Your payment history will appear here.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {payments.map(payment => {
              const StatusIcon = statusConfig[payment.status]?.icon || DollarSign;
              
              return (
                <Card key={payment.id} className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center",
                        payment.status === 'paid' ? 'bg-emerald-100' : 'bg-amber-100'
                      )}>
                        <StatusIcon className={cn(
                          "w-6 h-6",
                          payment.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'
                        )} />
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-slate-900">
                          ${payment.amount?.toFixed(2)}
                        </h4>
                        <p className="text-sm text-slate-600">
                          {payment.description || 'Care Services'}
                        </p>
                        {payment.payment_method && (
                          <p className="text-xs text-slate-500 mt-1">
                            via {payment.payment_method}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <Badge className={statusConfig[payment.status]?.color || 'bg-slate-100 text-slate-700'}>
                        {payment.status}
                      </Badge>
                      <p className="text-xs text-slate-500 mt-2">
                        {payment.paid_date 
                          ? format(new Date(payment.paid_date), 'MMM d, yyyy')
                          : payment.due_date 
                            ? `Due ${format(new Date(payment.due_date), 'MMM d')}`
                            : format(new Date(payment.created_date), 'MMM d, yyyy')
                        }
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}