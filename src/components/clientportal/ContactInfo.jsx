import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Phone, Mail, MapPin, Heart, Save, Edit2, AlertCircle } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ContactInfo({ client }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    phone: client.phone || '',
    email: client.email || '',
    address: client.address || '',
    emergency_contact_name: client.emergency_contact_name || '',
    emergency_contact_phone: client.emergency_contact_phone || '',
    emergency_contact_relationship: client.emergency_contact_relationship || '',
    secondary_emergency_contact_name: client.secondary_emergency_contact_name || '',
    secondary_emergency_contact_phone: client.secondary_emergency_contact_phone || '',
  });

  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.update(client.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-client-profile'] });
      setIsEditing(false);
      toast.success('Contact information updated successfully');
    },
    onError: () => {
      toast.error('Failed to update contact information');
    }
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleCancel = () => {
    setFormData({
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      emergency_contact_name: client.emergency_contact_name || '',
      emergency_contact_phone: client.emergency_contact_phone || '',
      emergency_contact_relationship: client.emergency_contact_relationship || '',
      secondary_emergency_contact_name: client.secondary_emergency_contact_name || '',
      secondary_emergency_contact_phone: client.secondary_emergency_contact_phone || '',
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="p-6 bg-gradient-to-br from-teal-50 to-blue-50 border-teal-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-2xl font-bold">
              {client.name?.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{client.name}</h2>
              {client.date_of_birth && (
                <p className="text-slate-600">Born {new Date(client.date_of_birth).toLocaleDateString()}</p>
              )}
            </div>
          </div>
          
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} variant="outline">
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Information
            </Button>
          )}
        </div>
      </Card>

      {/* Contact Information */}
      <Card className="p-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-teal-600" />
          Contact Information
        </h3>
        
        <div className="space-y-4">
          <div>
            <Label>Phone Number</Label>
            {isEditing ? (
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="(555) 123-4567"
              />
            ) : (
              <div className="flex items-center gap-2 text-slate-700 mt-1">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>{client.phone || 'Not provided'}</span>
              </div>
            )}
          </div>

          <div>
            <Label>Email Address</Label>
            {isEditing ? (
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="email@example.com"
              />
            ) : (
              <div className="flex items-center gap-2 text-slate-700 mt-1">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{client.email || 'Not provided'}</span>
              </div>
            )}
          </div>

          <div>
            <Label>Home Address</Label>
            {isEditing ? (
              <Input
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder="123 Main Street, City, State 12345"
              />
            ) : (
              <div className="flex items-start gap-2 text-slate-700 mt-1">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                <span>{client.address || 'Not provided'}</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Emergency Contacts */}
      <Card className="p-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          Emergency Contacts
        </h3>
        
        <div className="space-y-6">
          {/* Primary Emergency Contact */}
          <div className="p-4 bg-slate-50 rounded-lg space-y-3">
            <p className="font-medium text-slate-700">Primary Emergency Contact</p>
            
            <div>
              <Label>Name</Label>
              {isEditing ? (
                <Input
                  value={formData.emergency_contact_name}
                  onChange={(e) => setFormData({...formData, emergency_contact_name: e.target.value})}
                  placeholder="Emergency contact name"
                />
              ) : (
                <p className="text-slate-700 mt-1">{client.emergency_contact_name || 'Not provided'}</p>
              )}
            </div>

            <div>
              <Label>Phone</Label>
              {isEditing ? (
                <Input
                  value={formData.emergency_contact_phone}
                  onChange={(e) => setFormData({...formData, emergency_contact_phone: e.target.value})}
                  placeholder="(555) 123-4567"
                />
              ) : (
                <p className="text-slate-700 mt-1">{client.emergency_contact_phone || 'Not provided'}</p>
              )}
            </div>

            <div>
              <Label>Relationship</Label>
              {isEditing ? (
                <Input
                  value={formData.emergency_contact_relationship}
                  onChange={(e) => setFormData({...formData, emergency_contact_relationship: e.target.value})}
                  placeholder="e.g., Daughter, Son, Spouse"
                />
              ) : (
                <p className="text-slate-700 mt-1">{client.emergency_contact_relationship || 'Not provided'}</p>
              )}
            </div>
          </div>

          {/* Secondary Emergency Contact */}
          <div className="p-4 bg-slate-50 rounded-lg space-y-3">
            <p className="font-medium text-slate-700">Secondary Emergency Contact</p>
            
            <div>
              <Label>Name</Label>
              {isEditing ? (
                <Input
                  value={formData.secondary_emergency_contact_name}
                  onChange={(e) => setFormData({...formData, secondary_emergency_contact_name: e.target.value})}
                  placeholder="Secondary contact name"
                />
              ) : (
                <p className="text-slate-700 mt-1">{client.secondary_emergency_contact_name || 'Not provided'}</p>
              )}
            </div>

            <div>
              <Label>Phone</Label>
              {isEditing ? (
                <Input
                  value={formData.secondary_emergency_contact_phone}
                  onChange={(e) => setFormData({...formData, secondary_emergency_contact_phone: e.target.value})}
                  placeholder="(555) 123-4567"
                />
              ) : (
                <p className="text-slate-700 mt-1">{client.secondary_emergency_contact_phone || 'Not provided'}</p>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Insurance Information (Read-only) */}
      {(client.insurance_primary_name || client.insurance_secondary_name) && (
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-blue-600" />
            Insurance Information
          </h3>
          
          <div className="space-y-4 text-sm">
            {client.insurance_primary_name && (
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium text-slate-700 mb-2">Primary Insurance</p>
                <p className="text-slate-600">Provider: {client.insurance_primary_name}</p>
                {client.insurance_primary_id && <p className="text-slate-600">ID: {client.insurance_primary_id}</p>}
                {client.insurance_primary_group && <p className="text-slate-600">Group: {client.insurance_primary_group}</p>}
              </div>
            )}

            {client.insurance_secondary_name && (
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium text-slate-700 mb-2">Secondary Insurance</p>
                <p className="text-slate-600">Provider: {client.insurance_secondary_name}</p>
                {client.insurance_secondary_id && <p className="text-slate-600">ID: {client.insurance_secondary_id}</p>}
              </div>
            )}
            
            <p className="text-xs text-slate-500 mt-2">
              To update insurance information, please contact your care coordinator.
            </p>
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      {isEditing && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}
    </div>
  );
}