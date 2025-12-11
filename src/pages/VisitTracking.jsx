import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  ClipboardCheck, 
  Plus, 
  Calendar, 
  Clock, 
  User, 
  FileText,
  CheckCircle,
  AlertCircle,
  Edit
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { cn } from "@/lib/utils";

const serviceOptions = [
  "Personal Care",
  "Bathing Assistance",
  "Medication Reminder",
  "Meal Preparation",
  "Light Housekeeping",
  "Companionship",
  "Transportation",
  "Mobility Assistance",
  "Other"
];

const signatureStatusConfig = {
  unsigned: { label: 'Unsigned', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  caregiver_signed: { label: 'Caregiver Signed', color: 'bg-amber-100 text-amber-700', icon: Clock },
  fully_signed: { label: 'Fully Signed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
};

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-600' },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700' },
  reviewed: { label: 'Reviewed', color: 'bg-green-100 text-green-700' },
};

export default function VisitTracking() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState(null);
  const [formData, setFormData] = useState({
    client_id: '',
    caregiver_id: '',
    visit_date: new Date().toISOString().split('T')[0],
    start_time: '',
    end_time: '',
    services_provided: [],
    notes: '',
    status: 'draft'
  });

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['visits'],
    queryFn: () => base44.entities.Visit.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: caregivers = [] } = useQuery({
    queryKey: ['caregivers'],
    queryFn: () => base44.entities.Caregiver.list(),
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => base44.entities.Business.list(),
  });

  const createVisitMutation = useMutation({
    mutationFn: async (visitData) => {
      const client = clients.find(c => c.id === visitData.client_id);
      const caregiver = caregivers.find(cg => cg.id === visitData.caregiver_id);
      const business = businesses.find(b => b.id === currentUser?.business_id);

      // Calculate duration
      let duration = 0;
      if (visitData.start_time && visitData.end_time) {
        const start = new Date(`${visitData.visit_date}T${visitData.start_time}`);
        const end = new Date(`${visitData.visit_date}T${visitData.end_time}`);
        duration = Math.round((end - start) / 60000);
      }

      return await base44.entities.Visit.create({
        ...visitData,
        business_id: currentUser?.business_id,
        business_name: business?.business_name,
        client_name: client?.name,
        caregiver_name: caregiver?.name,
        duration_minutes: duration,
        signature_status: 'unsigned'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      toast.success('Visit logged successfully');
      setFormOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to log visit');
      console.error(error);
    }
  });

  const updateVisitMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const client = clients.find(c => c.id === data.client_id);
      const caregiver = caregivers.find(cg => cg.id === data.caregiver_id);

      // Calculate duration
      let duration = 0;
      if (data.start_time && data.end_time) {
        const start = new Date(`${data.visit_date}T${data.start_time}`);
        const end = new Date(`${data.visit_date}T${data.end_time}`);
        duration = Math.round((end - start) / 60000);
      }

      return await base44.entities.Visit.update(id, {
        ...data,
        client_name: client?.name,
        caregiver_name: caregiver?.name,
        duration_minutes: duration
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      toast.success('Visit updated');
      setFormOpen(false);
      setEditingVisit(null);
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData({
      client_id: '',
      caregiver_id: '',
      visit_date: new Date().toISOString().split('T')[0],
      start_time: '',
      end_time: '',
      services_provided: [],
      notes: '',
      status: 'draft'
    });
  };

  const handleEdit = (visit) => {
    setEditingVisit(visit);
    setFormData({
      client_id: visit.client_id,
      caregiver_id: visit.caregiver_id,
      visit_date: visit.visit_date,
      start_time: visit.start_time?.split('T')[1]?.substring(0, 5) || '',
      end_time: visit.end_time?.split('T')[1]?.substring(0, 5) || '',
      services_provided: visit.services_provided || [],
      notes: visit.notes || '',
      status: visit.status
    });
    setFormOpen(true);
  };

  const handleSubmit = () => {
    if (editingVisit) {
      updateVisitMutation.mutate({ id: editingVisit.id, data: formData });
    } else {
      createVisitMutation.mutate(formData);
    }
  };

  const toggleService = (service) => {
    setFormData({
      ...formData,
      services_provided: formData.services_provided.includes(service)
        ? formData.services_provided.filter(s => s !== service)
        : [...formData.services_provided, service]
    });
  };

  // Filter visits by business
  const filteredVisits = visits.filter(v => v.business_id === currentUser?.business_id);

  // For caregivers, show only their visits
  const userVisits = currentUser?.user_role === 'caregiver'
    ? filteredVisits.filter(v => v.caregiver_id === currentUser?.caregiver_id)
    : filteredVisits;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Visit Tracking</h1>
          <p className="text-slate-500 mt-1">Log and review patient visits</p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />
          Log Visit
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Visits</p>
              <p className="text-2xl font-bold text-slate-900">{userVisits.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Fully Signed</p>
              <p className="text-2xl font-bold text-slate-900">
                {userVisits.filter(v => v.signature_status === 'fully_signed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending Review</p>
              <p className="text-2xl font-bold text-slate-900">
                {userVisits.filter(v => v.status === 'submitted').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">This Month</p>
              <p className="text-2xl font-bold text-slate-900">
                {userVisits.filter(v => {
                  const visitDate = new Date(v.visit_date);
                  const now = new Date();
                  return visitDate.getMonth() === now.getMonth() && 
                         visitDate.getFullYear() === now.getFullYear();
                }).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Visit List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : userVisits.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <ClipboardCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No visits logged</h3>
          <p className="text-slate-500 mb-6">Start tracking visits by logging your first one</p>
          <Button onClick={() => setFormOpen(true)} className="bg-teal-600 hover:bg-teal-700">
            <Plus className="w-4 h-4 mr-2" />
            Log Visit
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {userVisits.map((visit) => {
            const SignatureIcon = signatureStatusConfig[visit.signature_status]?.icon || AlertCircle;
            return (
              <div key={visit.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-semibold">
                      {visit.client_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{visit.client_name}</h3>
                      <p className="text-sm text-slate-600">by {visit.caregiver_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn(signatureStatusConfig[visit.signature_status]?.color)}>
                      <SignatureIcon className="w-3 h-3 mr-1" />
                      {signatureStatusConfig[visit.signature_status]?.label}
                    </Badge>
                    <Badge className={cn(statusConfig[visit.status]?.color)}>
                      {statusConfig[visit.status]?.label}
                    </Badge>
                    {(currentUser?.user_role === 'caregiver' || currentUser?.role === 'admin') && (
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(visit)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {format(new Date(visit.visit_date), 'MMM d, yyyy')}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {visit.start_time && format(new Date(visit.start_time), 'h:mm a')}
                    {visit.end_time && ` - ${format(new Date(visit.end_time), 'h:mm a')}`}
                  </div>
                  {visit.duration_minutes > 0 && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {visit.duration_minutes} mins
                    </div>
                  )}
                </div>

                {visit.services_provided?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-slate-500 mb-2">Services Provided:</p>
                    <div className="flex flex-wrap gap-2">
                      {visit.services_provided.map((service, idx) => (
                        <Badge key={idx} variant="secondary" className="bg-slate-100 text-slate-700">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {visit.notes && (
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-sm text-slate-600">{visit.notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Visit Form Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => {
        setFormOpen(open);
        if (!open) {
          setEditingVisit(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVisit ? 'Edit Visit' : 'Log New Visit'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client *</Label>
                <Select 
                  value={formData.client_id}
                  onValueChange={(val) => setFormData({...formData, client_id: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.filter(c => c.status === 'active').map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Caregiver *</Label>
                <Select 
                  value={formData.caregiver_id}
                  onValueChange={(val) => setFormData({...formData, caregiver_id: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select caregiver" />
                  </SelectTrigger>
                  <SelectContent>
                    {caregivers.filter(cg => cg.status === 'active').map(caregiver => (
                      <SelectItem key={caregiver.id} value={caregiver.id}>
                        {caregiver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Visit Date *</Label>
                <Input 
                  type="date"
                  value={formData.visit_date}
                  onChange={(e) => setFormData({...formData, visit_date: e.target.value})}
                />
              </div>

              <div>
                <Label>Start Time</Label>
                <Input 
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                />
              </div>

              <div>
                <Label>End Time</Label>
                <Input 
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label>Services Provided</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {serviceOptions.map(service => (
                  <label key={service} className="flex items-center gap-2 p-2 rounded border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={formData.services_provided.includes(service)}
                      onChange={() => toggleService(service)}
                      className="rounded"
                    />
                    <span className="text-sm">{service}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea 
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={4}
                placeholder="Document observations, tasks completed, concerns..."
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select 
                value={formData.status}
                onValueChange={(val) => setFormData({...formData, status: val})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submit for Review</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setFormOpen(false);
                  setEditingVisit(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!formData.client_id || !formData.caregiver_id || !formData.visit_date || 
                          createVisitMutation.isPending || updateVisitMutation.isPending}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {(createVisitMutation.isPending || updateVisitMutation.isPending) ? 'Saving...' : 'Save Visit'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}