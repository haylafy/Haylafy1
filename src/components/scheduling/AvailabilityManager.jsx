import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Plus, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

export default function AvailabilityManager({ caregiver, open, onOpenChange }) {
  const [availability, setAvailability] = useState([]);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    if (caregiver?.availability) {
      setAvailability(caregiver.availability);
    } else {
      setAvailability([]);
    }
  }, [caregiver]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Caregiver.update(caregiver.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caregivers'] });
      toast.success('Availability updated successfully');
      onOpenChange(false);
    },
  });

  const addTimeSlot = () => {
    setAvailability([
      ...availability,
      { day: 'Monday', start_time: '09:00', end_time: '17:00' }
    ]);
  };

  const removeTimeSlot = (index) => {
    setAvailability(availability.filter((_, i) => i !== index));
  };

  const updateTimeSlot = (index, field, value) => {
    const updated = [...availability];
    updated[index] = { ...updated[index], [field]: value };
    setAvailability(updated);
  };

  const handleSave = () => {
    updateMutation.mutate({ ...caregiver, availability });
  };

  if (!caregiver) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-600" />
            Availability Preferences - {caregiver.name}
          </DialogTitle>
          <p className="text-sm text-slate-500">
            Set preferred working hours to optimize scheduling
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {availability.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
              <Clock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600 mb-4">No availability preferences set</p>
              <Button onClick={addTimeSlot} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Time Slot
              </Button>
            </div>
          ) : (
            <>
              {availability.map((slot, index) => (
                <div key={index} className="flex gap-3 items-end">
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Day</Label>
                      <Select
                        value={slot.day}
                        onValueChange={(value) => updateTimeSlot(index, 'day', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS.map(day => (
                            <SelectItem key={day} value={day}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Start Time</Label>
                      <Select
                        value={slot.start_time}
                        onValueChange={(value) => updateTimeSlot(index, 'start_time', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_SLOTS.map(time => (
                            <SelectItem key={time} value={time}>{time}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">End Time</Label>
                      <Select
                        value={slot.end_time}
                        onValueChange={(value) => updateTimeSlot(index, 'end_time', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_SLOTS.map(time => (
                            <SelectItem key={time} value={time}>{time}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTimeSlot(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              <Button onClick={addTimeSlot} variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Another Time Slot
              </Button>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Availability'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}