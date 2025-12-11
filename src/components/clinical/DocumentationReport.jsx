import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { FileText, AlertCircle, CheckCircle, History } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';

export default function DocumentationReport() {
  const { data: carePlans = [] } = useQuery({
    queryKey: ['care-plans'],
    queryFn: () => base44.entities.CarePlan.list('-effective_date'),
  });

  const { data: visitDocs = [] } = useQuery({
    queryKey: ['visit-documentation'],
    queryFn: () => base44.entities.VisitDocumentation.list('-visit_date', 100),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['clinical-documents'],
    queryFn: () => base44.entities.ClinicalDocument.list('-upload_date'),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list('-check_in_time', 100),
  });

  const completedShifts = shifts.filter(s => s.status === 'completed');
  const missingDocs = completedShifts.filter(
    s => !visitDocs.find(vd => vd.shift_id === s.id)
  );

  const pendingApprovals = carePlans.filter(cp => cp.status === 'pending_approval');
  
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-900">Documentation Audit & Reports</h2>

      {/* Alerts */}
      <div className="space-y-3">
        {missingDocs.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Missing Visit Documentation</p>
                <p className="text-sm text-red-700 mt-1">
                  {missingDocs.length} completed visits require documentation
                </p>
                <div className="mt-3 space-y-2">
                  {missingDocs.slice(0, 5).map(shift => (
                    <div key={shift.id} className="text-sm text-red-600">
                      • {shift.client_name} - {shift.caregiver_name} ({format(new Date(shift.check_in_time), 'MMM d, h:mm a')})
                    </div>
                  ))}
                  {missingDocs.length > 5 && (
                    <p className="text-sm text-red-600">+ {missingDocs.length - 5} more</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {pendingApprovals.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Care Plans Pending Approval</p>
                <p className="text-sm text-amber-700 mt-1">
                  {pendingApprovals.length} care plans need review
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-slate-900">{visitDocs.length}</p>
              <p className="text-sm text-slate-600">Visit Notes</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-slate-900">{carePlans.filter(cp => cp.status === 'approved').length}</p>
              <p className="text-sm text-slate-600">Active Care Plans</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <div className="flex items-center gap-3">
            <History className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-2xl font-bold text-slate-900">{documents.length}</p>
              <p className="text-sm text-slate-600">Documents Stored</p>
            </div>
          </div>
        </div>
      </div>

      {/* Care Plan Change History */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Care Plan Change History</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {carePlans.slice(0, 10).map(plan => (
            <div key={plan.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-slate-900">{plan.client_name}</p>
                  <p className="text-sm text-slate-500">
                    Version {plan.version} • {plan.status}
                  </p>
                  {plan.approved_date && (
                    <p className="text-xs text-slate-400">
                      Approved on {format(new Date(plan.approved_date), 'MMM d, yyyy')} by {plan.approved_by}
                    </p>
                  )}
                </div>
                <Badge className="bg-slate-100 text-slate-700">
                  v{plan.version}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Access Log */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          📊 All document access, edits, and signatures are logged for audit purposes
        </p>
      </div>
    </div>
  );
}