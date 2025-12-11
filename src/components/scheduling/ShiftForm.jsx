import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from "sonner";

export default function ShiftForm({ shift, open, onOpenChange, onSave, selectedDate }) {
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: caregivers = [] } = useQuery({
    queryKey: ['caregivers'],
    queryFn: () => base44.entities.Caregiver.list(),
  });

  const defaultDate = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

  const [formData, setFormData] = useState({
    client_id: '',
    client_name: '',
    caregiver_id: '',
    caregiver_name: '',
    start_time: `${defaultDate}T09:00`,
    end_time: `${defaultDate}T17:00`,
    status: 'scheduled',
    notes: '',
    client_address: '',
  });

  useEffect(() => {
    if (open) {
      if (shift) {
        setFormData({
          ...shift,
          start_time: shift.start_time ? format(new Date(shift.start_time), "yyyy-MM-dd'T'HH:mm") : `${defaultDate}T09:00`,
          end_time: shift.end_time ? format(new Date(shift.end_time), "yyyy-MM-dd'T'HH:mm") : `${defaultDate}T17:00`,
        });
      } else {
        const newDefaultDate = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
        setFormData({
          client_id: '',
          client_name: '',
          caregiver_id: '',
          caregiver_name: '',
          start_time: `${newDefaultDate}T09:00`,
          end_time: `${newDefaultDate}T17:00`,
          status: 'scheduled',
          notes: '',
          client_address: '',
        });
      }
    }
  }, [open, shift, selectedDate]);

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    setFormData(prev => ({
      ...prev,
      client_id: clientId,
      client_name: client?.name || '',
      client_address: client?.address || '',
    }));
  };

  const handleCaregiverChange = (caregiverId) => {
    const caregiver = caregivers.find(c => c.id === caregiverId);
    setFormData(prev => ({
      ...prev,
      caregiver_id: caregiverId,
      caregiver_name: caregiver?.name || '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.client_id || !formData.caregiver_id) {
      toast.error('Please select both client and caregiver');
      return;
    }

    setSaving(true);
    
    try {
        const shiftData = {
          business_id: user.business_id,
          client_id: formData.client_id,
          client_name: formData.client_name,
          caregiver_id: formData.caregiver_id,
          caregiver_name: formData.caregiver_name,
          start_time: new Date(formData.start_time).toISOString(),
          end_time: new Date(formData.end_time).toISOString(),
          status: formData.status,
          notes: formData.notes || '',
          client_address: formData.client_address || '',
        };
      
      if (shift?.id) {
        await base44.entities.Shift.update(shift.id, shiftData);
        toast.success('Shift updated successfully');
      } else {
        await base44.entities.Shift.create(shiftData);
        toast.success('Shift scheduled successfully');
      }
      
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving shift:', error);
      toast.error(error.message || 'Failed to save shift');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{shift ? 'Edit Shift' : 'Schedule New Shift'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Client *</Label>
            <Select value={formData.client_id} onValueChange={handleClientChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Caregiver *</Label>
            <Select value={formData.caregiver_id} onValueChange={handleCaregiverChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a caregiver" />
              </SelectTrigger>
              <SelectContent>
                {caregivers.map((caregiver) => (
                  <SelectItem key={caregiver.id} value={caregiver.id}>{caregiver.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <Input
                id="start_time"
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="end_time">End Time *</Label>
              <Input
                id="end_time"
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                required
              />
            </div>
          </div>

          {shift && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any special instructions or notes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={saving} 
              className="bg-teal-600 hover:bg-teal-700"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {shift ? 'Update Shift' : 'Schedule Shift'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}