import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  UserPlus, 
  Search, 
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import CaregiverWizard from '@/components/onboarding/CaregiverWizard';

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
};

export default function CaregiverOnboarding() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [viewCaregiver, setViewCaregiver] = useState(null);
  const [deleteCaregiver, setDeleteCaregiver] = useState(null);
  const [user, setUser] = useState(null);

  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: caregivers = [], isLoading } = useQuery({
    queryKey: ['caregivers-onboarding', user?.business_id],
    queryFn: async () => {
      return base44.entities.Caregiver.list('-created_date');
    },
    enabled: !!user,
  });

  const filteredCaregivers = caregivers.filter(caregiver => {
    const matchesSearch = 
      caregiver.name?.toLowerCase().includes(search.toLowerCase()) ||
      caregiver.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || caregiver.onboarding_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: caregivers.length,
    pending: caregivers.filter(c => c.onboarding_status === 'pending').length,
    in_progress: caregivers.filter(c => c.onboarding_status === 'in_progress').length,
    completed: caregivers.filter(c => c.onboarding_status === 'completed').length,
  };

  const handleComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['caregivers-onboarding'] });
  };

  const handleDelete = async () => {
    if (deleteCaregiver) {
      await base44.entities.Caregiver.delete(deleteCaregiver.id);
      queryClient.invalidateQueries({ queryKey: ['caregivers-onboarding'] });
      setDeleteCaregiver(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Caregiver Onboarding</h1>
          <p className="text-slate-500 mt-1">Manage new caregiver onboarding process</p>
        </div>
        <Button 
          onClick={() => setWizardOpen(true)}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Start Onboarding
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Caregivers</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-slate-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-700">Pending</p>
              <p className="text-3xl font-bold text-amber-900 mt-1">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700">In Progress</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">{stats.in_progress}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-emerald-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-emerald-700">Completed</p>
              <p className="text-3xl font-bold text-emerald-900 mt-1">{stats.completed}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search caregivers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Caregivers List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : filteredCaregivers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-100">
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">No caregivers found</h3>
          <p className="text-slate-500 mb-6">
            {search ? 'Try adjusting your search' : 'Start onboarding your first caregiver'}
          </p>
          {!search && (
            <Button onClick={() => setWizardOpen(true)} className="bg-teal-600 hover:bg-teal-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Start Onboarding
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCaregivers.map((caregiver) => {
            const StatusIcon = statusConfig[caregiver.onboarding_status || 'pending'].icon;
            return (
              <div
                key={caregiver.id}
                className="bg-white rounded-xl p-6 border border-slate-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-semibold text-lg">
                      {caregiver.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-slate-900">{caregiver.name}</h3>
                        <Badge className={cn("text-xs", statusConfig[caregiver.onboarding_status || 'pending'].color)}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig[caregiver.onboarding_status || 'pending'].label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span>{caregiver.email}</span>
                        <span>•</span>
                        <span>{caregiver.phone}</span>
                        {caregiver.hire_date && (
                          <>
                            <span>•</span>
                            <span>Hired {format(new Date(caregiver.hire_date), 'MMM d, yyyy')}</span>
                          </>
                        )}
                      </div>
                      {caregiver.skills?.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          {caregiver.skills.slice(0, 3).map(skill => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {caregiver.skills.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{caregiver.skills.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setViewCaregiver(caregiver)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
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
              </div>
            );
          })}
        </div>
      )}

      {/* Onboarding Wizard */}
      <CaregiverWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onComplete={handleComplete}
      />

      {/* View Details Dialog */}
      <Dialog open={!!viewCaregiver} onOpenChange={() => setViewCaregiver(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Caregiver Details</DialogTitle>
          </DialogHeader>
          {viewCaregiver && (
            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-3">Basic Information</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-600">Name:</span>
                    <p className="font-medium">{viewCaregiver.name}</p>
                  </div>
                  <div>
                    <span className="text-slate-600">Email:</span>
                    <p className="font-medium">{viewCaregiver.email}</p>
                  </div>
                  <div>
                    <span className="text-slate-600">Phone:</span>
                    <p className="font-medium">{viewCaregiver.phone}</p>
                  </div>
                  <div>
                    <span className="text-slate-600">Status:</span>
                    <Badge className={cn("text-xs mt-1", statusConfig[viewCaregiver.onboarding_status || 'pending'].color)}>
                      {statusConfig[viewCaregiver.onboarding_status || 'pending'].label}
                    </Badge>
                  </div>
                </div>
              </div>

              {viewCaregiver.skills?.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {viewCaregiver.skills.map(skill => (
                      <Badge key={skill} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {viewCaregiver.availability?.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Availability</h4>
                  <div className="space-y-2 text-sm">
                    {viewCaregiver.availability.map(avail => (
                      <div key={avail.day} className="flex justify-between">
                        <span className="font-medium">{avail.day}:</span>
                        <span className="text-slate-600">{avail.start_time} - {avail.end_time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewCaregiver.onboarding_documents?.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Documents</h4>
                  <div className="space-y-2">
                    {viewCaregiver.onboarding_documents.map((doc, index) => (
                      <a
                        key={index}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4 text-teal-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{doc.name}</p>
                          <p className="text-xs text-slate-500">{doc.type}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

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