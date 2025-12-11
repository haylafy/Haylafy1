import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Repeat } from 'lucide-react';
import { addDays, format, parseISO } from 'date-fns';

const daysOfWeek = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 }
];

export default function RecurringShiftDialog({ open, onOpenChange, onSave }) {
  const [formData, setFormData] = useState({
    pattern_name: '',
    client_id: '',
    caregiver_id: '',
    recurrence_type: 'weekly',
    days_of_week: [],
    start_time: '09:00',
    end_time: '17:00',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    service_type: 'personal_care',
    notes: ''
  });

  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.filter({ status: 'active' }),
  });

  const { data: caregivers = [] } = useQuery({
    queryKey: ['caregivers'],
    queryFn: () => base44.entities.Caregiver.filter({ status: 'active' }),
  });

  const createPatternMutation = useMutation({
    mutationFn: async (patternData) => {
      const client = clients.find(c => c.id === patternData.client_id);
      const caregiver = caregivers.find(c => c.id === patternData.caregiver_id);
      
      return await base44.entities.RecurringShiftPattern.create({
        ...patternData,
        client_name: client?.name,
        caregiver_name: caregiver?.name,
        active: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-patterns'] });
      toast.success('Recurring pattern created');
      onSave();
      onOpenChange(false);
      resetForm();
    }
  });

  const resetForm = () => {
    setFormData({
      pattern_name: '',
      client_id: '',
      caregiver_id: '',
      recurrence_type: 'weekly',
      days_of_week: [],
      start_time: '09:00',
      end_time: '17:00',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: '',
      service_type: 'personal_care',
      notes: ''
    });
  };

  const toggleDay = (day) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day].sort()
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createPatternMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-teal-600" />
            Create Recurring Shift Pattern
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label>Pattern Name *</Label>
            <Input 
              value={formData.pattern_name}
              onChange={(e) => setFormData({...formData, pattern_name: e.target.value})}
              placeholder="e.g., Weekly MWF Morning"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Client *</Label>
              <Select value={formData.client_id} onValueChange={(v) => setFormData({...formData, client_id: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Caregiver *</Label>
              <Select value={formData.caregiver_id} onValueChange={(v) => setFormData({...formData, caregiver_id: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select caregiver" />
                </SelectTrigger>
                <SelectContent>
                  {caregivers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Recurrence *</Label>
            <Select value={formData.recurrence_type} onValueChange={(v) => setFormData({...formData, recurrence_type: v})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(formData.recurrence_type === 'weekly' || formData.recurrence_type === 'biweekly') && (
            <div>
              <Label>Days of Week *</Label>
              <div className="flex gap-2 mt-2">
                {daysOfWeek.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.days_of_week.includes(day.value)
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Time *</Label>
              <Input 
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                required
              />
            </div>
            <div>
              <Label>End Time *</Label>
              <Input 
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date *</Label>
              <Input 
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                required
              />
            </div>
            <div>
              <Label>End Date (Optional)</Label>
              <Input 
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({...formData, end_date: e.target.value})}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!formData.client_id || !formData.caregiver_id || createPatternMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {createPatternMutation.isPending ? 'Creating...' : 'Create Pattern'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}