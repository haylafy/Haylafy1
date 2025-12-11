import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Shield, Mail, Phone, Edit, Trash2, Search, Filter, MoreVertical, UserX, UserCheck } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

import { getRolePermissions, ROLES } from '@/components/utils/permissions';

const rolePermissions = {
  business_admin: {
    can_manage_patients: true,
    can_manage_caregivers: true,
    can_manage_billing: true,
    can_view_reports: true,
    can_manage_documentation: true,
    can_manage_users: true,
    can_manage_scheduling: true,
    can_manage_settings: true,
    description: 'Full administrative access to all business operations'
  },
  case_manager: {
    can_manage_patients: true,
    can_manage_caregivers: false,
    can_manage_billing: false,
    can_view_reports: true,
    can_manage_documentation: true,
    can_manage_users: false,
    can_manage_scheduling: true,
    can_manage_settings: false,
    description: 'Manage patient care, scheduling, and clinical documentation'
  },
  billing_staff: {
    can_manage_patients: false,
    can_manage_caregivers: false,
    can_manage_billing: true,
    can_view_reports: true,
    can_manage_documentation: false,
    can_manage_users: false,
    can_manage_scheduling: false,
    can_manage_settings: false,
    description: 'Manage billing, invoices, claims, and financial reports'
  },
  caregiver: {
    can_manage_patients: false,
    can_manage_caregivers: false,
    can_manage_billing: false,
    can_view_reports: false,
    can_manage_documentation: true,
    can_manage_users: false,
    can_manage_scheduling: false,
    can_manage_settings: false,
    description: 'Clock in/out, view assigned shifts, and document visits'
  },
  viewer: {
    can_manage_patients: false,
    can_manage_caregivers: false,
    can_manage_billing: false,
    can_view_reports: true,
    can_manage_documentation: false,
    can_manage_users: false,
    can_manage_scheduling: false,
    can_manage_settings: false,
    description: 'Read-only access to view reports and data'
  }
};

