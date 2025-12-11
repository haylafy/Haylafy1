import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Edit, Users, Settings, Shield, CheckSquare, MoreVertical, Ban, Trash2 } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from 'date-fns';

export default function BusinessManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [businessToDelete, setBusinessToDelete] = useState(null);
  const [formData, setFormData] = useState({
    business_name: '',
    address: '',
    phone: '',
    email: '',
    license_number: '',
    owner_email: '',
    billing_plan: 'trial',
    enabled_features: {
      patient_onboarding: true,
      scheduling: true,
      visit_tracking: true,
      clinical_documentation: true,
      evv: true,
      billing_automation: true,
      claims_management: true,
      reports: true,
      hr_onboarding: true
    }
  });

  const queryClient = useQueryClient();

  const { data: businesses = [] } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => base44.entities.Business.list('-created_date'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Business.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      toast.success('Business created');
      setDialogOpen(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Business.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      toast.success('Business updated');
      setDialogOpen(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Business.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      toast.success('Business deleted');
      setDeleteDialogOpen(false);
      setBusinessToDelete(null);
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Business.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      toast.success('Business status updated');
    }
  });

  const handleSave = () => {
    if (editingBusiness) {
      updateMutation.mutate({ id: editingBusiness.id, data: formData });
    } else {
      createMutation.mutate({ ...formData, status: 'active' });
    }
  };

  const handleEdit = (business) => {
    setEditingBusiness(business);
    setFormData(business);
    setDialogOpen(true);
  };

  const handleDeactivate = (business) => {
    const newStatus = business.status === 'active' ? 'inactive' : 'active';
    toggleStatusMutation.mutate({ id: business.id, status: newStatus });
  };

  const handleDelete = (business) => {
    setBusinessToDelete(business);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (businessToDelete) {
      deleteMutation.mutate(businessToDelete.id);
    }
  };

  const resetForm = () => {
    setEditingBusiness(null);
    setFormData({
      business_name: '',
      address: '',
      phone: '',
      email: '',
      license_number: '',
      owner_email: '',
      billing_plan: 'trial',
      enabled_features: {
        patient_onboarding: true,
        scheduling: true,
        visit_tracking: true,
        clinical_documentation: true,
        evv: true,
        billing_automation: true,
        claims_management: true,
        reports: true,
        hr_onboarding: true
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Business Management</h1>
          <p className="text-slate-500 mt-1">Manage multiple agencies and organizations</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Business
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <Building2 className="w-10 h-10 text-teal-600" />
            <div>
              <p className="text-2xl font-bold text-slate-900">{businesses.length}</p>
              <p className="text-sm text-slate-500">Total Businesses</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <Users className="w-10 h-10 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-slate-900">{users.length}</p>
              <p className="text-sm text-slate-500">Total Users</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <Shield className="w-10 h-10 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {businesses.filter(b => b.status === 'active').length}
              </p>
              <p className="text-sm text-slate-500">Active</p>
            </div>
          </div>
        </div>
      </div>

      {/* Business List */}
      <div className="space-y-3">
        {businesses.map(business => {
          const businessUsers = users.filter(u => u.business_id === business.id);
          return (
            <div key={business.id} className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white text-2xl font-bold">
                    {business.business_name?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{business.business_name}</h3>
                    <p className="text-sm text-slate-600">{business.email}</p>
                    {business.phone && <p className="text-sm text-slate-500">{business.phone}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={
                    business.status === 'active' ? 'bg-green-100 text-green-700' :
                    business.status === 'suspended' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }>
                    {business.status}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(business)}>
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDeactivate(business)}>
                        <Ban className="w-4 h-4 mr-2" />
                        {business.status === 'active' ? 'Deactivate' : 'Activate'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDelete(business)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Users</p>
                  <p className="font-semibold text-slate-900">{businessUsers.length} / {business.max_users}</p>
                </div>
                <div>
                  <p className="text-slate-500">Plan</p>
                  <p className="font-semibold text-slate-900 capitalize">{business.billing_plan}</p>
                </div>
                <div>
                  <p className="text-slate-500">License</p>
                  <p className="font-semibold text-slate-900">{business.license_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Owner</p>
                  <p className="font-semibold text-slate-900">{business.owner_email}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBusiness ? 'Edit Business' : 'Create New Business'}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="info" className="space-y-4">
            <TabsList>
              <TabsTrigger value="info">Basic Info</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4">
              <div>
                <Label>Business Name *</Label>
                <Input 
                  value={formData.business_name}
                  onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                  placeholder="Acme Home Care"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email *</Label>
                  <Input 
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label>Address</Label>
                <Textarea 
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>License Number</Label>
                  <Input 
                    value={formData.license_number}
                    onChange={(e) => setFormData({...formData, license_number: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Owner Email *</Label>
                  <Input 
                    type="email"
                    value={formData.owner_email}
                    onChange={(e) => setFormData({...formData, owner_email: e.target.value})}
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-3">Account Credentials</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Username</Label>
                    <Input 
                      value={formData.username || ''}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      placeholder="business_username"
                    />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input 
                      type="password"
                      value={formData.password || ''}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      placeholder="Enter password"
                    />
                  </div>
                </div>
                <p className="text-xs text-blue-700 mt-2">Set login credentials for this business to access their account</p>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <div>
                <Label>Billing Plan</Label>
                <Select 
                  value={formData.billing_plan} 
                  onValueChange={(val) => setFormData({...formData, billing_plan: val})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Max Users</Label>
                  <Input 
                    type="number"
                    value={formData.max_users}
                    onChange={(e) => setFormData({...formData, max_users: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Max Patients</Label>
                  <Input 
                    type="number"
                    value={formData.max_patients}
                    onChange={(e) => setFormData({...formData, max_patients: parseInt(e.target.value)})}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="features" className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckSquare className="w-5 h-5 text-teal-600" />
                  <h3 className="font-semibold text-slate-900">Feature Access Control</h3>
                </div>
                <p className="text-sm text-slate-600">Select which features this business can access</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-slate-50">
                  <Checkbox 
                    id="patient_onboarding"
                    checked={formData.enabled_features?.patient_onboarding !== false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      enabled_features: { ...formData.enabled_features, patient_onboarding: checked }
                    })}
                  />
                  <label htmlFor="patient_onboarding" className="text-sm font-medium leading-none cursor-pointer flex-1">
                    Patient Onboarding
                    <p className="text-xs text-slate-500 mt-1">Streamlined patient intake and enrollment</p>
                  </label>
                </div>

                <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-slate-50">
                  <Checkbox 
                    id="scheduling"
                    checked={formData.enabled_features?.scheduling !== false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      enabled_features: { ...formData.enabled_features, scheduling: checked }
                    })}
                  />
                  <label htmlFor="scheduling" className="text-sm font-medium leading-none cursor-pointer flex-1">
                    Scheduling & Calendar
                    <p className="text-xs text-slate-500 mt-1">Shift scheduling with smart optimization</p>
                  </label>
                </div>

                <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-slate-50">
                  <Checkbox 
                    id="visit_tracking"
                    checked={formData.enabled_features?.visit_tracking !== false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      enabled_features: { ...formData.enabled_features, visit_tracking: checked }
                    })}
                  />
                  <label htmlFor="visit_tracking" className="text-sm font-medium leading-none cursor-pointer flex-1">
                    Visit Tracking
                    <p className="text-xs text-slate-500 mt-1">Track and document patient visits</p>
                  </label>
                </div>

                <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-slate-50">
                  <Checkbox 
                    id="clinical_documentation"
                    checked={formData.enabled_features?.clinical_documentation !== false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      enabled_features: { ...formData.enabled_features, clinical_documentation: checked }
                    })}
                  />
                  <label htmlFor="clinical_documentation" className="text-sm font-medium leading-none cursor-pointer flex-1">
                    Clinical Documentation
                    <p className="text-xs text-slate-500 mt-1">Care plans, assessments, and documents</p>
                  </label>
                </div>

                <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-slate-50">
                  <Checkbox 
                    id="evv"
                    checked={formData.enabled_features?.evv !== false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      enabled_features: { ...formData.enabled_features, evv: checked }
                    })}
                  />
                  <label htmlFor="evv" className="text-sm font-medium leading-none cursor-pointer flex-1">
                    Electronic Visit Verification (EVV)
                    <p className="text-xs text-slate-500 mt-1">GPS and time-based visit verification</p>
                  </label>
                </div>

                <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-slate-50">
                  <Checkbox 
                    id="billing_automation"
                    checked={formData.enabled_features?.billing_automation !== false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      enabled_features: { ...formData.enabled_features, billing_automation: checked }
                    })}
                  />
                  <label htmlFor="billing_automation" className="text-sm font-medium leading-none cursor-pointer flex-1">
                    Billing Automation
                    <p className="text-xs text-slate-500 mt-1">Invoice generation and payment tracking</p>
                  </label>
                </div>

                <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-slate-50">
                  <Checkbox 
                    id="claims_management"
                    checked={formData.enabled_features?.claims_management !== false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      enabled_features: { ...formData.enabled_features, claims_management: checked }
                    })}
                  />
                  <label htmlFor="claims_management" className="text-sm font-medium leading-none cursor-pointer flex-1">
                    Claims Management
                    <p className="text-xs text-slate-500 mt-1">Insurance claims and 837P export</p>
                  </label>
                </div>

                <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-slate-50">
                  <Checkbox 
                    id="reports"
                    checked={formData.enabled_features?.reports !== false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      enabled_features: { ...formData.enabled_features, reports: checked }
                    })}
                  />
                  <label htmlFor="reports" className="text-sm font-medium leading-none cursor-pointer flex-1">
                    Reports & Analytics
                    <p className="text-xs text-slate-500 mt-1">Customizable reports and insights</p>
                  </label>
                </div>

                <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-slate-50">
                  <Checkbox 
                    id="hr_onboarding"
                    checked={formData.enabled_features?.hr_onboarding !== false}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      enabled_features: { ...formData.enabled_features, hr_onboarding: checked }
                    })}
                  />
                  <label htmlFor="hr_onboarding" className="text-sm font-medium leading-none cursor-pointer flex-1">
                    HR Onboarding
                    <p className="text-xs text-slate-500 mt-1">Employee onboarding and compliance tracking</p>
                  </label>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!formData.business_name || !formData.email}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {editingBusiness ? 'Update' : 'Create'} Business
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Business Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{businessToDelete?.business_name}</strong>? 
              This will permanently delete all associated data including users, clients, caregivers, 
              and records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Business
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
      );
      }