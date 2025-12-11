import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckCircle, XCircle, Save, FileText } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";

export default function VisitDocumentationForm() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [formData, setFormData] = useState({
    tasks_completed: [],
    tasks_not_completed: [],
    observations: '',
    safety_concerns: [],
    condition_changes: '',
    caregiver_signature: '',
    patient_signature: ''
  });

  const queryClient = useQueryClient();

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list('-check_in_time', 50),
  });

  const { data: visitDocs = [] } = useQuery({
    queryKey: ['visit-documentation'],
    queryFn: () => base44.entities.VisitDocumentation.list('-visit_date', 50),
  });

  const { data: carePlans = [] } = useQuery({
    queryKey: ['care-plans'],
    queryFn: () => base44.entities.CarePlan.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.VisitDocumentation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit-documentation'] });
      toast.success('Visit documentation saved');
      setDialogOpen(false);
    }
  });

  const completedShifts = shifts.filter(s => s.status === 'completed');
  const shiftsWithoutDocs = completedShifts.filter(
    s => !visitDocs.find(vd => vd.shift_id === s.id)
  );

  const handleShiftSelect = (shiftId) => {
    const shift = shifts.find(s => s.id === shiftId);
    setSelectedShift(shift);
    
    // Load care plan tasks
    const carePlan = carePlans.find(cp => cp.client_id === shift.client_id && cp.status === 'approved');
    if (carePlan) {
      const allTasks = [
        ...(carePlan.adl_tasks || []).map(t => ({ task: t.task, completed: false, notes: '' })),
        ...(carePlan.iadl_tasks || []).map(t => ({ task: t.task, completed: false, notes: '' }))
      ];
      setFormData(prev => ({ ...prev, tasks_completed: allTasks }));
    }
  };

  const handleSave = () => {
    if (!selectedShift) return;
    
    createMutation.mutate({
      shift_id: selectedShift.id,
      client_id: selectedShift.client_id,
      client_name: selectedShift.client_name,
      caregiver_id: selectedShift.caregiver_id,
      caregiver_name: selectedShift.caregiver_name,
      visit_date: format(new Date(selectedShift.check_in_time), 'yyyy-MM-dd'),
      time_in: selectedShift.check_in_time,
      time_out: selectedShift.check_out_time,
      ...formData,
      caregiver_signature_date: new Date().toISOString(),
      documentation_status: 'complete'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900">Visit Documentation</h2>
        <Button onClick={() => setDialogOpen(true)} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />
          Document Visit
        </Button>
      </div>

      {shiftsWithoutDocs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm font-medium text-amber-800">
            {shiftsWithoutDocs.length} completed visits need documentation
          </p>
        </div>
      )}

      {/* Visit Doc List */}
      <div className="space-y-3">
        {visitDocs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No visit documentation yet</h3>
            <p className="text-slate-500">Document completed visits to maintain compliance</p>
          </div>
        ) : (
          visitDocs.map(doc => (
            <div key={doc.id} className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{doc.client_name}</h3>
                  <p className="text-sm text-slate-500">
                    {format(new Date(doc.visit_date), 'MMM d, yyyy')} • {doc.caregiver_name}
                  </p>
                  {doc.time_in && doc.time_out && (
                    <p className="text-xs text-slate-400">
                      {format(new Date(doc.time_in), 'h:mm a')} - {format(new Date(doc.time_out), 'h:mm a')}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  {doc.documentation_status === 'complete' && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Complete</span>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                <div>
                  <p className="text-slate-500">Tasks Completed</p>
                  <p className="font-semibold text-slate-900">
                    {doc.tasks_completed?.filter(t => t.completed).length || 0} / {doc.tasks_completed?.length || 0}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Safety Concerns</p>
                  <p className={cn(
                    "font-semibold",
                    doc.safety_concerns?.length > 0 ? "text-red-600" : "text-green-600"
                  )}>
                    {doc.safety_concerns?.length > 0 ? `⚠ ${doc.safety_concerns.length}` : '✓ None'}
                  </p>
                </div>
              </div>

              {doc.observations && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Observations</p>
                  <p className="text-sm text-slate-700">{doc.observations}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Documentation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visit Documentation</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <Label>Select Visit</Label>
              <Select onValueChange={handleShiftSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a completed visit" />
                </SelectTrigger>
                <SelectContent>
                  {shiftsWithoutDocs.map(shift => (
                    <SelectItem key={shift.id} value={shift.id}>
                      {shift.client_name} - {format(new Date(shift.check_in_time), 'MMM d, h:mm a')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedShift && (
              <>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm"><strong>Patient:</strong> {selectedShift.client_name}</p>
                  <p className="text-sm"><strong>Caregiver:</strong> {selectedShift.caregiver_name}</p>
                  <p className="text-sm"><strong>Time In:</strong> {format(new Date(selectedShift.check_in_time), 'h:mm a')}</p>
                  <p className="text-sm"><strong>Time Out:</strong> {format(new Date(selectedShift.check_out_time), 'h:mm a')}</p>
                </div>

                <div>
                  <Label>Tasks</Label>
                  <div className="space-y-2 mt-2">
                    {formData.tasks_completed.map((task, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <Checkbox 
                          checked={task.completed}
                          onCheckedChange={(checked) => {
                            const updated = [...formData.tasks_completed];
                            updated[idx].completed = checked;
                            setFormData({...formData, tasks_completed: updated});
                          }}
                        />
                        <span className="flex-1">{task.task}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Observations</Label>
                  <Textarea 
                    value={formData.observations}
                    onChange={(e) => setFormData({...formData, observations: e.target.value})}
                    placeholder="General observations during the visit..."
                  />
                </div>

                <div>
                  <Label>Safety Concerns</Label>
                  <Textarea 
                    value={formData.safety_concerns.join('\n')}
                    onChange={(e) => setFormData({...formData, safety_concerns: e.target.value.split('\n').filter(s => s)})}
                    placeholder="Any safety concerns (one per line)..."
                  />
                </div>

                <div>
                  <Label>Condition Changes</Label>
                  <Textarea 
                    value={formData.condition_changes}
                    onChange={(e) => setFormData({...formData, condition_changes: e.target.value})}
                    placeholder="Any changes in patient condition..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Caregiver Signature</Label>
                    <Input 
                      value={formData.caregiver_signature}
                      onChange={(e) => setFormData({...formData, caregiver_signature: e.target.value})}
                      placeholder="Type your name"
                    />
                  </div>
                  <div>
                    <Label>Patient Signature</Label>
                    <Input 
                      value={formData.patient_signature}
                      onChange={(e) => setFormData({...formData, patient_signature: e.target.value})}
                      placeholder="Patient or representative name"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700">
                    <Save className="w-4 h-4 mr-2" />
                    Save Documentation
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}