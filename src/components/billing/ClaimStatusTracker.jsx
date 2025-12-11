import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Download, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700', icon: FileText },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  denied: { label: 'Denied', color: 'bg-red-100 text-red-700', icon: XCircle },
  partial: { label: 'Partial', color: 'bg-purple-100 text-purple-700', icon: Clock },
};

export default function ClaimStatusTracker() {
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date'),
  });

  const { data: claimBatches = [] } = useQuery({
    queryKey: ['claim-batches'],
    queryFn: () => base44.entities.ClaimBatch.list('-created_date'),
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => base44.entities.Business.list(),
  });

  const exportClaimsMutation = useMutation({
    mutationFn: async () => {
      const business = businesses.find(b => b.id === currentUser?.business_id);
      const selectedInvoiceRecords = invoices.filter(inv => selectedInvoices.includes(inv.id));

      // Generate 837P format (simplified)
      const batchNumber = `BATCH-${Date.now()}`;
      let ediContent = `ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *${format(new Date(), 'yyMMdd')}*${format(new Date(), 'HHmm')}*^*00501*${batchNumber}*0*P*:~\n`;
      ediContent += `GS*HC*SENDER*RECEIVER*${format(new Date(), 'yyyyMMdd')}*${format(new Date(), 'HHmm')}*1*X*005010X222A1~\n`;

      selectedInvoiceRecords.forEach((invoice, idx) => {
        ediContent += `ST*837*${String(idx + 1).padStart(4, '0')}*005010X222A1~\n`;
        ediContent += `BHT*0019*00*${invoice.invoice_number}*${format(new Date(), 'yyyyMMdd')}*${format(new Date(), 'HHmm')}*CH~\n`;
        ediContent += `NM1*41*2*${business?.business_name}*****46*${business?.tax_id || 'TBD'}~\n`;
        ediContent += `NM1*IL*1*${invoice.client_name}*****MI*${invoice.payer_id || 'TBD'}~\n`;
        
        invoice.line_items?.forEach(item => {
          ediContent += `SV1*HC:${item.billing_code}*${item.amount}*UN*${item.units}***1~\n`;
        });
        
        ediContent += `SE*10*${String(idx + 1).padStart(4, '0')}~\n`;
      });

      ediContent += `GE*${selectedInvoiceRecords.length}*1~\n`;
      ediContent += `IEA*1*${batchNumber}~\n`;

      // Create downloadable file
      const blob = new Blob([ediContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `claims_${batchNumber}.837`;
      a.click();

      // Create batch record
      const totalAmount = selectedInvoiceRecords.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      
      await base44.entities.ClaimBatch.create({
        business_id: currentUser?.business_id,
        batch_number: batchNumber,
        export_type: '837P',
        status: 'submitted',
        submission_date: new Date().toISOString().split('T')[0],
        total_claims: selectedInvoiceRecords.length,
        total_amount: totalAmount,
        paid_amount: 0,
        denied_amount: 0,
        claim_ids: selectedInvoices
      });

      // Update invoice statuses
      for (const invoiceId of selectedInvoices) {
        await base44.entities.Invoice.update(invoiceId, { status: 'submitted' });
      }

      return batchNumber;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim-batches'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Claims exported successfully');
      setExportDialogOpen(false);
      setSelectedInvoices([]);
    },
    onError: () => {
      toast.error('Failed to export claims');
    }
  });

  const businessInvoices = invoices.filter(inv => 
    inv.business_id === currentUser?.business_id &&
    inv.status === 'pending'
  );

  const businessBatches = claimBatches.filter(b => b.business_id === currentUser?.business_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Claims Status</h2>
        <Button
          onClick={() => setExportDialogOpen(true)}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Claims
        </Button>
      </div>

      {/* Claim Batches */}
      <div className="space-y-3">
        <h3 className="font-medium text-slate-900">Recent Claim Batches</h3>
        {businessBatches.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-xl border border-slate-200">
            <p className="text-slate-500">No claim batches submitted yet</p>
          </div>
        ) : (
          businessBatches.map((batch) => {
            const StatusIcon = statusConfig[batch.status]?.icon || Clock;
            return (
              <div key={batch.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">Batch #{batch.batch_number}</h3>
                    <p className="text-sm text-slate-600">
                      Submitted: {format(new Date(batch.submission_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Badge className={cn(statusConfig[batch.status]?.color)}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusConfig[batch.status]?.label}
                  </Badge>
                </div>

                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Claims</p>
                    <p className="font-medium text-slate-900">{batch.total_claims}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Total</p>
                    <p className="font-medium text-slate-900">${batch.total_amount?.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Paid</p>
                    <p className="font-medium text-green-600">${batch.paid_amount?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Denied</p>
                    <p className="font-medium text-red-600">${batch.denied_amount?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>

                {batch.remittance_notes && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-sm text-slate-600">{batch.remittance_notes}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Export Claims (837 Format)</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Select invoices to include in the claim batch
            </p>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {businessInvoices.map(invoice => (
                <label
                  key={invoice.id}
                  className="flex items-center gap-3 p-3 rounded border border-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedInvoices.includes(invoice.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedInvoices([...selectedInvoices, invoice.id]);
                      } else {
                        setSelectedInvoices(selectedInvoices.filter(id => id !== invoice.id));
                      }
                    }}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">#{invoice.invoice_number}</p>
                    <p className="text-sm text-slate-600">
                      {invoice.client_name} - ${invoice.total_amount?.toFixed(2)}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => exportClaimsMutation.mutate()}
                disabled={selectedInvoices.length === 0 || exportClaimsMutation.isPending}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {exportClaimsMutation.isPending ? 'Exporting...' : `Export ${selectedInvoices.length} Claims`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}