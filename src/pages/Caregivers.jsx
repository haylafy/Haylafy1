import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  UserCog, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  MoreVertical,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  Award,
  Clock
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { cn } from "@/lib/utils";
import CaregiverForm from '@/components/caregivers/CaregiverForm';
import AvailabilityManager from '@/components/scheduling/AvailabilityManager';
import { hasPermission } from '@/components/utils/permissions';

const statusColors = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-slate-100 text-slate-600',
  on_leave: 'bg-amber-100 text-amber-700',
};

export default function Caregivers() {
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingCaregiver, setEditingCaregiver] = useState(null);
  const [deleteCaregiver, setDeleteCaregiver] = useState(null);
  const [availabilityCaregiver, setAvailabilityCaregiver] = useState(null);
  const [user, setUser] = useState(null);
  
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: caregivers = [], isLoading } = useQuery({
    queryKey: ['caregivers', user?.business_id],
    queryFn: async () => {
      if (!user?.business_id) return [];
      return base44.entities.Caregiver.filter({ business_id: user.business_id }, '-created_date');
    },
    enabled: !!user?.business_id,
  });

  const filteredCaregivers = caregivers.filter(caregiver =>
    caregiver.name?.toLowerCase().includes(search.toLowerCase()) ||
    caregiver.email?.toLowerCase().includes(search.toLowerCase()) ||
    caregiver.phone?.includes(search)
  );

  const handleEdit = (caregiver) => {
    setEditingCaregiver(caregiver);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (deleteCaregiver) {
      await base44.entities.Caregiver.delete(deleteCaregiver.id);
      queryClient.invalidateQueries({ queryKey: ['caregivers'] });
      setDeleteCaregiver(null);
    }
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingCaregiver(null);
  };

  const handleSave = () => {
    queryClient.invalidateQueries({ queryKey: ['caregivers'] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Caregivers</h1>
          <p className="text-slate-500 mt-1">Manage your caregiver team</p>
        </div>
        {hasPermission(user, 'CREATE_CAREGIVERS') && (
          <Button 
            onClick={() => setFormOpen(true)}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Caregiver
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search caregivers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Caregivers Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : filteredCaregivers.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <UserCog className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">No caregivers found</h3>
          <p className="text-slate-500 mb-6">
            {search ? 'Try adjusting your search' : 'Get started by adding your first caregiver'}
          </p>
          {!search && hasPermission(user, 'CREATE_CAREGIVERS') && (
            <Button onClick={() => setFormOpen(true)} className="bg-teal-600 hover:bg-teal-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Caregiver
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCaregivers.map((caregiver) => (
            <div
              key={caregiver.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-lg">
                    {caregiver.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{caregiver.name}</h3>
                    <Badge className={cn("text-xs mt-1", statusColors[caregiver.status])}>
                      {caregiver.status?.replace('_', ' ') || 'active'}
                    </Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(caregiver)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setAvailabilityCaregiver(caregiver)}>
                      <Clock className="w-4 h-4 mr-2" />
                      Set Availability
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setDeleteCaregiver(caregiver)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-2 text-sm mb-4">
                {caregiver.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{caregiver.phone}</span>
                  </div>
                )}
                {caregiver.email && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="truncate">{caregiver.email}</span>
                  </div>
                )}
                {caregiver.hourly_rate && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <DollarSign className="w-4 h-4 text-slate-400" />
                    <span>${caregiver.hourly_rate}/hr</span>
                  </div>
                )}
                {caregiver.hire_date && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Hired {format(new Date(caregiver.hire_date), 'MMM d, yyyy')}</span>
                  </div>
                )}
              </div>

              {caregiver.skills?.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-1 text-xs font-medium text-slate-500 mb-2">
                    <Award className="w-3 h-3" />
                    Skills
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {caregiver.skills.slice(0, 3).map((skill) => (
                      <Badge 
                        key={skill} 
                        variant="secondary"
                        className="text-xs bg-slate-100 text-slate-600"
                      >
                        {skill}
                      </Badge>
                    ))}
                    {caregiver.skills.length > 3 && (
                      <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600">
                        +{caregiver.skills.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Caregiver Form Dialog */}
      <CaregiverForm
        caregiver={editingCaregiver}
        open={formOpen}
        onOpenChange={handleFormClose}
        onSave={handleSave}
      />

      {/* Availability Manager */}
      <AvailabilityManager
        caregiver={availabilityCaregiver}
        open={!!availabilityCaregiver}
        onOpenChange={(open) => !open && setAvailabilityCaregiver(null)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCaregiver} onOpenChange={() => setDeleteCaregiver(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Caregiver</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteCaregiver?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}