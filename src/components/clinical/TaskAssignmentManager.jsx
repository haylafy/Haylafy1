import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, UserCog, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function TaskAssignmentManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCarePlan, setSelectedCarePlan] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [autoAssigning, setAutoAssigning] = useState(false);

  const queryClient = useQueryClient();

  const { data: carePlans = [] } = useQuery({
    queryKey: ['care-plans-approved'],
    queryFn: () => base44.entities.CarePlan.filter({ status: 'approved' }),
  });

  const { data: caregivers = [] } = useQuery({
    queryKey: ['caregivers-active'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Caregiver.filter({ 
        business_id: user.business_id,
        status: 'active' 
      });
    },
  });

  const { data: existingAssignments = [] } = useQuery({
    queryKey: ['task-assignments'],
    queryFn: () => base44.entities.TaskAssignment.list('-assigned_date'),
  });

  const createAssignmentsMutation = useMutation({
    mutationFn: async (assignmentData) => {
      const user = await base44.auth.me();
      return Promise.all(
        assignmentData.map(assignment =>
          base44.entities.TaskAssignment.create({
            ...assignment,
            business_id: user.business_id,
          })
        )
      );
    },
    onSuccess: async (_, assignmentData) => {
      queryClient.invalidateQueries({ queryKey: ['task-assignments'] });
      
      // Send notifications to caregivers
      const uniqueCaregivers = [...new Set(assignmentData.map(a => a.caregiver_id))];
      for (const caregiverId of uniqueCaregivers) {
        const caregiver = caregivers.find(c => c.id === caregiverId);
        if (caregiver?.email) {
          const tasksCount = assignmentData.filter(a => a.caregiver_id === caregiverId).length;
          
          await base44.entities.Notification.create({
            user_email: caregiver.email,
            type: 'new_assignment',
            title: 'New Care Tasks Assigned',
            message: `You have been assigned ${tasksCount} new care task(s). Please review them in your dashboard.`,
            priority: 'medium'
          });

          await base44.integrations.Core.SendEmail({
            to: caregiver.email,
            subject: 'New Care Tasks Assigned',
            body: `Hi ${caregiver.name},\n\nYou have been assigned ${tasksCount} new care task(s). Please log in to your dashboard to review the details.\n\nThank you!`
          });
        }
      }
      
      toast.success(`${assignmentData.length} tasks assigned successfully`);
      setDialogOpen(false);
      setSelectedCarePlan(null);
      setAssignments([]);
    },
    onError: () => {
      toast.error('Failed to assign tasks');
    }
  });

  const autoAssignTasks = (carePlan) => {
    setAutoAssigning(true);
    const newAssignments = [];
    const allTasks = [
      ...(carePlan.adl_tasks || []).map(t => ({ ...t, type: 'adl' })),
      ...(carePlan.iadl_tasks || []).map(t => ({ ...t, type: 'iadl' }))
    ];

    // Define skill mappings for common tasks
    const taskSkillMap = {
      'bathing': ['Personal Care', 'ADL Assistance'],
      'dressing': ['Personal Care', 'ADL Assistance'],
      'grooming': ['Personal Care', 'ADL Assistance'],
      'toileting': ['Personal Care', 'ADL Assistance'],
      'medication': ['Medication Management', 'Medication Administration'],
      'meal': ['Meal Preparation', 'Nutrition'],
      'exercise': ['Physical Therapy Assistance', 'Mobility Assistance'],
      'mobility': ['Mobility Assistance', 'Physical Therapy Assistance'],
      'dementia': ['Dementia Care', 'Memory Care'],
      'housekeeping': ['Light Housekeeping', 'Homemaking'],
      'transportation': ['Transportation', 'Driving'],
      'companionship': ['Companionship', 'Social Support']
    };

    for (const task of allTasks) {
      // Find best matching caregiver based on skill profile
      const scoredCaregivers = caregivers.map(caregiver => {
        let score = 0;
        const taskLower = task.task.toLowerCase();
        
        // Check for skill matches
        if (caregiver.skills && caregiver.skills.length > 0) {
          // Direct skill match
          const directMatch = caregiver.skills.some(skill =>
            taskLower.includes(skill.toLowerCase()) || 
            skill.toLowerCase().includes(taskLower)
          );
          if (directMatch) score += 10;

          // Check skill mapping
          for (const [keyword, requiredSkills] of Object.entries(taskSkillMap)) {
            if (taskLower.includes(keyword)) {
              const hasRequiredSkill = caregiver.skills.some(skill =>
                requiredSkills.some(req => skill.toLowerCase().includes(req.toLowerCase()))
              );
              if (hasRequiredSkill) score += 8;
            }
          }

          // Give preference to caregivers with more relevant skills
          score += caregiver.skills.length * 0.5;
        } else {
          // Penalize caregivers without any skills listed
          score -= 5;
        }

        return { caregiver, score };
      });

      // Sort by score and select best match
      scoredCaregivers.sort((a, b) => b.score - a.score);
      const selectedCaregiver = scoredCaregivers[0]?.caregiver || caregivers[0];

      if (selectedCaregiver) {
        newAssignments.push({
          client_id: carePlan.client_id,
          client_name: carePlan.client_name,
          caregiver_id: selectedCaregiver.id,
          caregiver_name: selectedCaregiver.name,
          care_plan_id: carePlan.id,
          task_type: task.type,
          task_name: task.task,
          frequency: task.frequency || 'Daily',
          priority: task.priority || 'medium',
          instructions: task.instructions || '',
          assigned_date: new Date().toISOString(),
          auto_assigned: true,
          status: 'pending'
        });
      }
    }

    setAssignments(newAssignments);
    setAutoAssigning(false);
    toast.success(`Auto-assigned ${newAssignments.length} tasks based on caregiver skills`);
  };

  const handleManualAssignment = (index, caregiverId) => {
    const updated = [...assignments];
    const caregiver = caregivers.find(c => c.id === caregiverId);
    updated[index].caregiver_id = caregiverId;
    updated[index].caregiver_name = caregiver?.name;
    updated[index].auto_assigned = false;
    setAssignments(updated);
  };

  const handleSaveAssignments = () => {
    if (assignments.length === 0) {
      toast.error('No tasks to assign');
      return;
    }
    createAssignmentsMutation.mutate(assignments);
  };

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    skipped: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900">Task Assignments</h2>
        <Button onClick={() => setDialogOpen(true)} className="bg-teal-600 hover:bg-teal-700">
          <Sparkles className="w-4 h-4 mr-2" />
          Auto-Assign Tasks
        </Button>
      </div>

      {/* Existing Assignments */}
      <div className="space-y-3">
        {existingAssignments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <UserCog className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No task assignments yet</h3>
            <p className="text-slate-500">Start by auto-assigning tasks from approved care plans</p>
          </div>
        ) : (
          existingAssignments.map(assignment => (
            <div key={assignment.id} className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-slate-900">{assignment.task_name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {assignment.task_type.toUpperCase()}
                    </Badge>
                    {assignment.auto_assigned && (
                      <Badge variant="outline" className="text-xs">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Auto
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-slate-600 space-y-1">
                    <p><span className="text-slate-500">Patient:</span> {assignment.client_name}</p>
                    <p><span className="text-slate-500">Caregiver:</span> {assignment.caregiver_name}</p>
                    <p><span className="text-slate-500">Frequency:</span> {assignment.frequency}</p>
                  </div>
                  {assignment.instructions && (
                    <p className="text-sm text-slate-600 mt-2 italic">{assignment.instructions}</p>
                  )}
                </div>
                <Badge className={cn('ml-4', statusColors[assignment.status])}>
                  {assignment.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                  {assignment.status === 'in_progress' && <Clock className="w-3 h-3 mr-1" />}
                  {assignment.status === 'pending' && <AlertCircle className="w-3 h-3 mr-1" />}
                  {assignment.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Assignment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Auto-Assign Care Tasks</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Care Plan</label>
              <Select value={selectedCarePlan?.id} onValueChange={(id) => {
                const plan = carePlans.find(p => p.id === id);
                setSelectedCarePlan(plan);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an approved care plan" />
                </SelectTrigger>
                <SelectContent>
                  {carePlans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.client_name} - Version {plan.version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCarePlan && (
              <>
                <Button 
                  onClick={() => autoAssignTasks(selectedCarePlan)}
                  disabled={autoAssigning}
                  className="w-full"
                  variant="outline"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {autoAssigning ? 'Auto-Assigning...' : 'Auto-Assign Based on Skills'}
                </Button>

                {assignments.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-medium text-slate-900">Review Assignments ({assignments.length})</h3>
                    {assignments.map((assignment, index) => (
                      <div key={index} className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{assignment.task_name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {assignment.task_type.toUpperCase()}
                          </Badge>
                        </div>
                        <Select 
                          value={assignment.caregiver_id}
                          onValueChange={(id) => handleManualAssignment(index, id)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Assign to caregiver" />
                          </SelectTrigger>
                          <SelectContent>
                            {caregivers.map(caregiver => (
                              <SelectItem key={caregiver.id} value={caregiver.id}>
                                <div className="flex flex-col">
                                  <span>{caregiver.name}</span>
                                  {caregiver.skills && caregiver.skills.length > 0 && (
                                    <span className="text-xs text-slate-500">
                                      {caregiver.skills.slice(0, 2).join(', ')}
                                      {caregiver.skills.length > 2 && ` +${caregiver.skills.length - 2}`}
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}

                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSaveAssignments}
                        disabled={createAssignmentsMutation.isPending}
                        className="bg-teal-600 hover:bg-teal-700"
                      >
                        {createAssignmentsMutation.isPending ? 'Assigning...' : `Assign ${assignments.length} Tasks`}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}