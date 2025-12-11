import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, differenceInDays } from 'date-fns';
import { 
  DollarSign, 
  CreditCard, 
  CheckCircle, 
  AlertTriangle,
  Mail,
  MoreVertical
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import PaymentProcessor from './PaymentProcessor';

export default function PaymentTracker() {
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-invoice_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (invoice) => {
      const client = clients.find(c => c.id === invoice.client_id);
      
      if (!client?.email) {
        throw new Error('Client email not found');
      }

      await base44.integrations.Core.SendEmail({
        to: client.email,
        subject: `Payment Reminder - Invoice #${invoice.invoice_number}`,
        body: `Dear ${client.name},

This is a friendly reminder that invoice #${invoice.invoice_number} is ${getDaysOverdue(invoice) > 0 ? 'overdue' : 'due soon'}.

Invoice Details:
- Invoice Number: ${invoice.invoice_number}
- Amount: $${invoice.total_amount.toFixed(2)}
- Due Date: ${format(new Date(invoice.due_date), 'MMMM d, yyyy')}
${invoice.paid_amount > 0 ? `- Already Paid: $${invoice.paid_amount.toFixed(2)}` : ''}
- Balance Due: $${(invoice.total_amount - (invoice.paid_amount || 0)).toFixed(2)}

Please process this payment at your earliest convenience.

Thank you,
${currentUser?.business_name || 'Haylafy'}`
      });
    },
    onSuccess: () => {
      toast.success('Payment reminder sent');
    },
    onError: (error) => {
      toast.error('Failed to send reminder: ' + error.message);
    }
  });

  const businessInvoices = invoices.filter(inv => 
    inv.business_id === currentUser?.business_id &&
    inv.status !== 'paid'
  );

  const getDaysOverdue = (invoice) => {
    if (!invoice.due_date) return 0;
    const today = new Date();
    const dueDate = new Date(invoice.due_date);
    return differenceInDays(today, dueDate);
  };

  const getInvoiceStatus = (invoice) => {
    const daysOverdue = getDaysOverdue(invoice);
    
    if (invoice.status === 'paid') {
      return { label: 'Paid', color: 'bg-green-100 text-green-700', icon: CheckCircle };
    } else if (daysOverdue > 30) {
      return { label: `${daysOverdue}d Overdue`, color: 'bg-red-100 text-red-700', icon: AlertTriangle };
    } else if (daysOverdue > 0) {
      return { label: `${daysOverdue}d Overdue`, color: 'bg-amber-100 text-amber-700', icon: AlertTriangle };
    } else if (invoice.paid_amount > 0) {
      return { label: 'Partial', color: 'bg-purple-100 text-purple-700', icon: DollarSign };
    } else {
      return { label: 'Pending', color: 'bg-blue-100 text-blue-700', icon: DollarSign };
    }
  };

  const handlePayment = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentDialogOpen(true);
  };

  const overdueInvoices = businessInvoices.filter(inv => getDaysOverdue(inv) > 0);
  const totalOverdue = overdueInvoices.reduce((sum, inv) => 
    sum + (inv.total_amount - (inv.paid_amount || 0)), 0
  );

  return (
    <div className="space-y-6">
      {/* Overdue Alert */}
      {overdueInvoices.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">
              {overdueInvoices.length} Overdue Invoice{overdueInvoices.length > 1 ? 's' : ''}
            </h3>
            <p className="text-sm text-red-700 mt-1">
              Total overdue amount: ${totalOverdue.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending Payments</p>
              <p className="text-2xl font-bold text-slate-900">
                ${businessInvoices.reduce((sum, inv) => 
                  sum + (inv.total_amount - (inv.paid_amount || 0)), 0
                ).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Overdue</p>
              <p className="text-2xl font-bold text-slate-900">
                ${totalOverdue.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Unpaid Invoices</p>
              <p className="text-2xl font-bold text-slate-900">{businessInvoices.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="space-y-3">
        {businessInvoices.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">All Caught Up!</h3>
            <p className="text-slate-500">No pending payments at this time</p>
          </div>
        ) : (
          businessInvoices.map((invoice) => {
            const status = getInvoiceStatus(invoice);
            const StatusIcon = status.icon;
            const balanceDue = invoice.total_amount - (invoice.paid_amount || 0);

            return (
              <div key={invoice.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">Invoice #{invoice.invoice_number}</h3>
                    <p className="text-sm text-slate-600">{invoice.client_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn(status.color)}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {status.label}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handlePayment(invoice)}>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Record Payment
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => sendReminderMutation.mutate(invoice)}
                          disabled={sendReminderMutation.isPending}
                        >
                          <Mail className="w-4 h-4 mr-2" />
                          Send Reminder
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Invoice Date</p>
                    <p className="font-medium text-slate-900">
                      {format(new Date(invoice.invoice_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Due Date</p>
                    <p className={cn(
                      "font-medium",
                      getDaysOverdue(invoice) > 0 ? "text-red-600" : "text-slate-900"
                    )}>
                      {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Total Amount</p>
                    <p className="font-medium text-slate-900">${invoice.total_amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Balance Due</p>
                    <p className="font-bold text-teal-600">${balanceDue.toFixed(2)}</p>
                  </div>
                </div>

                {invoice.paid_amount > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Payment Progress</span>
                      <span className="text-slate-900">
                        ${invoice.paid_amount.toFixed(2)} / ${invoice.total_amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-teal-600 rounded-full transition-all"
                        style={{ width: `${(invoice.paid_amount / invoice.total_amount) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Payment Processor Dialog */}
      <PaymentProcessor
        invoice={selectedInvoice}
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
      />
    </div>
  );
}