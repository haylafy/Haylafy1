import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Loader2, CheckCircle, Send } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from 'date-fns';

export default function ClaimSubmission() {
  const queryClient = useQueryClient();

  const { data: claimBatches = [] } = useQuery({
    queryKey: ['claim-batches'],
    queryFn: () => base44.entities.ClaimBatch.list('-created_date'),
  });

  const submitClaimMutation = useMutation({
    mutationFn: async (batchId) => {
      const response = await base44.functions.invoke('sendClaimToClearinghouse', {
        claimBatchId: batchId
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['claim-batches'] });
      toast.success(`${data.claims_submitted} claims submitted successfully`);
    },
    onError: (error) => {
      toast.error('Failed to submit claims');
      console.error(error);
    }
  });

  const pendingBatches = claimBatches.filter(b => b.status === 'pending');
  const submittedBatches = claimBatches.filter(b => b.status === 'submitted');

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-teal-600" />
          Automated Claim Submission
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-3 bg-amber-50 rounded-lg">
            <p className="text-sm text-slate-600">Pending Submission</p>
            <p className="text-2xl font-bold text-amber-600">{pendingBatches.length}</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-slate-600">Submitted</p>
            <p className="text-2xl font-bold text-green-600">{submittedBatches.length}</p>
          </div>
        </div>

        {pendingBatches.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-700">Ready for Submission</h4>
            {pendingBatches.map(batch => (
              <div key={batch.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                <div>
                  <p className="font-medium text-slate-900">Batch #{batch.batch_number}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-600 mt-1">
                    <span>{batch.total_claims} claims</span>
                    <span>•</span>
                    <span>${batch.total_amount?.toFixed(2)}</span>
                    <span>•</span>
                    <span>{batch.payer_name}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => submitClaimMutation.mutate(batch.id)}
                  disabled={submitClaimMutation.isPending}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {submitClaimMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3 h-3 mr-1" />
                      Submit
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {submittedBatches.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <h4 className="text-sm font-medium text-slate-700 mb-2">Recently Submitted</h4>
            <div className="space-y-2">
              {submittedBatches.slice(0, 3).map(batch => (
                <div key={batch.id} className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Batch #{batch.batch_number}</p>
                    <p className="text-xs text-slate-600">
                      Submitted {format(new Date(batch.submission_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Badge className="bg-green-600">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Submitted
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}