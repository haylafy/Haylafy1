import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, Clock, AlertCircle, Play, XCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function AssignedTasksList() {
  const [selectedTask, setSelectedTask] = useState(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [user, setUser] = useState(null);

  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['my-assigned-tasks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return base44.entities.TaskAssignment.filter(
        { caregiver_id: user.id },
        '-assigned_date'
      );
    },
    enabled: !!user?.id,
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TaskAssignment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-assigned-tasks'] });
      toast.success('Task status updated');
      setSelectedTask(null);
      setCompletionNotes('');
    },
    onError: () => {
      toast.error('Failed to update task');
    }
  });

  const handleStatusUpdate = (task, newStatus) => {
    const updateData = {
      status: newStatus,
      ...(newStatus === 'completed' && {
        completed_date: new Date().toISOString(),
        completion_notes: completionNotes
      })
    };
    updateTaskMutation.mutate({ id: task.id, data: updateData });
  };

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    skipped: 'bg-slate-100 text-slate-600',
  };

  const statusIcons = {
    pending: AlertCircle,
    in_progress: Clock,
    completed: CheckCircle,
    skipped: XCircle,
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  if (isLoading) {
    return <div className="text-center py-8">Loading tasks...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Assigned Tasks</h2>
        
        {/* Pending/In Progress */}
        {pendingTasks.length > 0 ? (
          <div className="space-y-3 mb-6">
            <h3 className="text-sm font-medium text-slate-600">Active Tasks ({pendingTasks.length})</h3>
            {pendingTasks.map(task => {
              const StatusIcon = statusIcons[task.status];
              return (
                <div key={task.id} className="bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900">{task.task_name}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {task.task_type.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-600 space-y-1">
                        <p><span className="text-slate-500">Patient:</span> {task.client_name}</p>
                        <p><span className="text-slate-500">Frequency:</span> {task.frequency}</p>
                        <p><span className="text-slate-500">Priority:</span> <span className="capitalize">{task.priority}</span></p>
                      </div>
                      {task.instructions && (
                        <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                          <p className="text-xs text-slate-500 font-semibold mb-1">Instructions:</p>
                          <p className="text-sm text-slate-700">{task.instructions}</p>
                        </div>
                      )}
                    </div>
                    <Badge className={cn('ml-4', statusColors[task.status])}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="flex gap-2 pt-3 border-t">
                    {task.status === 'pending' && (
                      <Button 
                        size="sm"
                        onClick={() => handleStatusUpdate(task, 'in_progress')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Start Task
                      </Button>
                    )}
                    {task.status === 'in_progress' && (
                      <Button 
                        size="sm"
                        onClick={() => setSelectedTask(task)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Mark Complete
                      </Button>
                    )}
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusUpdate(task, 'skipped')}
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Skip
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 bg-white rounded-xl border border-slate-200 mb-6">
            <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">No active tasks</p>
          </div>
        )}

        {/* Completed */}
        {completedTasks.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-600">Completed Tasks ({completedTasks.length})</h3>
            {completedTasks.slice(0, 5).map(task => (
              <div key={task.id} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900">{task.task_name}</h4>
                    <p className="text-xs text-slate-500">{task.client_name}</p>
                  </div>
                  <Badge className={statusColors[task.status]}>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Completed
                  </Badge>
                </div>
                {task.completion_notes && (
                  <p className="text-xs text-slate-600 mt-2 italic">{task.completion_notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Complete Task Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="font-medium text-slate-900 mb-1">{selectedTask?.task_name}</p>
              <p className="text-sm text-slate-500">Patient: {selectedTask?.client_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Completion Notes (Optional)</label>
              <Textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Add any notes about how the task was completed..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedTask(null)}>
                Cancel
              </Button>
              <Button 
                onClick={() => handleStatusUpdate(selectedTask, 'completed')}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark Complete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}