import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Building2, User, Settings, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 1, title: 'Business Info', icon: Building2 },
  { id: 2, title: 'Admin User', icon: User },
  { id: 3, title: 'Settings', icon: Settings },
];

export default function TenantOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [completedTenant, setCompletedTenant] = useState(null);

  const [formData, setFormData] = useState({
    // Business Info
    business_name: '',
    address: '',
    phone: '',
    email: '',
    license_number: '',
    tax_id: '',
    
    // Admin User
    admin_name: '',
    admin_email: '',
    admin_phone: '',
    
    // Settings
    billing_plan: 'trial',
    max_users: 10,
    max_patients: 50,
    timezone: 'America/Chicago',
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = () => {
    if (currentStep === 1) {
      if (!formData.business_name || !formData.email || !formData.phone) {
        toast.error('Please fill in all required business fields');
        return false;
      }
    }
    if (currentStep === 2) {
      if (!formData.admin_name || !formData.admin_email) {
        toast.error('Please fill in admin user information');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    
    setSubmitting(true);
    
    try {
      // Step 1: Create Business
      const business = await base44.entities.Business.create({
        business_name: formData.business_name,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        license_number: formData.license_number,
        tax_id: formData.tax_id,
        billing_plan: formData.billing_plan,
        max_users: formData.max_users,
        max_patients: formData.max_patients,
        status: 'active',
        owner_email: formData.admin_email,
        settings: {
          timezone: formData.timezone,
          evv_enabled: true,
          billing_enabled: true,
        },
        enabled_features: {
          patient_onboarding: true,
          scheduling: true,
          visit_tracking: true,
          clinical_documentation: true,
          evv: true,
          billing_automation: true,
          claims_management: true,
          reports: true,
          hr_onboarding: true,
        }
      });

      // Step 2: Create Admin User Invitation
      await base44.entities.UserInvitation.create({
        email: formData.admin_email,
        full_name: formData.admin_name,
        phone: formData.admin_phone,
        business_id: business.id,
        business_name: formData.business_name,
        user_role: 'business_admin',
        status: 'pending',
        invited_by: 'system',
        permissions: {
          full_access: true,
        }
      });

      // Step 3: Create Company Settings
      await base44.entities.CompanySetting.create({
        company_name: formData.business_name,
        company_email: formData.email,
        company_phone: formData.phone,
        company_address: formData.address,
        timezone: formData.timezone,
        default_shift_duration: 8,
        billing_rates: {
          standard_rate: 25,
          weekend_rate: 30,
          overnight_rate: 35,
        },
        notification_settings: {
          shift_reminders: true,
          payment_reminders: true,
          email_notifications: true,
        },
        onboarding_checklist: [
          'Background Check',
          'I-9 Form',
          'Driver\'s License',
          'CPR Certification',
          'HIPAA Training',
          'Orientation',
        ]
      });

      setCompletedTenant(business);
      toast.success('Agency onboarded successfully!');
      
    } catch (error) {
      console.error('Onboarding error:', error);
      toast.error(error.message || 'Failed to complete onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  if (completedTenant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to Haylafy!</h2>
          <p className="text-slate-600 mb-6">
            {completedTenant.business_name} has been successfully onboarded.
          </p>
          <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-slate-600 mb-2">
              <strong>Next Steps:</strong>
            </p>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• Admin invitation sent to {formData.admin_email}</li>
              <li>• Check email to set up admin account</li>
              <li>• Start adding patients and caregivers</li>
              <li>• Configure billing rates and settings</li>
            </ul>
          </div>
          <Button 
            onClick={() => window.location.reload()}
            className="bg-teal-600 hover:bg-teal-700"
          >
            Onboard Another Agency
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-6 h-6 text-teal-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">New Agency Onboarding</h1>
          <p className="text-slate-500">Set up a new home care agency in minutes</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between mb-8">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex-1">
              <div className="flex items-center">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                  currentStep >= step.id 
                    ? "bg-teal-600 text-white" 
                    : "bg-slate-200 text-slate-500"
                )}>
                  <step.icon className="w-5 h-5" />
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={cn(
                    "flex-1 h-1 mx-2 transition-colors",
                    currentStep > step.id ? "bg-teal-600" : "bg-slate-200"
                  )} />
                )}
              </div>
              <p className="text-xs text-slate-600 mt-2">{step.title}</p>
            </div>
          ))}
        </div>

        {/* Step 1: Business Info */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Business Information</h2>
            
            <div>
              <Label>Business Name *</Label>
              <Input
                value={formData.business_name}
                onChange={(e) => handleChange('business_name', e.target.value)}
                placeholder="Acme Home Care Services"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="contact@acme.com"
                />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div>
              <Label>Address</Label>
              <Textarea
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="123 Main St, City, State 12345"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>License Number</Label>
                <Input
                  value={formData.license_number}
                  onChange={(e) => handleChange('license_number', e.target.value)}
                  placeholder="LIC-123456"
                />
              </div>
              <div>
                <Label>Tax ID / EIN</Label>
                <Input
                  value={formData.tax_id}
                  onChange={(e) => handleChange('tax_id', e.target.value)}
                  placeholder="12-3456789"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Admin User */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Administrator Account</h2>
            
            <div>
              <Label>Full Name *</Label>
              <Input
                value={formData.admin_name}
                onChange={(e) => handleChange('admin_name', e.target.value)}
                placeholder="John Smith"
              />
            </div>

            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.admin_email}
                onChange={(e) => handleChange('admin_email', e.target.value)}
                placeholder="john@acme.com"
              />
              <p className="text-xs text-slate-500 mt-1">
                An invitation will be sent to this email
              </p>
            </div>

            <div>
              <Label>Phone</Label>
              <Input
                value={formData.admin_phone}
                onChange={(e) => handleChange('admin_phone', e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        )}

        {/* Step 3: Settings */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Initial Settings</h2>
            
            <div>
              <Label>Billing Plan</Label>
              <Select value={formData.billing_plan} onValueChange={(v) => handleChange('billing_plan', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial (Free for 30 days)</SelectItem>
                  <SelectItem value="starter">Starter ($99/month)</SelectItem>
                  <SelectItem value="professional">Professional ($299/month)</SelectItem>
                  <SelectItem value="enterprise">Enterprise (Custom)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Max Users</Label>
                <Input
                  type="number"
                  value={formData.max_users}
                  onChange={(e) => handleChange('max_users', parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label>Max Patients</Label>
                <Input
                  type="number"
                  value={formData.max_patients}
                  onChange={(e) => handleChange('max_patients', parseInt(e.target.value))}
                />
              </div>
            </div>

            <div>
              <Label>Timezone</Label>
              <Select value={formData.timezone} onValueChange={(v) => handleChange('timezone', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">Eastern Time</SelectItem>
                  <SelectItem value="America/Chicago">Central Time</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm font-medium text-slate-900 mb-2">Included Features:</p>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>✓ Patient & Caregiver Management</li>
                <li>✓ Shift Scheduling & EVV</li>
                <li>✓ Clinical Documentation</li>
                <li>✓ Billing & Claims</li>
                <li>✓ Reports & Analytics</li>
              </ul>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(prev => prev - 1)}
            disabled={currentStep === 1 || submitting}
          >
            Back
          </Button>
          
          {currentStep < 3 ? (
            <Button 
              onClick={handleNext}
              className="bg-teal-600 hover:bg-teal-700"
            >
              Next
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Complete Onboarding
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}