export default function UserManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterBusiness, setFilterBusiness] = useState('all');
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    business_id: '',
    user_role: 'viewer',
    permissions: rolePermissions.viewer
  });

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => base44.entities.Business.list(),
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData) => {
      console.log('🚀 Starting user invitation creation...', userData);
      const business = businesses.find(b => b.id === userData.business_id);
      console.log('Found business:', business);
      
      let emailStatus = 'pending';

      // Compose email with clear call to action
      const appUrl = window.location.origin;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0d9488;">You're Invited to Join ${business?.business_name || 'Haylafy'}</h2>
          <p>Hello ${userData.full_name || 'there'},</p>
          <p>You have been invited to join <strong>${business?.business_name || 'the organization'}</strong> on Haylafy Home Care Management Platform.</p>
          
          <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Your Account Details:</h3>
            <p><strong>Organization:</strong> ${business?.business_name || 'N/A'}</p>
            <p><strong>Role:</strong> ${userData.user_role.replace('_', ' ').toUpperCase()}</p>
            <p><strong>Email:</strong> ${userData.email}</p>
          </div>
          
          <p>To get started, please visit: <a href="${appUrl}" style="color: #0d9488;">${appUrl}</a></p>
          
          <p>If you have any questions, contact your administrator at ${currentUser?.email || 'the admin email'}.</p>
          
          <p style="margin-top: 30px;">Best regards,<br>${business?.business_name || 'Haylafy'} Team</p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="font-size: 12px; color: #64748b;">This is an automated message. Please do not reply directly to this email.</p>
        </div>
      `;

      // Attempt to send email using custom Gmail function
      try {
        console.log('📧 Attempting to send email to:', userData.email);
        const emailResult = await base44.functions.invoke('sendGmail', {
          to: userData.email,
          subject: `You're Invited to Join ${business?.business_name || 'Haylafy'}`,
          html: emailHtml
        });
        console.log('✅ Email sent successfully:', emailResult.data);
        if (emailResult.data?.success) {
          emailStatus = 'sent';
        } else {
          emailStatus = 'pending';
        }
      } catch (err) {
        console.error('❌ Email sending failed:', err);
        console.error('Error details:', err);
        emailStatus = 'pending';
      }

      // Create invitation record
      console.log('Creating invitation record...');
      const invitation = await base44.entities.UserInvitation.create({
        email: userData.email,
        full_name: userData.full_name,
        phone: userData.phone,
        business_id: userData.business_id,
        business_name: business?.business_name,
        user_role: userData.user_role,
        permissions: userData.permissions,
        status: emailStatus,
        invited_by: currentUser?.email
      });
      console.log('✅ Invitation created:', invitation);

      return { invitation, emailStatus };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-invitations'] });

      if (result.emailStatus === 'sent') {
        toast.success(`✅ Invitation email sent to ${variables.email}`, { duration: 5000 });
      } else {
        toast.warning(`⚠️ Invitation created but email failed. Check console for details. Please manually contact ${variables.email}`, { 
          duration: 8000 
        });
      }

      setDialogOpen(false);
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        business_id: '',
        user_role: 'viewer',
        permissions: rolePermissions.viewer
      });
    },
    onError: (error) => {
      toast.error(
        `Failed to send invitation: ${error.message || 'Email service error'}. Check browser console for details.`, 
        { duration: 10000 }
      );
      console.error('Invitation error:', error);
      console.error('Error stack:', error.stack);
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated');
      setDialogOpen(false);
      setEditingUser(null);
    }
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: ({ id, isActive }) => base44.entities.User.update(id, { is_active: isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User status updated');
    }
  });

  const handleRoleChange = (role) => {
    setFormData({
      ...formData,
      user_role: role,
      permissions: rolePermissions[role]
    });
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || '',
      business_id: user.business_id || '',
      user_role: user.user_role || 'viewer',
      permissions: user.permissions || rolePermissions.viewer
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingUser(null);
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      business_id: '',
      user_role: 'viewer',
      permissions: rolePermissions.viewer
    });
  };

  // Filter users by current user's business if not super admin
  let filteredUsers = currentUser?.role === 'admin' 
    ? users 
    : users.filter(u => u.business_id === currentUser?.business_id);

  // Apply search filter
  if (searchQuery) {
    filteredUsers = filteredUsers.filter(u => 
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone?.includes(searchQuery)
    );
  }

  // Apply role filter
  if (filterRole !== 'all') {
    filteredUsers = filteredUsers.filter(u => u.user_role === filterRole);
  }

  // Apply business filter
  if (filterBusiness !== 'all') {
    filteredUsers = filteredUsers.filter(u => u.business_id === filterBusiness);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 mt-1">Manage team members and permissions</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-teal-600 hover:bg-teal-700">
          <UserPlus className="w-4 h-4 mr-2" />
          Invite User
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="business_admin">Business Admin</SelectItem>
            <SelectItem value="case_manager">Case Manager</SelectItem>
            <SelectItem value="billing_staff">Billing Staff</SelectItem>
            <SelectItem value="caregiver">Caregiver</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
          </SelectContent>
        </Select>

        {currentUser?.role === 'admin' && (
          <Select value={filterBusiness} onValueChange={setFilterBusiness}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by business" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Businesses</SelectItem>
              {businesses.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.business_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* User List */}
      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <UserPlus className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No users found</h3>
            <p className="text-slate-500">
              {searchQuery ? 'Try adjusting your search' : 'Start by inviting users to your organization'}
            </p>
          </div>
        ) : (
          filteredUsers.map(user => {
            const business = businesses.find(b => b.id === user.business_id);
            return (
              <div key={user.id} className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-semibold">
                      {user.full_name?.charAt(0) || user.email?.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{user.full_name || 'User'}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span className="text-sm text-slate-600">{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-2 mt-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span className="text-sm text-slate-600">{user.phone}</span>
                        </div>
                      )}
                      {business && (
                        <Badge variant="outline" className="mt-2">
                          {business.business_name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-700 capitalize">
                      <Shield className="w-3 h-3 mr-1" />
                      {user.user_role?.replace('_', ' ') || user.role}
                    </Badge>
                    {user.is_active === false && (
                      <Badge className="bg-red-100 text-red-700">Inactive</Badge>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(user)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit User
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => toggleUserStatusMutation.mutate({ 
                            id: user.id, 
                            isActive: user.is_active === false 
                          })}
                        >
                          {user.is_active === false ? (
                            <>
                              <UserCheck className="w-4 h-4 mr-2 text-green-600" />
                              <span className="text-green-600">Activate</span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-4 h-4 mr-2 text-red-600" />
                              <span className="text-red-600">Deactivate</span>
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {user.permissions && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {Object.entries(user.permissions).map(([key, value]) => 
                      value && (
                        <span key={key} className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600">
                          {key.replace('can_', '').replace(/_/g, ' ')}
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Invite Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Invite New User'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={(e) => {
            e.preventDefault();
            console.log('Form submitted', { editingUser, formData });
            if (!formData.email || !formData.business_id) {
              toast.error('Email and Business are required');
              return;
            }
            if (editingUser) {
              updateUserMutation.mutate({ id: editingUser.id, data: formData });
            } else {
              console.log('Calling createUserMutation with:', formData);
              createUserMutation.mutate(formData);
            }
          }} className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input 
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
              />
            </div>

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

            <div>
              <Label>Business *</Label>
              <Select 
                value={formData.business_id}
                onValueChange={(val) => setFormData({...formData, business_id: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select business" />
                </SelectTrigger>
                <SelectContent>
                  {businesses.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.business_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Role</Label>
              <Select 
                value={formData.user_role}
                onValueChange={handleRoleChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="business_admin">Business Admin</SelectItem>
                  <SelectItem value="case_manager">Case Manager</SelectItem>
                  <SelectItem value="billing_staff">Billing Staff</SelectItem>
                  <SelectItem value="caregiver">Caregiver</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg space-y-3">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-slate-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Role Description</p>
                  <p className="text-xs text-slate-600 mt-1">
                    {rolePermissions[formData.user_role]?.description}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <p className="text-sm font-medium text-slate-700 mb-2">Permissions:</p>
                <div className="grid grid-cols-1 gap-1.5 text-xs text-slate-600">
                  {Object.entries(formData.permissions).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox checked={value} disabled className="h-3 w-3" />
                      <span className="capitalize">{key.replace('can_', '').replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createUserMutation.isPending || updateUserMutation.isPending}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {createUserMutation.isPending || updateUserMutation.isPending 
                  ? 'Saving...' 
                  : editingUser ? 'Update User' : 'Send Invite'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}