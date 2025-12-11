import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, Plus } from 'lucide-react';
import { toast } from "sonner";

const SKILLS_OPTIONS = [
  'Personal Care',
  'Medication Management',
  'Meal Preparation',
  'Light Housekeeping',
  'Companionship',
  'Transportation',
  'Dementia Care',
  'Mobility Assistance',
  'First Aid Certified',
  'CPR Certified',
];

// Default onboarding tasks to create for new caregivers
const DEFAULT_ONBOARDING_TASKS = [
  {
    task_type: 'document',
    task_name: 'Submit Background Check Authorization',
    description: 'Sign and submit background check authorization form',
    due_days: 3,
  },
  {
    task_type: 'document',
    task_name: 'Complete I-9 Form',
    description: 'Complete employment eligibility verification',
    due_days: 3,
  },
  {
    task_type: 'document',
    task_name: 'Submit Copy of Driver\'s License',
    description: 'Provide valid driver\'s license or state ID',
    due_days: 5,
  },
  {
    task_type: 'document',
    task_name: 'Provide Proof of CPR Certification',
    description: 'Submit current CPR certification documentation',
    due_days: 7,
  },
  {
    task_type: 'training',
    task_name: 'Complete HIPAA Training',
    description: 'Complete online HIPAA privacy and security training',
    due_days: 14,
  },
  {
    task_type: 'training',
    task_name: 'Infection Control Training',
    description: 'Complete infection control and prevention training',
    due_days: 14,
  },
  {
    task_type: 'orientation',
    task_name: 'Attend New Hire Orientation',
    description: 'Complete general orientation session',
    due_days: 7,
  },
  {
    task_type: 'orientation',
    task_name: 'Shadow Experienced Caregiver',
    description: 'Complete shadowing shift with senior caregiver',
    due_days: 10,
  },
  {
    task_type: 'compliance',
    task_name: 'Complete Mandatory Reporter Training',
    description: 'Complete state-required mandatory reporter training',
    due_days: 14,
  },
  {
    task_type: 'equipment',
    task_name: 'Pick Up ID Badge and Uniform',
    description: 'Collect employee badge and uniform items',
    due_days: 5,
  },
];

export default function CaregiverForm({ caregiver, open, onOpenChange, onSave }) {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState(caregiver || {
    name: '',
    phone: '',
    email: '',
    address: '',
    skills: [],
    hourly_rate: '',
    status: 'active',
    hire_date: new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);
  const [newSkill, setNewSkill] = useState('');

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  React.useEffect(() => {
    if (caregiver) {
      setFormData(caregiver);
    }
  }, [caregiver]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addSkill = (skill) => {
    if (skill && !formData.skills?.includes(skill)) {
      handleChange('skills', [...(formData.skills || []), skill]);
    }
    setNewSkill('');
  };

  const removeSkill = (skill) => {
    handleChange('skills', formData.skills?.filter(s => s !== skill) || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user?.business_id) {
      toast.error('Unable to load user information. Please refresh and try again.');
      return;
    }
    
    setSaving(true);
    
    try {
      const data = {
        ...formData,
        business_id: user.business_id,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
      };
      
      let newCaregiver;
      if (caregiver?.id) {
        await base44.entities.Caregiver.update(caregiver.id, data);
        toast.success('Caregiver updated successfully');
      } else {
        newCaregiver = await base44.entities.Caregiver.create(data);
        
        // Auto-create onboarding tasks for new caregivers
        const hireDate = new Date(formData.hire_date || new Date());
        const tasks = DEFAULT_ONBOARDING_TASKS.map(task => ({
          caregiver_id: newCaregiver.id,
          caregiver_name: formData.name,
          task_type: task.task_type,
          task_name: task.task_name,
          description: task.description,
          status: 'pending',
          due_date: new Date(hireDate.getTime() + task.due_days * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          assigned_to: user.full_name || 'HR Manager',
        }));
        
        // Create all onboarding tasks
        await Promise.all(
          tasks.map(task => base44.entities.OnboardingTask.create(task))
        );
        
        toast.success(`Caregiver added successfully with ${tasks.length} onboarding tasks created`);
      }
      
      setSaving(false);
      onSave();
      onOpenChange(false);
    } catch (error) {
      setSaving(false);
      console.error('Error saving caregiver:', error);
      toast.error(error.message || 'Failed to save caregiver. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{caregiver ? 'Edit Caregiver' : 'Add New Caregiver'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Jane Smith"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="(555) 123-4567"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="jane@example.com"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
              <Input
                id="hourly_rate"
                type="number"
                step="0.01"
                value={formData.hourly_rate}
                onChange={(e) => handleChange('hourly_rate', e.target.value)}
                placeholder="25.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="hire_date">Hire Date</Label>
              <Input
                id="hire_date"
                type="date"
                value={formData.hire_date}
                onChange={(e) => handleChange('hire_date', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="123 Main St, City, State 12345"
              rows={2}
            />
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium text-slate-900 mb-4">Skills & Certifications</h4>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {formData.skills?.map((skill) => (
                <Badge 
                  key={skill} 
                  variant="secondary"
                  className="bg-teal-100 text-teal-700 pl-3 pr-1 py-1.5"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="ml-1 hover:bg-teal-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Select value={newSkill} onValueChange={addSkill}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Add a skill..." />
                </SelectTrigger>
                <SelectContent>
                  {SKILLS_OPTIONS.filter(s => !formData.skills?.includes(s)).map((skill) => (
                    <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {caregiver ? 'Update Caregiver' : 'Add Caregiver'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}