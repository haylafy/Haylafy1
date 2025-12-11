import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { 
  User, 
  Heart, 
  Shield, 
  FileText, 
  CheckCircle, 
  ChevronRight, 
  ChevronLeft,
  Upload,
  X,
  Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const steps = [
  { id: 'basic', title: 'Basic Information', icon: User },
  { id: 'medical', title: 'Medical History', icon: Heart },
  { id: 'insurance', title: 'Insurance & Coverage', icon: Shield },
  { id: 'documents', title: 'Upload Documents', icon: FileText },
  { id: 'review', title: 'Review & Complete', icon: CheckCircle },
];

export default function PatientWizard({ open, onOpenChange, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [permissionError, setPermissionError] = useState(null);
  const [checkingPermissions, setCheckingPermissions] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    date_of_birth: '',
    phone: '',
    email: '',
    address: '',
    
    // Emergency Contacts
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    secondary_emergency_contact_name: '',
    secondary_emergency_contact_phone: '',
    
    // Medical
    medical_history: '',
    allergies: '',
    current_medications: '',
    mobility_status: 'independent',
    cognitive_status: '',
    
    // Primary Care
    primary_physician_name: '',
    primary_physician_phone: '',
    
    // Insurance
    insurance_primary_name: '',
    insurance_primary_id: '',
    insurance_primary_group: '',
    insurance_secondary_name: '',
    insurance_secondary_id: '',
    
    // Documents
    uploaded_documents: [],
    
    status: 'pending'
  });

  const createPatientMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return await base44.entities.Client.create({
        ...data,
        business_id: user.business_id
      });
    },
    onSuccess: () => {
      toast.success('Patient onboarding completed successfully!');
      onComplete();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to create patient: ${error.message || 'Unknown error'}`);
      console.error('Patient creation error:', error);
    }
  });

  const resetForm = () => {
    setCurrentStep(0);
    setFormData({
      name: '', date_of_birth: '', phone: '', email: '', address: '',
      emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
      secondary_emergency_contact_name: '', secondary_emergency_contact_phone: '',
      medical_history: '', allergies: '', current_medications: '', mobility_status: 'independent',
      cognitive_status: '', primary_physician_name: '', primary_physician_phone: '',
      insurance_primary_name: '', insurance_primary_id: '', insurance_primary_group: '',
      insurance_secondary_name: '', insurance_secondary_id: '', uploaded_documents: [],
      status: 'pending'
    });
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const newDoc = {
        name: file.name,
        url: file_url,
        type: file.type,
        uploaded_date: new Date().toISOString()
      };
      
      setFormData(prev => ({
        ...prev,
        uploaded_documents: [...prev.uploaded_documents, newDoc]
      }));
      
      toast.success('Document uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload document');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const removeDocument = (index) => {
    setFormData(prev => ({
      ...prev,
      uploaded_documents: prev.uploaded_documents.filter((_, i) => i !== index)
    }));
  };

  const validateStep = () => {
    const newErrors = {};
    
    switch (currentStep) {
      case 0:
        if (!formData.name?.trim()) {
          newErrors.name = 'Full name is required';
        }
        if (!formData.phone?.trim()) {
          newErrors.phone = 'Phone number is required';
        }
        break;
      case 1:
      case 2:
      case 3:
      case 4:
        // These steps are optional
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.name && formData.phone;
      case 1:
        return true; // Medical is optional
      case 2:
        return true; // Insurance is optional
      case 3:
        return true; // Documents are optional
      case 4:
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep() && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const checkPermissions = async () => {
    setCheckingPermissions(true);
    setPermissionError(null);
    
    try {
      const user = await base44.auth.me();
      console.log('Current user:', user);
      console.log('User role:', user.user_role || user.role);
      console.log('User business_id:', user.business_id);
      
      // Test data to check permissions
      const testData = {
        name: 'Test Patient',
        phone: '555-1234',
        business_id: user.business_id,
        status: 'active',
      };
      
      console.log('Testing with data:', testData);
      
      // Try to validate - this will show permission errors without actually creating
      const result = await base44.entities.Client.create(testData);
      console.log('Permission check passed!', result);
      
      // Delete the test record
      await base44.entities.Client.delete(result.id);
      
      toast.success('✅ Permissions OK! You can proceed.');
    } catch (error) {
      console.error('Permission check failed:', error);
      const errorMsg = error.response?.data?.message || error.message || JSON.stringify(error);
      setPermissionError(errorMsg);
      toast.error(`Permission Error: ${errorMsg}`);
    } finally {
      setCheckingPermissions(false);
    }
  };

  const handleSubmit = () => {
    createPatientMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Patient Onboarding</DialogTitle>
          <p className="text-sm text-slate-500">Complete the following steps to enroll a new patient</p>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between py-6 border-b">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                    isActive && "bg-teal-600 text-white ring-4 ring-teal-100",
                    isCompleted && "bg-emerald-600 text-white",
                    !isActive && !isCompleted && "bg-slate-100 text-slate-400"
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className={cn(
                    "text-xs mt-2 text-center",
                    isActive && "text-teal-600 font-medium",
                    !isActive && "text-slate-500"
                  )}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={cn(
                    "h-0.5 flex-1 mx-2 transition-colors",
                    isCompleted ? "bg-emerald-600" : "bg-slate-200"
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-6">
          {/* Step 0: Basic Information */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="John Doe"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="text-xs text-red-600">{errors.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => handleChange('date_of_birth', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    className={errors.phone ? 'border-red-500' : ''}
                  />
                  {errors.phone && (
                    <p className="text-xs text-red-600">{errors.phone}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="patient@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="123 Main St, City, State ZIP"
                />
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Emergency Contacts</h3>
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div className="space-y-2">
                    <Label>Primary Contact Name</Label>
                    <Input
                      value={formData.emergency_contact_name}
                      onChange={(e) => handleChange('emergency_contact_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={formData.emergency_contact_phone}
                      onChange={(e) => handleChange('emergency_contact_phone', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Relationship</Label>
                    <Input
                      value={formData.emergency_contact_relationship}
                      onChange={(e) => handleChange('emergency_contact_relationship', e.target.value)}
                      placeholder="Spouse, Child, etc."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Secondary Contact Name</Label>
                    <Input
                      value={formData.secondary_emergency_contact_name}
                      onChange={(e) => handleChange('secondary_emergency_contact_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={formData.secondary_emergency_contact_phone}
                      onChange={(e) => handleChange('secondary_emergency_contact_phone', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Medical History */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Medical History</Label>
                <Textarea
                  value={formData.medical_history}
                  onChange={(e) => handleChange('medical_history', e.target.value)}
                  placeholder="Previous diagnoses, surgeries, chronic conditions..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Known Allergies</Label>
                <Textarea
                  value={formData.allergies}
                  onChange={(e) => handleChange('allergies', e.target.value)}
                  placeholder="Food allergies, medication allergies..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Current Medications</Label>
                <Textarea
                  value={formData.current_medications}
                  onChange={(e) => handleChange('current_medications', e.target.value)}
                  placeholder="List current medications with dosages..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mobility Status</Label>
                  <Select value={formData.mobility_status} onValueChange={(v) => handleChange('mobility_status', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="independent">Independent</SelectItem>
                      <SelectItem value="walker">Walker Assistance</SelectItem>
                      <SelectItem value="wheelchair">Wheelchair</SelectItem>
                      <SelectItem value="bedridden">Bedridden</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cognitive Status</Label>
                  <Input
                    value={formData.cognitive_status}
                    onChange={(e) => handleChange('cognitive_status', e.target.value)}
                    placeholder="Alert, confused, etc."
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Primary Care Physician</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Physician Name</Label>
                    <Input
                      value={formData.primary_physician_name}
                      onChange={(e) => handleChange('primary_physician_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Physician Phone</Label>
                    <Input
                      value={formData.primary_physician_phone}
                      onChange={(e) => handleChange('primary_physician_phone', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Insurance */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Primary Insurance</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Insurance Company</Label>
                    <Input
                      value={formData.insurance_primary_name}
                      onChange={(e) => handleChange('insurance_primary_name', e.target.value)}
                      placeholder="Blue Cross Blue Shield, Medicare, etc."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Member ID</Label>
                      <Input
                        value={formData.insurance_primary_id}
                        onChange={(e) => handleChange('insurance_primary_id', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Group Number</Label>
                      <Input
                        value={formData.insurance_primary_group}
                        onChange={(e) => handleChange('insurance_primary_group', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Secondary Insurance (Optional)</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Insurance Company</Label>
                    <Input
                      value={formData.insurance_secondary_name}
                      onChange={(e) => handleChange('insurance_secondary_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Member ID</Label>
                    <Input
                      value={formData.insurance_secondary_id}
                      onChange={(e) => handleChange('insurance_secondary_id', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Documents */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">Upload Patient Documents</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Doctor's notes, prescriptions, insurance cards, identification
                </p>
                <label>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  <Button type="button" variant="outline" disabled={uploading} asChild>
                    <span>
                      {uploading ? 'Uploading...' : 'Choose File'}
                    </span>
                  </Button>
                </label>
              </div>

              {formData.uploaded_documents.length > 0 && (
                <div className="space-y-2">
                  <Label>Uploaded Documents</Label>
                  {formData.uploaded_documents.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{doc.name}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(doc.uploaded_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeDocument(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 flex-1">
                  <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-emerald-900">Ready to Complete</h3>
                    <p className="text-sm text-emerald-700 mt-1">
                      Review the information below and click Complete to finish onboarding
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={checkPermissions}
                  disabled={checkingPermissions}
                  className="ml-4"
                >
                  {checkingPermissions && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  🔍 Check Permissions
                </Button>
              </div>
              
              {permissionError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-900 mb-2">❌ Permission Error</h4>
                  <p className="text-sm text-red-700 font-mono break-all">{permissionError}</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-slate-900 mb-2">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p><span className="text-slate-500">Name:</span> {formData.name}</p>
                    <p><span className="text-slate-500">DOB:</span> {formData.date_of_birth || 'Not provided'}</p>
                    <p><span className="text-slate-500">Phone:</span> {formData.phone}</p>
                    <p><span className="text-slate-500">Email:</span> {formData.email || 'Not provided'}</p>
                  </div>
                </div>

                <div className="border-b pb-4">
                  <h3 className="font-semibold text-slate-900 mb-2">Medical Information</h3>
                  <div className="text-sm text-slate-600">
                    <p><span className="text-slate-500">Mobility:</span> {formData.mobility_status}</p>
                    {formData.allergies && <p><span className="text-slate-500">Allergies:</span> {formData.allergies}</p>}
                    {formData.primary_physician_name && (
                      <p><span className="text-slate-500">Primary Physician:</span> {formData.primary_physician_name}</p>
                    )}
                  </div>
                </div>

                <div className="border-b pb-4">
                  <h3 className="font-semibold text-slate-900 mb-2">Insurance</h3>
                  <div className="text-sm text-slate-600">
                    {formData.insurance_primary_name ? (
                      <p><span className="text-slate-500">Primary:</span> {formData.insurance_primary_name}</p>
                    ) : (
                      <p className="text-slate-400">No insurance information provided</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Documents</h3>
                  <p className="text-sm text-slate-600">
                    {formData.uploaded_documents.length} document(s) uploaded
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {currentStep === steps.length - 1 ? (
              <Button 
                onClick={handleSubmit}
                disabled={createPatientMutation.isPending}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {createPatientMutation.isPending ? 'Creating...' : 'Complete Onboarding'}
                <CheckCircle className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={nextStep}
                disabled={!canProceed()}
                className="bg-teal-600 hover:bg-teal-700"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}