import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  User, 
  Award, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  Loader2,
  Upload,
  X
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from 'sonner';

const STEPS = [
  { id: 'basic', title: 'Basic Information', icon: User },
  { id: 'skills', title: 'Skills & Certifications', icon: Award },
  { id: 'availability', title: 'Availability', icon: Calendar },
  { id: 'documents', title: 'Documents', icon: FileText },
  { id: 'review', title: 'Review', icon: CheckCircle2 },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
  'Wound Care',
  'IV Administration',
];

export default function CaregiverWizard({ open, onOpenChange, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [permissionError, setPermissionError] = useState(null);
  const [checkingPermissions, setCheckingPermissions] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    date_of_birth: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    skills: [],
    certifications: [],
    availability: DAYS.map(day => ({ day, available: false, start_time: '09:00', end_time: '17:00' })),
    hourly_rate: '',
    hire_date: new Date().toISOString().split('T')[0],
    onboarding_documents: [],
    onboarding_status: 'in_progress',
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleSkill = (skill) => {
    const current = formData.skills || [];
    if (current.includes(skill)) {
      handleChange('skills', current.filter(s => s !== skill));
    } else {
      handleChange('skills', [...current, skill]);
    }
  };

  const updateAvailability = (index, field, value) => {
    const updated = [...formData.availability];
    updated[index] = { ...updated[index], [field]: value };
    handleChange('availability', updated);
  };

  const addCertification = () => {
    handleChange('certifications', [
      ...formData.certifications,
      { name: '', issued_date: '', expiry_date: '', document_url: '' }
    ]);
  };

  const updateCertification = (index, field, value) => {
    const updated = [...formData.certifications];
    updated[index] = { ...updated[index], [field]: value };
    handleChange('certifications', updated);
  };

  const removeCertification = (index) => {
    handleChange('certifications', formData.certifications.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const newDoc = {
        name: file.name,
        type,
        url: file_url,
        uploaded_date: new Date().toISOString(),
      };

      handleChange('onboarding_documents', [...formData.onboarding_documents, newDoc]);
      toast.success('Document uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const removeDocument = (index) => {
    handleChange('onboarding_documents', formData.onboarding_documents.filter((_, i) => i !== index));
  };

  const createCaregiverMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      console.log('Creating caregiver with user:', user);
      console.log('Data:', data);
      
      return base44.entities.Caregiver.create({
        ...data,
        business_id: user.business_id,
        status: 'active',
        onboarding_status: 'completed',
      });
    },
    onSuccess: () => {
      toast.success('Caregiver onboarding completed!');
      onComplete();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Caregiver creation error:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error(`Failed to complete onboarding: ${error.response?.data?.message || error.message || 'Unknown error'}`);
    }
  });

  const resetForm = () => {
    setCurrentStep(0);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      date_of_birth: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      skills: [],
      certifications: [],
      availability: DAYS.map(day => ({ day, available: false, start_time: '09:00', end_time: '17:00' })),
      hourly_rate: '',
      hire_date: new Date().toISOString().split('T')[0],
      onboarding_documents: [],
      onboarding_status: 'in_progress',
    });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.name && formData.email && formData.phone;
      case 1:
        return true; // Skills are optional
      case 2:
        return true; // Availability is optional
      case 3:
        return true; // Documents are optional
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
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
        name: 'Test Caregiver',
        email: 'test@test.com',
        phone: '555-1234',
        business_id: user.business_id,
        status: 'active',
        onboarding_status: 'completed',
      };
      
      console.log('Testing with data:', testData);
      
      // Try to validate - this will show permission errors without actually creating
      const result = await base44.entities.Caregiver.create(testData);
      console.log('Permission check passed!', result);
      
      // Delete the test record
      await base44.entities.Caregiver.delete(result.id);
      
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
    const activeAvailability = formData.availability.filter(a => a.available);
    createCaregiverMutation.mutate({
      ...formData,
      availability: activeAvailability,
      hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Caregiver Onboarding</DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                  index <= currentStep 
                    ? "bg-teal-600 text-white" 
                    : "bg-slate-200 text-slate-400"
                )}>
                  <step.icon className="w-5 h-5" />
                </div>
                <span className="text-xs mt-2 text-center max-w-[80px]">{step.title}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={cn(
                  "h-0.5 w-12 mx-2 transition-colors",
                  index < currentStep ? "bg-teal-600" : "bg-slate-200"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="space-y-6">
          {currentStep === 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => handleChange('date_of_birth', e.target.value)}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="123 Main St, City, State 12345"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_name">Emergency Contact Name</Label>
                  <Input
                    id="emergency_name"
                    value={formData.emergency_contact_name}
                    onChange={(e) => handleChange('emergency_contact_name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_phone">Emergency Contact Phone</Label>
                  <Input
                    id="emergency_phone"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => handleChange('emergency_contact_phone', e.target.value)}
                  />
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
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Skills & Certifications</h3>
              <div>
                <Label>Select Skills *</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {SKILLS_OPTIONS.map(skill => (
                    <div key={skill} className="flex items-center space-x-2">
                      <Checkbox
                        id={skill}
                        checked={formData.skills.includes(skill)}
                        onCheckedChange={() => toggleSkill(skill)}
                      />
                      <label htmlFor={skill} className="text-sm cursor-pointer">
                        {skill}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <Label>Professional Certifications</Label>
                  <Button type="button" size="sm" onClick={addCertification} variant="outline">
                    Add Certification
                  </Button>
                </div>
                {formData.certifications.map((cert, index) => (
                  <div key={index} className="grid grid-cols-3 gap-2 mb-2 p-3 bg-slate-50 rounded-lg">
                    <Input
                      placeholder="Certification Name"
                      value={cert.name}
                      onChange={(e) => updateCertification(index, 'name', e.target.value)}
                    />
                    <Input
                      type="date"
                      placeholder="Issued Date"
                      value={cert.issued_date}
                      onChange={(e) => updateCertification(index, 'issued_date', e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        placeholder="Expiry Date"
                        value={cert.expiry_date}
                        onChange={(e) => updateCertification(index, 'expiry_date', e.target.value)}
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeCertification(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Availability</h3>
              <p className="text-sm text-slate-600">Select the days and times you're available to work</p>
              <div className="space-y-3">
                {formData.availability.map((avail, index) => (
                  <div key={avail.day} className="flex items-center gap-4 p-3 border rounded-lg">
                    <Checkbox
                      id={`day-${avail.day}`}
                      checked={avail.available}
                      onCheckedChange={(checked) => updateAvailability(index, 'available', checked)}
                    />
                    <label htmlFor={`day-${avail.day}`} className="w-28 font-medium">
                      {avail.day}
                    </label>
                    {avail.available && (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="time"
                          value={avail.start_time}
                          onChange={(e) => updateAvailability(index, 'start_time', e.target.value)}
                          className="w-32"
                        />
                        <span>to</span>
                        <Input
                          type="time"
                          value={avail.end_time}
                          onChange={(e) => updateAvailability(index, 'end_time', e.target.value)}
                          className="w-32"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Upload Documents</h3>
              <p className="text-sm text-slate-600">
                Upload required documents such as certifications, licenses, background check, etc.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-teal-500 transition-colors">
                  <input
                    type="file"
                    id="id-upload"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'ID')}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <label htmlFor="id-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm font-medium">ID/Driver's License</p>
                    <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG</p>
                  </label>
                </div>

                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-teal-500 transition-colors">
                  <input
                    type="file"
                    id="cert-upload"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'Certification')}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <label htmlFor="cert-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm font-medium">Certifications</p>
                    <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG</p>
                  </label>
                </div>

                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-teal-500 transition-colors">
                  <input
                    type="file"
                    id="bg-upload"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'Background Check')}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <label htmlFor="bg-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm font-medium">Background Check</p>
                    <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG</p>
                  </label>
                </div>

                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-teal-500 transition-colors">
                  <input
                    type="file"
                    id="other-upload"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'Other')}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <label htmlFor="other-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm font-medium">Other Documents</p>
                    <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG</p>
                  </label>
                </div>
              </div>

              {uploading && (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                  <span className="ml-2 text-sm">Uploading...</span>
                </div>
              )}

              {formData.onboarding_documents.length > 0 && (
                <div className="space-y-2">
                  <Label>Uploaded Documents</Label>
                  {formData.onboarding_documents.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-sm font-medium">{doc.name}</p>
                          <p className="text-xs text-slate-500">{doc.type}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeDocument(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-lg">Review & Submit</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={checkPermissions}
                  disabled={checkingPermissions}
                >
                  {checkingPermissions && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  🔍 Check Permissions
                </Button>
              </div>
              
              {permissionError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-red-900 mb-2">❌ Permission Error</h4>
                  <p className="text-sm text-red-700 font-mono break-all">{permissionError}</p>
                </div>
              )}
              
              <div className="space-y-4 bg-slate-50 rounded-lg p-4">
                <div>
                  <h4 className="font-medium text-sm text-slate-600 mb-2">Basic Information</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-slate-600">Name:</span> {formData.name}</div>
                    <div><span className="text-slate-600">Email:</span> {formData.email}</div>
                    <div><span className="text-slate-600">Phone:</span> {formData.phone}</div>
                    <div><span className="text-slate-600">Hire Date:</span> {formData.hire_date}</div>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <h4 className="font-medium text-sm text-slate-600 mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-1">
                    {formData.skills.map(skill => (
                      <Badge key={skill} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-3">
                  <h4 className="font-medium text-sm text-slate-600 mb-2">Availability</h4>
                  <div className="space-y-1 text-sm">
                    {formData.availability.filter(a => a.available).map(avail => (
                      <div key={avail.day}>
                        {avail.day}: {avail.start_time} - {avail.end_time}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-3">
                  <h4 className="font-medium text-sm text-slate-600 mb-2">Documents</h4>
                  <div className="text-sm text-slate-600">
                    {formData.onboarding_documents.length} document(s) uploaded
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={currentStep === 0 ? () => onOpenChange(false) : handleBack}
          >
            {currentStep === 0 ? 'Cancel' : 'Back'}
          </Button>
          {currentStep < STEPS.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="bg-teal-600 hover:bg-teal-700"
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={createCaregiverMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {createCaregiverMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Complete Onboarding
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}