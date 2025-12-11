import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Upload, X } from 'lucide-react';
import { toast } from "sonner";

export default function OnboardingTaskForm({ task, open, onOpenChange, onSave }) {
  const { data: caregivers = [] } = useQuery({
    queryKey: ['caregivers'],
    queryFn: () => base44.entities.Caregiver.list(),
  });

  const [formData, setFormData] = useState(task || {
    caregiver_id: '',
    caregiver_name: '',
    task_type: 'document',
    task_name: '',
    description: '',
    status: 'pending',
    due_date: '',
    notes: '',
    document_url: '',
    assigned_to: '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCaregiverChange = (caregiverId) => {
    const caregiver = caregivers.find(c => c.id === caregiverId);
    setFormData(prev => ({
      ...prev,
      caregiver_id: caregiverId,
      caregiver_name: caregiver?.name || '',
    }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData(prev => ({ ...prev, document_url: file_url }));
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const data = {
        ...formData,
        completed_date: formData.status === 'completed' ? new Date().toISOString().split('T')[0] : null,
      };
      
      if (task?.id) {
        await base44.entities.OnboardingTask.update(task.id, data);
        toast.success('Task updated successfully');
      } else {
        await base44.entities.OnboardingTask.create(data);
        toast.success('Task created successfully');
      }
      
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error(error.message || 'Failed to save task. You may not have permission.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'Add Onboarding Task'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Caregiver *</Label>
            <Select value={formData.caregiver_id} onValueChange={handleCaregiverChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a caregiver" />
              </SelectTrigger>
              <SelectContent>
                {caregivers.map((caregiver) => (
                  <SelectItem key={caregiver.id} value={caregiver.id}>
                    {caregiver.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Task Type *</Label>
              <Select value={formData.task_type} onValueChange={(v) => handleChange('task_type', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="orientation">Orientation</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="not_applicable">Not Applicable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task_name">Task Name *</Label>
            <Input
              id="task_name"
              value={formData.task_name}
              onChange={(e) => handleChange('task_name', e.target.value)}
              placeholder="e.g., Submit Background Check"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Task details..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => handleChange('due_date', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assigned_to">Assigned To</Label>
              <Input
                id="assigned_to"
                value={formData.assigned_to}
                onChange={(e) => handleChange('assigned_to', e.target.value)}
                placeholder="HR Manager"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Document Upload</Label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span className="text-sm">Upload File</span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {formData.document_url && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span>File uploaded</span>
                  <button
                    type="button"
                    onClick={() => handleChange('document_url', '')}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={saving || !formData.caregiver_id || !formData.task_name} 
              className="bg-teal-600 hover:bg-teal-700"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {task ? 'Update Task' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}