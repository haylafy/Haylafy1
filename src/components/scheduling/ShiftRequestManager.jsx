import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Clock, Calendar, ArrowRightLeft, Check, X } from 'lucide-react';
import { format } from 'date-fns';

const statusColors = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  denied: 'bg-red-100 text-red-700',
};

export default function ShiftRequestManager({ open, onOpenChange, caregiverId }) {
  const [requestType, setRequestType] = useState('time_off');
  const [formData, setFormData] = useState({
    shift_id: '',
    swap_with_caregiver_id: '',
    time_off_start: '',
    time_off_end: '',
    reason: ''
  });

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['shift-requests', caregiverId || currentUser?.email],
    queryFn: () => base44.entities.ShiftRequest.list('-created_date'),
    select: (data) => caregiverId 
      ? data.filter(r => r.caregiver_id === caregiverId)
      : data
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list('-start_time'),
    enabled: requestType === 'swap'
  });

  const { data: caregivers = [] } = useQuery({
    queryKey: ['caregivers'],
    queryFn: () => base44.entities.Caregiver.list(),
    enabled: requestType === 'swap'
  });

  const createRequestMutation = useMutation({
    mutationFn: async (data) => {
      const caregiver = caregivers.find(c => c.id === (caregiverId || currentUser?.caregiver_id));
      return await base44.entities.ShiftRequest.create({
        ...data,
        caregiver_id: caregiverId || currentUser?.caregiver_id,
        caregiver_name: caregiver?.name || currentUser?.full_name,
        request_type: requestType,
        status: 'pending'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-requests'] });
      toast.success('Request submitted');
      resetForm();
    }
  });

  const updateRequestMutation = useMutation({
    mutationFn: ({ id, status, notes }) => 
      base44.entities.ShiftRequest.update(id, { 
        status, 
        review_notes: notes,
        reviewed_by: currentUser?.email 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-requests'] });
      toast.success('Request updated');
    }
  });

  const resetForm = () => {
    setFormData({
      shift_id: '',
      swap_with_caregiver_id: '',
      time_off_start: '',
      time_off_end: '',
      reason: ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createRequestMutation.mutate(formData);
  };

  const myShifts = shifts.filter(s => 
    s.caregiver_id === (caregiverId || currentUser?.caregiver_id) && 
    s.status === 'scheduled'
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Shift Requests</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="create" className="mt-4">
          <TabsList>
            <TabsTrigger value="create">New Request</TabsTrigger>
            <TabsTrigger value="view">My Requests</TabsTrigger>
            {currentUser?.role === 'admin' && (
              <TabsTrigger value="review">Review Requests</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="create" className="space-y-4">
            <div>
              <Label>Request Type</Label>
              <Select value={requestType} onValueChange={setRequestType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="time_off">Time Off</SelectItem>
                  <SelectItem value="swap">Shift Swap</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {requestType === 'swap' ? (
                <>
                  <div>
                    <Label>Shift to Swap *</Label>
                    <Select value={formData.shift_id} onValueChange={(v) => setFormData({...formData, shift_id: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select shift" />
                      </SelectTrigger>
                      <SelectContent>
                        {myShifts.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.client_name} - {format(new Date(s.start_time), 'MMM d, h:mm a')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Swap With (Optional)</Label>
                    <Select value={formData.swap_with_caregiver_id} onValueChange={(v) => setFormData({...formData, swap_with_caregiver_id: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select caregiver" />
                      </SelectTrigger>
                      <SelectContent>
                        {caregivers.filter(c => c.id !== caregiverId).map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date *</Label>
                    <Input 
                      type="date"
                      value={formData.time_off_start}
                      onChange={(e) => setFormData({...formData, time_off_start: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label>End Date *</Label>
                    <Input 
                      type="date"
                      value={formData.time_off_end}
                      onChange={(e) => setFormData({...formData, time_off_end: e.target.value})}
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <Label>Reason *</Label>
                <Textarea 
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  placeholder="Explain your request..."
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-teal-600 hover:bg-teal-700">
                  Submit Request
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="view" className="space-y-3">
            {requests.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No requests found
              </div>
            ) : (
              requests.map(req => (
                <div key={req.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {req.request_type === 'swap' ? <ArrowRightLeft className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                      <span className="font-medium capitalize">{req.request_type}</span>
                    </div>
                    <Badge className={statusColors[req.status]}>{req.status}</Badge>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{req.reason}</p>
                  {req.time_off_start && (
                    <p className="text-xs text-slate-500">
                      {format(new Date(req.time_off_start), 'MMM d')} - {format(new Date(req.time_off_end), 'MMM d, yyyy')}
                    </p>
                  )}
                  {req.review_notes && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs text-slate-500">Review: {req.review_notes}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          {currentUser?.role === 'admin' && (
            <TabsContent value="review" className="space-y-3">
              {requests.filter(r => r.status === 'pending').map(req => (
                <div key={req.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{req.caregiver_name}</h4>
                      <Badge className="mt-1">{req.request_type}</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">{req.reason}</p>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => updateRequestMutation.mutate({ id: req.id, status: 'approved', notes: 'Approved' })}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => updateRequestMutation.mutate({ id: req.id, status: 'denied', notes: 'Denied' })}
                      className="text-red-600"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Deny
                    </Button>
                  </div>
                </div>
              ))}
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}