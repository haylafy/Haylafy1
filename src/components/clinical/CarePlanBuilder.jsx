import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Save, CheckCircle, Clock, Archive, Edit, Eye, FileText } from 'lucide-react';
import { format } from 'date-fns';
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const adlTasks = ['Bathing', 'Dressing', 'Grooming', 'Toileting', 'Eating', 'Mobility'];
const iadlTasks = ['Meal Preparation', 'Housekeeping', 'Laundry', 'Shopping', 'Medication Management', 'Transportation'];
const frequencies = ['Daily', 'Weekly', 'Bi-weekly', 'Monthly', 'As Needed'];

export default function CarePlanBuilder() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    adl_tasks: [],
    iadl_tasks: [],
    medication_reminders: [],
    homemaking_tasks: [],
    mobility_plan: '',
    special_instructions: ''
  });

  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: carePlans = [] } = useQuery({
    queryKey: ['care-plans'],
    queryFn: () => base44.entities.CarePlan.list('-effective_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CarePlan.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['care-plans'] });
      toast.success('Care plan created');
      setDialogOpen(false);
      resetForm();
    }
  });

  const addTask = (type, task) => {
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], { task, frequency: 'Daily', priority: 'medium', instructions: '' }]
    }));
  };

  const removeTask = (type, index) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    const newErrors = {};
    
    if (!selectedClient) {
      newErrors.client = 'Please select a patient';
    }
    
    if (formData.adl_tasks.length === 0 && formData.iadl_tasks.length === 0) {
      newErrors.tasks = 'Please add at least one ADL or IADL task';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    const client = clients.find(c => c.id === selectedClient);
    createMutation.mutate({
      client_id: selectedClient,
      client_name: client?.name,
      status: 'pending_approval',
      version: 1,
      effective_date: format(new Date(), 'yyyy-MM-dd'),
      ...formData
    });
  };

  const resetForm = () => {
    setSelectedClient('');
    setErrors({});
    setFormData({
      adl_tasks: [],
      iadl_tasks: [],
      medication_reminders: [],
      homemaking_tasks: [],
      mobility_plan: '',
      special_instructions: ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900">Care Plans</h2>
        <Button onClick={() => setDialogOpen(true)} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Care Plan
        </Button>
      </div>

      {/* Care Plan List */}
      <div className="space-y-3">
        {carePlans.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No care plans yet</h3>
            <p className="text-slate-500">Create your first care plan to get started</p>
          </div>
        ) : (
          carePlans.map(plan => (
            <div key={plan.id} className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{plan.client_name}</h3>
                  <p className="text-sm text-slate-500">
                    Version {plan.version} 
                    {plan.effective_date && ` • Effective ${format(new Date(plan.effective_date), 'MMM d, yyyy')}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={cn(
                    plan.status === 'approved' ? 'bg-green-100 text-green-700' :
                    plan.status === 'pending_approval' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-700'
                  )}>
                    {plan.status === 'approved' ? <CheckCircle className="w-3 h-3 mr-1" /> :
                     plan.status === 'pending_approval' ? <Clock className="w-3 h-3 mr-1" /> :
                     <Archive className="w-3 h-3 mr-1" />}
                    {plan.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm mt-4">
                <div>
                  <p className="text-slate-500">ADL Tasks</p>
                  <p className="font-semibold text-slate-900">{plan.adl_tasks?.length || 0}</p>
                </div>
                <div>
                  <p className="text-slate-500">IADL Tasks</p>
                  <p className="font-semibold text-slate-900">{plan.iadl_tasks?.length || 0}</p>
                </div>
                <div>
                  <p className="text-slate-500">Medications</p>
                  <p className="font-semibold text-slate-900">{plan.medication_reminders?.length || 0}</p>
                </div>
              </div>

              {plan.special_instructions && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Special Instructions</p>
                  <p className="text-sm text-slate-700">{plan.special_instructions}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Care Plan</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <Label>Patient *</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className={errors.client ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.client && (
                <p className="text-xs text-red-600 mt-1">{errors.client}</p>
              )}
            </div>

            <div>
              <Label>ADL Tasks *</Label>
              {errors.tasks && (
                <p className="text-xs text-red-600 mt-1">{errors.tasks}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {adlTasks.map(task => (
                  <Button
                    key={task}
                    variant="outline"
                    size="sm"
                    onClick={() => addTask('adl_tasks', task)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {task}
                  </Button>
                ))}
              </div>
              {formData.adl_tasks.map((task, idx) => (
                <div key={idx} className="mt-2 p-3 bg-slate-50 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">{task.task}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeTask('adl_tasks', idx)}>×</Button>
                  </div>
                  <Input 
                    placeholder="Special instructions..."
                    value={task.instructions}
                    onChange={(e) => {
                      const updated = [...formData.adl_tasks];
                      updated[idx].instructions = e.target.value;
                      setFormData({...formData, adl_tasks: updated});
                    }}
                  />
                </div>
              ))}
            </div>

            <div>
              <Label>IADL Tasks</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {iadlTasks.map(task => (
                  <Button
                    key={task}
                    variant="outline"
                    size="sm"
                    onClick={() => addTask('iadl_tasks', task)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {task}
                  </Button>
                ))}
              </div>
              {formData.iadl_tasks.map((task, idx) => (
                <div key={idx} className="mt-2 p-3 bg-slate-50 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">{task.task}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeTask('iadl_tasks', idx)}>×</Button>
                  </div>
                  <Input 
                    placeholder="Special instructions..."
                    value={task.instructions}
                    onChange={(e) => {
                      const updated = [...formData.iadl_tasks];
                      updated[idx].instructions = e.target.value;
                      setFormData({...formData, iadl_tasks: updated});
                    }}
                  />
                </div>
              ))}
            </div>

            <div>
              <Label>Mobility/Transfer Plan</Label>
              <Textarea 
                value={formData.mobility_plan}
                onChange={(e) => setFormData({...formData, mobility_plan: e.target.value})}
                placeholder="Describe mobility assistance needs..."
              />
            </div>

            <div>
              <Label>Special Instructions</Label>
              <Textarea 
                value={formData.special_instructions}
                onChange={(e) => setFormData({...formData, special_instructions: e.target.value})}
                placeholder="Any special instructions or notes..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700">
                <Save className="w-4 h-4 mr-2" />
                Save Care Plan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}