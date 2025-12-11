import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Calendar, AlertTriangle, CheckCircle, TrendingUp, Users, Clock, MapPin, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, addDays, startOfWeek } from 'date-fns';

export default function AIScheduleOptimizer({ onShiftCreate }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState(null);
  const queryClient = useQueryClient();

  const generateScheduleMutation = useMutation({
    mutationFn: async () => {
      const startDate = startOfWeek(new Date());
      const endDate = addDays(startDate, 7);
      
      const response = await base44.functions.invoke('generateOptimalSchedule', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        options: { preferences: 'Maximize continuity of care and minimize travel time' }
      });
      
      return response.data;
    },
    onSuccess: (data) => {
      setOptimizationResult(data);
      setDialogOpen(true);
      toast.success('AI schedule optimization complete!');
    },
    onError: (error) => {
      toast.error(`Optimization failed: ${error.message}`);
    }
  });

  const applyRecommendationMutation = useMutation({
    mutationFn: async (shift) => {
      const user = await base44.auth.me();
      return await base44.entities.Shift.create({
        business_id: user.business_id,
        client_id: shift.client_id,
        client_name: shift.client_name,
        caregiver_id: shift.caregiver_id,
        caregiver_name: shift.caregiver_name,
        client_address: shift.client_address || '',
        start_time: shift.start_time,
        end_time: shift.end_time,
        service_type: shift.service_type || 'personal_care',
        status: 'scheduled',
        notes: `AI-recommended: ${shift.reasoning || 'Optimal match based on AI analysis'}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success('Shift created successfully');
      if (onShiftCreate) onShiftCreate();
    }
  });

  const applyAllRecommendations = async () => {
    if (!optimizationResult?.ai_recommendations?.recommended_shifts) return;
    
    const shifts = optimizationResult.ai_recommendations.recommended_shifts;
    let created = 0;
    
    for (const shift of shifts) {
      try {
        await applyRecommendationMutation.mutateAsync(shift);
        created++;
      } catch (error) {
        console.error('Failed to create shift:', error);
      }
    }
    
    toast.success(`Created ${created} of ${shifts.length} recommended shifts`);
    setDialogOpen(false);
  };

  return (
    <>
      <Button
        onClick={() => generateScheduleMutation.mutate()}
        disabled={generateScheduleMutation.isPending}
        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
      >
        {generateScheduleMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Optimizing...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            AI Schedule Optimizer
          </>
        )}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="w-6 h-6 text-purple-600" />
              AI Schedule Optimization Results
            </DialogTitle>
          </DialogHeader>

          {optimizationResult && (
            <div className="space-y-6 mt-4">
              {/* Summary */}
              <Card className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-2">Optimization Summary</h3>
                    <p className="text-sm text-slate-700">
                      {optimizationResult.ai_recommendations?.summary}
                    </p>
                    {optimizationResult.ai_recommendations?.optimization_score && (
                      <Badge className="mt-2 bg-purple-600">
                        Score: {Math.round(optimizationResult.ai_recommendations.optimization_score)}%
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>

              {/* Conflicts */}
              {optimizationResult.detected_conflicts?.length > 0 && (
                <Card className="p-4 border-amber-200 bg-amber-50">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 mb-2">
                        Detected Conflicts ({optimizationResult.detected_conflicts.length})
                      </h3>
                      <div className="space-y-2">
                        {optimizationResult.detected_conflicts.map((conflict, idx) => (
                          <div key={idx} className="text-sm p-2 bg-white rounded border border-amber-200">
                            <p className="text-amber-900 font-medium">{conflict.description}</p>
                            <p className="text-amber-700 text-xs mt-1">Type: {conflict.type}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* AI Conflicts */}
              {optimizationResult.ai_recommendations?.conflicts?.length > 0 && (
                <Card className="p-4 border-red-200 bg-red-50">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 mb-2">
                        AI-Detected Issues
                      </h3>
                      <div className="space-y-2">
                        {optimizationResult.ai_recommendations.conflicts.map((conflict, idx) => (
                          <div key={idx} className="text-sm p-2 bg-white rounded border border-red-200">
                            <p className="text-red-900 font-medium">{conflict.description}</p>
                            <p className="text-red-700 text-xs mt-1">
                              <strong>Solution:</strong> {conflict.suggested_resolution}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Coverage Gaps */}
              {optimizationResult.ai_recommendations?.coverage_gaps?.length > 0 && (
                <Card className="p-4 border-orange-200 bg-orange-50">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 mb-2">
                        Coverage Gaps ({optimizationResult.ai_recommendations.coverage_gaps.length})
                      </h3>
                      <div className="space-y-2">
                        {optimizationResult.ai_recommendations.coverage_gaps.map((gap, idx) => (
                          <div key={idx} className="text-sm p-2 bg-white rounded border border-orange-200">
                            <p className="text-orange-900 font-medium">
                              {gap.client_name} - {gap.time_period}
                            </p>
                            <Badge className="mt-1 bg-orange-600 text-xs">
                              {gap.severity} priority
                            </Badge>
                            {gap.suggested_caregivers?.length > 0 && (
                              <p className="text-orange-700 text-xs mt-1">
                                Suggested caregivers: {gap.suggested_caregivers.join(', ')}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Recommended Shifts */}
              {optimizationResult.ai_recommendations?.recommended_shifts?.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Recommended Shifts ({optimizationResult.ai_recommendations.recommended_shifts.length})
                    </h3>
                    <Button 
                      onClick={applyAllRecommendations}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Apply All
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {optimizationResult.ai_recommendations.recommended_shifts.map((shift, idx) => (
                      <Card key={idx} className="p-3 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {Math.round((shift.confidence_score || 0.85) * 100)}% match
                              </Badge>
                              <Badge className="bg-blue-600 text-xs">
                                {shift.service_type || 'personal_care'}
                              </Badge>
                            </div>
                            
                            <p className="font-medium text-slate-900 text-sm">
                              {shift.client_name} ← {shift.caregiver_name}
                            </p>
                            
                            <div className="flex items-center gap-4 text-xs text-slate-600 mt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(shift.start_time), 'MMM d')}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(shift.start_time), 'h:mm a')} - 
                                {format(new Date(shift.end_time), 'h:mm a')}
                              </span>
                            </div>
                            
                            <p className="text-xs text-slate-500 mt-1 italic">
                              {shift.reasoning}
                            </p>
                          </div>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => applyRecommendationMutation.mutate(shift)}
                            disabled={applyRecommendationMutation.isPending}
                          >
                            Apply
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Workload Analysis */}
              {optimizationResult.ai_recommendations?.workload_analysis && (
                <Card className="p-4 bg-slate-50">
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-slate-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 mb-2">Workload Distribution</h3>
                      <p className="text-sm text-slate-700 mb-3">
                        {optimizationResult.ai_recommendations.workload_analysis.summary}
                      </p>
                      
                      {optimizationResult.ai_recommendations.workload_analysis.caregiver_hours?.length > 0 && (
                        <div className="space-y-1">
                          {optimizationResult.ai_recommendations.workload_analysis.caregiver_hours.map((cg, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm p-2 bg-white rounded">
                              <span className="text-slate-700">{cg.caregiver_name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-600">{cg.total_hours}h</span>
                                <Badge variant="outline" className={
                                  cg.status === 'overloaded' ? 'border-red-500 text-red-700' :
                                  cg.status === 'underutilized' ? 'border-amber-500 text-amber-700' :
                                  'border-green-500 text-green-700'
                                }>
                                  {cg.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}