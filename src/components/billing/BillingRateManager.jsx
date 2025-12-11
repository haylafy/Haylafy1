import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";

export default function BillingRateManager() {
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    service_type: '',
    client_id: '',
    payer_name: '',
    billing_code: '',
    rate_per_unit: '',
    unit_type: 'hourly',
    effective_date: new Date().toISOString().split('T')[0],
    active: true
  });

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: rates = [] } = useQuery({
    queryKey: ['billing-rates'],
    queryFn: () => base44.entities.BillingRate.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => base44.entities.Business.list(),
  });

  const createRateMutation = useMutation({
    mutationFn: async (rateData) => {
      const business = businesses.find(b => b.id === currentUser?.business_id);
      const client = rateData.client_id ? clients.find(c => c.id === rateData.client_id) : null;
      
      return await base44.entities.BillingRate.create({
        ...rateData,
        business_id: currentUser?.business_id,
        business_name: business?.business_name,
        client_name: client?.name || null,
        rate_per_unit: parseFloat(rateData.rate_per_unit)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-rates'] });
      toast.success('Billing rate created');
      setFormOpen(false);
      resetForm();
    }
  });

  const deleteRateMutation = useMutation({
    mutationFn: (id) => base44.entities.BillingRate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-rates'] });
      toast.success('Billing rate deleted');
    }
  });

  const resetForm = () => {
    setFormData({
      service_type: '',
      client_id: '',
      payer_name: '',
      billing_code: '',
      rate_per_unit: '',
      unit_type: 'hourly',
      effective_date: new Date().toISOString().split('T')[0],
      active: true
    });
  };

  const businessRates = rates.filter(r => r.business_id === currentUser?.business_id);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900">Billing Rates</h2>
        <Button onClick={() => setFormOpen(true)} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Rate
        </Button>
      </div>

      <div className="space-y-3">
        {businessRates.map((rate) => (
          <div key={rate.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">{rate.service_type}</h3>
                {rate.client_name && (
                  <p className="text-sm text-slate-600">Client: {rate.client_name}</p>
                )}
                {rate.payer_name && (
                  <p className="text-sm text-slate-600">Payer: {rate.payer_name}</p>
                )}
                <p className="text-sm text-slate-600">Code: {rate.billing_code}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-xl font-bold text-teal-600">
                    ${rate.rate_per_unit}
                  </p>
                  <p className="text-xs text-slate-500">per {rate.unit_type}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteRateMutation.mutate(rate.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Billing Rate</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Service Type *</Label>
              <Input
                value={formData.service_type}
                onChange={(e) => setFormData({...formData, service_type: e.target.value})}
                placeholder="e.g., Personal Care, Companionship"
              />
            </div>

            <div>
              <Label>Client (Optional - for client-specific rates)</Label>
              <Select
                value={formData.client_id}
                onValueChange={(val) => setFormData({...formData, client_id: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All clients (default rate)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All clients (default)</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Payer Name</Label>
                <Input
                  value={formData.payer_name}
                  onChange={(e) => setFormData({...formData, payer_name: e.target.value})}
                  placeholder="Insurance name"
                />
              </div>

              <div>
                <Label>Billing Code *</Label>
                <Input
                  value={formData.billing_code}
                  onChange={(e) => setFormData({...formData, billing_code: e.target.value})}
                  placeholder="CPT/HCPCS code"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Rate Per Unit *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.rate_per_unit}
                  onChange={(e) => setFormData({...formData, rate_per_unit: e.target.value})}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label>Unit Type *</Label>
                <Select
                  value={formData.unit_type}
                  onValueChange={(val) => setFormData({...formData, unit_type: val})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="per_visit">Per Visit</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="15min">Per 15 Minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Effective Date</Label>
              <Input
                type="date"
                value={formData.effective_date}
                onChange={(e) => setFormData({...formData, effective_date: e.target.value})}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createRateMutation.mutate(formData)}
                disabled={!formData.service_type || !formData.billing_code || !formData.rate_per_unit}
                className="bg-teal-600 hover:bg-teal-700"
              >
                Add Rate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}