import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { UserPlus, Phone, Mail, Calendar, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { format } from 'date-fns';
import { cn } from "@/lib/utils";

const statusConfig = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-700' },
  contacted: { label: 'Contacted', color: 'bg-purple-100 text-purple-700' },
  scheduled: { label: 'Scheduled', color: 'bg-amber-100 text-amber-700' },
  converted: { label: 'Converted', color: 'bg-green-100 text-green-700' },
  declined: { label: 'Declined', color: 'bg-slate-100 text-slate-600' },
};

const priorityConfig = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export default function Referrals() {
  const urlParams = new URLSearchParams(window.location.search);
  const filterParam = urlParams.get('filter');
  
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    patient_name: '',
    referral_source: '',
    contact_phone: '',
    contact_email: '',
    service_needed: '',
    status: 'new',
    priority: 'medium',
    notes: '',
    referral_date: new Date().toISOString().split('T')[0],
  });

  const queryClient = useQueryClient();

  const { data: referrals = [] } = useQuery({
    queryKey: ['referrals'],
    queryFn: () => base44.entities.Referral.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Referral.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      setFormOpen(false);
      setFormData({
        patient_name: '',
        referral_source: '',
        contact_phone: '',
        contact_email: '',
        service_needed: '',
        status: 'new',
        priority: 'medium',
        notes: '',
        referral_date: new Date().toISOString().split('T')[0],
      });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const outstandingReferrals = referrals.filter(r => 
    r.status === 'new' || r.status === 'contacted' || r.status === 'scheduled'
  );

  const displayedReferrals = filterParam === 'outstanding' ? outstandingReferrals : referrals;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
            {filterParam === 'outstanding' ? 'Outstanding Referrals' : 'Referrals'}
          </h1>
          <p className="text-slate-500 mt-1">Manage patient referrals and conversions</p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="bg-teal-600 hover:bg-teal-700">
          <UserPlus className="w-4 h-4 mr-2" />
          Add Referral
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Referrals</p>
              <p className="text-2xl font-bold text-slate-900">{referrals.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Outstanding</p>
              <p className="text-2xl font-bold text-slate-900">{outstandingReferrals.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Converted</p>
              <p className="text-2xl font-bold text-slate-900">
                {referrals.filter(r => r.status === 'converted').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Urgent</p>
              <p className="text-2xl font-bold text-slate-900">
                {referrals.filter(r => r.priority === 'urgent').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {displayedReferrals.map((referral) => (
          <div key={referral.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-slate-900 text-lg">{referral.patient_name}</h3>
                <p className="text-sm text-slate-600">from {referral.referral_source}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={cn(priorityConfig[referral.priority])}>
                  {referral.priority}
                </Badge>
                <Badge className={cn(statusConfig[referral.status]?.color)}>
                  {statusConfig[referral.status]?.label}
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {referral.contact_phone && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4" />
                  <span>{referral.contact_phone}</span>
                </div>
              )}
              {referral.contact_email && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-4 h-4" />
                  <span>{referral.contact_email}</span>
                </div>
              )}
              {referral.referral_date && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4" />
                  <span>{format(new Date(referral.referral_date), 'MMM d, yyyy')}</span>
                </div>
              )}
              {referral.service_needed && (
                <div className="text-slate-600">
                  Service: {referral.service_needed}
                </div>
              )}
            </div>
            
            {referral.notes && (
              <p className="text-sm text-slate-600 mt-3 pt-3 border-t">{referral.notes}</p>
            )}
          </div>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Referral</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patient_name">Patient Name *</Label>
                <Input
                  id="patient_name"
                  value={formData.patient_name}
                  onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="referral_source">Referral Source *</Label>
                <Input
                  id="referral_source"
                  value={formData.referral_source}
                  onChange={(e) => setFormData({ ...formData, referral_source: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Phone</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="service_needed">Service Needed</Label>
                <Input
                  id="service_needed"
                  value={formData.service_needed}
                  onChange={(e) => setFormData({ ...formData, service_needed: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="referral_date">Referral Date</Label>
                <Input
                  id="referral_date"
                  type="date"
                  value={formData.referral_date}
                  onChange={(e) => setFormData({ ...formData, referral_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700">
                Add Referral
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}