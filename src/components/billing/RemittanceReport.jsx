import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, FileText } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-slate-100 text-slate-700', icon: AlertCircle },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700', icon: FileText },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-700', icon: TrendingUp },
  denied: { label: 'Denied', color: 'bg-red-100 text-red-700', icon: TrendingDown },
  partial: { label: 'Partial Payment', color: 'bg-amber-100 text-amber-700', icon: DollarSign }
};

export default function RemittanceReport({ batches }) {
  const totalSubmitted = batches.reduce((sum, b) => sum + (b.total_amount || 0), 0);
  const totalPaid = batches.reduce((sum, b) => sum + (b.paid_amount || 0), 0);
  const totalDenied = batches.reduce((sum, b) => sum + (b.denied_amount || 0), 0);
  const totalAdjustments = batches.reduce((sum, b) => sum + (b.adjustment_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Submitted</p>
              <p className="text-2xl font-bold text-slate-900">${totalSubmitted.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Paid</p>
              <p className="text-2xl font-bold text-slate-900">${totalPaid.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Denied</p>
              <p className="text-2xl font-bold text-slate-900">${totalDenied.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Adjustments</p>
              <p className="text-2xl font-bold text-slate-900">${totalAdjustments.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Batch List */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Claim Batches</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {batches.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No batches submitted yet
            </div>
          ) : (
            batches.map((batch) => {
              const StatusIcon = statusConfig[batch.status]?.icon || AlertCircle;
              return (
                <div key={batch.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-medium text-slate-900">{batch.batch_number}</p>
                        <Badge className={cn("text-xs", statusConfig[batch.status]?.color)}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig[batch.status]?.label}
                        </Badge>
                        <span className="text-sm text-slate-500">{batch.export_type}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">Payer</p>
                          <p className="font-medium text-slate-900">{batch.payer_name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Claims</p>
                          <p className="font-medium text-slate-900">{batch.total_claims || 0}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Submitted</p>
                          <p className="font-medium text-slate-900">
                            {batch.submission_date ? format(new Date(batch.submission_date), 'MMM d, yyyy') : 'Pending'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Total Amount</p>
                          <p className="font-medium text-slate-900">${(batch.total_amount || 0).toLocaleString()}</p>
                        </div>
                      </div>

                      {batch.status !== 'pending' && (
                        <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-slate-100 text-sm">
                          <div>
                            <p className="text-green-600">Paid: ${(batch.paid_amount || 0).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-red-600">Denied: ${(batch.denied_amount || 0).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-amber-600">Adjusted: ${(batch.adjustment_amount || 0).toLocaleString()}</p>
                          </div>
                        </div>
                      )}

                      {batch.remittance_notes && (
                        <p className="text-sm text-slate-600 mt-2 italic">{batch.remittance_notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}