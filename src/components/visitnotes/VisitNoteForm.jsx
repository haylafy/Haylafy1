import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from 'lucide-react';

const COMMON_TASKS = [
  'Personal care assistance',
  'Medication reminder',
  'Meal preparation',
  'Light housekeeping',
  'Companionship',
  'Mobility assistance',
  'Vital signs check',
  'Exercise assistance',
];

export default function VisitNoteForm({ note, open, onOpenChange, onSave }) {
  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.filter({ status: 'completed' }, '-start_time', 50),
  });

  const [formData, setFormData] = useState(note || {
    shift_id: '',
    caregiver_id: '',
    caregiver_name: '',
    client_id: '',
    client_name: '',
    notes: '',
    mood: '',
    tasks_completed: [],
    concerns: '',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleShiftChange = (shiftId) => {
    const shift = shifts.find(s => s.id === shiftId);
    setFormData(prev => ({
      ...prev,
      shift_id: shiftId,
      caregiver_id: shift?.caregiver_id || '',
      caregiver_name: shift?.caregiver_name || '',
      client_id: shift?.client_id || '',
      client_name: shift?.client_name || '',
    }));
  };

  const toggleTask = (task) => {
    const tasks = formData.tasks_completed || [];
    if (tasks.includes(task)) {
      handleChange('tasks_completed', tasks.filter(t => t !== task));
    } else {
      handleChange('tasks_completed', [...tasks, task]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    if (note?.id) {
      await base44.entities.VisitNote.update(note.id, formData);
    } else {
      await base44.entities.VisitNote.create(formData);
    }
    
    setSaving(false);
    onSave();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{note ? 'Edit Visit Note' : 'Add Visit Note'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Completed Shift *</Label>
            <Select value={formData.shift_id} onValueChange={handleShiftChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a completed shift" />
              </SelectTrigger>
              <SelectContent>
                {shifts.map((shift) => (
                  <SelectItem key={shift.id} value={shift.id}>
                    {shift.client_name} - {shift.caregiver_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Client Mood</Label>
            <Select value={formData.mood} onValueChange={(v) => handleChange('mood', v)}>
              <SelectTrigger>
                <SelectValue placeholder="How was the client today?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excellent">Excellent</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="fair">Fair</SelectItem>
                <SelectItem value="poor">Poor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Tasks Completed</Label>
            <div className="grid grid-cols-2 gap-2">
              {COMMON_TASKS.map((task) => (
                <div key={task} className="flex items-center space-x-2">
                  <Checkbox
                    id={task}
                    checked={formData.tasks_completed?.includes(task)}
                    onCheckedChange={() => toggleTask(task)}
                  />
                  <label
                    htmlFor={task}
                    className="text-sm text-slate-700 cursor-pointer"
                  >
                    {task}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Visit Notes *</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Describe the visit, activities, observations..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="concerns">Concerns (if any)</Label>
            <Textarea
              id="concerns"
              value={formData.concerns}
              onChange={(e) => handleChange('concerns', e.target.value)}
              placeholder="Any health concerns, issues, or items that need follow-up..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={saving || !formData.shift_id || !formData.notes} 
              className="bg-teal-600 hover:bg-teal-700"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {note ? 'Update Note' : 'Save Note'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}