import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  DollarSign, 
  FileText, 
  Plus,
  Download,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import BillingRateManager from '@/components/billing/BillingRateManager';
import InvoiceGenerator from '@/components/billing/InvoiceGenerator';
import ClaimStatusTracker from '@/components/billing/ClaimStatusTracker';
import PaymentTracker from '@/components/billing/PaymentTracker';
import OverdueAlerts from '@/components/billing/OverdueAlerts';
import InvoiceCreator from '@/components/billing/InvoiceCreator';
import AIInvoiceSuggestion from '@/components/billing/AIInvoiceSuggestion';
import BillingValidation from '@/components/billing/BillingValidation';
import AutomatedReminders from '@/components/billing/AutomatedReminders';
import ClaimSubmission from '@/components/billing/ClaimSubmission';
import { hasPermission } from '@/components/utils/permissions';

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-600', icon: FileText },
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700', icon: FileText },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  denied: { label: 'Denied', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  partial: { label: 'Partial', color: 'bg-purple-100 text-purple-700', icon: DollarSign },
};

export default function BillingAutomation() {
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date'),
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['visits'],
    queryFn: () => base44.entities.Visit.list(),
  });

  const { data: claimBatches = [] } = useQuery({
    queryKey: ['claim-batches'],
    queryFn: () => base44.entities.ClaimBatch.list('-created_date'),
  });

  // Filter by business
  const businessInvoices = invoices.filter(inv => inv.business_id === currentUser?.business_id);
  const businessBatches = claimBatches.filter(batch => batch.business_id === currentUser?.business_id);

  // Calculate stats
  const totalRevenue = businessInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const paidAmount = businessInvoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
  const pendingAmount = businessInvoices
    .filter(inv => inv.status === 'pending' || inv.status === 'submitted')
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

  return (
    <div className="space-y-6">
      <OverdueAlerts />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Billing Automation</h1>
          <p className="text-slate-500 mt-1">AI-powered invoicing and claims processing</p>
        </div>
        <div className="flex gap-2">
          <AIInvoiceSuggestion onApplySuggestions={(suggestions) => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
          }} />
          {hasPermission(currentUser, 'CREATE_INVOICES') && (
            <Button 
              onClick={() => setCreateInvoiceOpen(true)}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          )}
        </div>
      </div>

      <InvoiceCreator 
        open={createInvoiceOpen} 
        onOpenChange={setCreateInvoiceOpen}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Invoices</p>
              <p className="text-2xl font-bold text-slate-900">{businessInvoices.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Paid</p>
              <p className="text-2xl font-bold text-slate-900">${paidAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-2xl font-bold text-slate-900">${pendingAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Claims Submitted</p>
              <p className="text-2xl font-bold text-slate-900">{businessBatches.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payment Tracking</TabsTrigger>
          <TabsTrigger value="generate">Generate Invoices</TabsTrigger>
          <TabsTrigger value="validation">AI Validation</TabsTrigger>
          <TabsTrigger value="reminders">Auto Reminders</TabsTrigger>
          <TabsTrigger value="submission">Claim Submission</TabsTrigger>
          <TabsTrigger value="rates">Billing Rates</TabsTrigger>
          <TabsTrigger value="claims">Claims Status</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : businessInvoices.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No invoices yet</h3>
              <p className="text-slate-500">Generate invoices from completed visits</p>
            </div>
          ) : (
            businessInvoices.map((invoice) => {
              const StatusIcon = statusConfig[invoice.status]?.icon || FileText;
              return (
                <div key={invoice.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        Invoice #{invoice.invoice_number}
                      </h3>
                      <p className="text-sm text-slate-600">{invoice.client_name}</p>
                      {invoice.payer_name && (
                        <p className="text-xs text-slate-500">Payer: {invoice.payer_name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn(statusConfig[invoice.status]?.color)}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig[invoice.status]?.label}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Date</p>
                      <p className="font-medium text-slate-900">
                        {format(new Date(invoice.invoice_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Total</p>
                      <p className="font-medium text-slate-900">
                        ${invoice.total_amount?.toFixed(2)}
                      </p>
                    </div>
                    {invoice.paid_amount > 0 && (
                      <div>
                        <p className="text-slate-500">Paid</p>
                        <p className="font-medium text-green-600">
                          ${invoice.paid_amount.toFixed(2)}
                        </p>
                      </div>
                    )}
                    {invoice.visit_ids?.length > 0 && (
                      <div>
                        <p className="text-slate-500">Visits</p>
                        <p className="font-medium text-slate-900">{invoice.visit_ids.length}</p>
                      </div>
                    )}
                  </div>

                  {invoice.line_items?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <p className="text-xs font-medium text-slate-500 mb-2">Line Items:</p>
                      <div className="space-y-1">
                        {invoice.line_items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-slate-600">
                              {item.service_type} ({item.units} {item.billing_code})
                            </span>
                            <span className="font-medium text-slate-900">
                              ${item.amount?.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="payments">
          <PaymentTracker />
        </TabsContent>

        <TabsContent value="generate">
          <InvoiceGenerator />
        </TabsContent>

        <TabsContent value="validation">
          <BillingValidation />
        </TabsContent>

        <TabsContent value="reminders">
          <AutomatedReminders />
        </TabsContent>

        <TabsContent value="submission">
          <ClaimSubmission />
        </TabsContent>

        <TabsContent value="rates">
          <BillingRateManager />
        </TabsContent>

        <TabsContent value="claims">
          <ClaimStatusTracker />
        </TabsContent>
      </Tabs>
    </div>
  );
}