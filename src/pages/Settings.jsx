import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Settings as SettingsIcon, 
  Building2,
  Bell,
  DollarSign,
  Clock,
  Save,
  Upload,
  X,
  CheckCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Settings() {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => base44.entities.CompanySetting.list(),
  });

  const currentSettings = settings[0] || {};

  const [formData, setFormData] = useState({
    company_name: '',
    company_email: '',
    company_phone: '',
    company_address: '',
    company_logo: '',
    timezone: 'America/Chicago',
    default_shift_duration: 4,
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
    onboarding_checklist: [],
  });

  useEffect(() => {
    if (currentSettings?.id) {
      setFormData({
        company_name: currentSettings.company_name || '',
        company_email: currentSettings.company_email || '',
        company_phone: currentSettings.company_phone || '',
        company_address: currentSettings.company_address || '',
        company_logo: currentSettings.company_logo || '',
        timezone: currentSettings.timezone || 'America/Chicago',
        default_shift_duration: currentSettings.default_shift_duration || 4,
        billing_rates: currentSettings.billing_rates || { standard_rate: 25, weekend_rate: 30, overnight_rate: 35 },
        notification_settings: currentSettings.notification_settings || { shift_reminders: true, payment_reminders: true, email_notifications: true },
        onboarding_checklist: currentSettings.onboarding_checklist || [],
      });
    }
  }, [currentSettings]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value,
      },
    }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleChange('company_logo', file_url);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (currentSettings?.id) {
        await base44.entities.CompanySetting.update(currentSettings.id, formData);
      } else {
        await base44.entities.CompanySetting.create(formData);
      }
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 mt-1">Manage your company settings and preferences</p>
        </div>
        <Button 
          onClick={handleSave}
          disabled={saving}
          className="bg-teal-600 hover:bg-teal-700"
        >
          {saving ? (
            <>
              <Clock className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList>
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Company
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Company Settings */}
        <TabsContent value="company">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">Company Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => handleChange('company_name', e.target.value)}
                    placeholder="CareFlow Home Care"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_email">Company Email</Label>
                  <Input
                    id="company_email"
                    type="email"
                    value={formData.company_email}
                    onChange={(e) => handleChange('company_email', e.target.value)}
                    placeholder="contact@careflow.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_phone">Company Phone</Label>
                  <Input
                    id="company_phone"
                    value={formData.company_phone}
                    onChange={(e) => handleChange('company_phone', e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={formData.timezone}
                    onChange={(e) => handleChange('timezone', e.target.value)}
                    placeholder="America/Chicago"
                  />
                </div>
              </div>

              <div className="space-y-2 mt-6">
                <Label htmlFor="company_address">Company Address</Label>
                <Textarea
                  id="company_address"
                  value={formData.company_address}
                  onChange={(e) => handleChange('company_address', e.target.value)}
                  placeholder="123 Main Street, Suite 100, City, State 12345"
                  rows={3}
                />
              </div>

              <div className="space-y-2 mt-6">
                <Label>Company Logo</Label>
                <div className="flex items-center gap-4">
                  {formData.company_logo && (
                    <div className="relative w-24 h-24 rounded-xl border border-slate-200 overflow-hidden">
                      <img 
                        src={formData.company_logo} 
                        alt="Company logo" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => handleChange('company_logo', '')}
                        className="absolute top-1 right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-slate-100"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <label className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                    {uploading ? (
                      <Clock className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span className="text-sm">{formData.company_logo ? 'Change Logo' : 'Upload Logo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold text-slate-900 mb-4">Shift Settings</h3>
              <div className="space-y-2">
                <Label htmlFor="default_shift_duration">Default Shift Duration (hours)</Label>
                <Input
                  id="default_shift_duration"
                  type="number"
                  min="1"
                  max="24"
                  value={formData.default_shift_duration}
                  onChange={(e) => handleChange('default_shift_duration', parseFloat(e.target.value))}
                  className="w-40"
                />
                <p className="text-sm text-slate-500">Default hours when creating new shifts</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Billing Settings */}
        <TabsContent value="billing">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">Billing Rates</h3>
              <p className="text-sm text-slate-500 mb-6">Set your default hourly rates for different shift types</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="standard_rate">Standard Rate ($/hr)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="standard_rate"
                      type="number"
                      step="0.01"
                      value={formData.billing_rates.standard_rate}
                      onChange={(e) => handleNestedChange('billing_rates', 'standard_rate', parseFloat(e.target.value))}
                      className="pl-9"
                    />
                  </div>
                  <p className="text-xs text-slate-500">Weekday rate</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weekend_rate">Weekend Rate ($/hr)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="weekend_rate"
                      type="number"
                      step="0.01"
                      value={formData.billing_rates.weekend_rate}
                      onChange={(e) => handleNestedChange('billing_rates', 'weekend_rate', parseFloat(e.target.value))}
                      className="pl-9"
                    />
                  </div>
                  <p className="text-xs text-slate-500">Saturday & Sunday</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="overnight_rate">Overnight Rate ($/hr)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="overnight_rate"
                      type="number"
                      step="0.01"
                      value={formData.billing_rates.overnight_rate}
                      onChange={(e) => handleNestedChange('billing_rates', 'overnight_rate', parseFloat(e.target.value))}
                      className="pl-9"
                    />
                  </div>
                  <p className="text-xs text-slate-500">10pm - 6am</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Billing Rates Usage</h4>
                  <p className="text-sm text-blue-700">
                    These rates are used as defaults when creating invoices. You can adjust individual invoice amounts as needed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">Notification Preferences</h3>
              <p className="text-sm text-slate-500 mb-6">Choose what notifications you want to receive</p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900">Shift Reminders</h4>
                      <p className="text-sm text-slate-500">Get notified before upcoming shifts</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.notification_settings.shift_reminders}
                    onCheckedChange={(checked) => handleNestedChange('notification_settings', 'shift_reminders', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900">Payment Reminders</h4>
                      <p className="text-sm text-slate-500">Reminders for overdue payments</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.notification_settings.payment_reminders}
                    onCheckedChange={(checked) => handleNestedChange('notification_settings', 'payment_reminders', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900">Email Notifications</h4>
                      <p className="text-sm text-slate-500">Receive updates via email</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.notification_settings.email_notifications}
                    onCheckedChange={(checked) => handleNestedChange('notification_settings', 'email_notifications', checked)}
                  />
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-medium text-emerald-900 mb-1">Stay Informed</h4>
                  <p className="text-sm text-emerald-700">
                    Enable notifications to stay up-to-date with important events and reminders.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Save Button (bottom) */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={saving}
          className="bg-teal-600 hover:bg-teal-700"
        >
          {saving ? (
            <>
              <Clock className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}