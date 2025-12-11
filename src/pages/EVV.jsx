import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  Clock, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Download,
  Filter,
  Calendar
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import EVVClockIn from '@/components/evv/EVVClockIn';
import EVVExportDialog from '@/components/evv/EVVExportDialog';

const statusConfig = {
  verified: { label: 'Verified', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  pending: { label: 'Pending', color: 'bg-blue-100 text-blue-700', icon: Clock },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
  exception: { label: 'Exception', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle }
};

const geofenceConfig = {
  in_range: { label: 'In Range', color: 'bg-green-100 text-green-700' },
  out_of_range: { label: 'Out of Range', color: 'bg-red-100 text-red-700' },
  not_checked: { label: 'Not Checked', color: 'bg-slate-100 text-slate-600' }
};

export default function EVV() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list('-check_in_time', 100),
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  // Filter shifts with EVV data
  const evvShifts = shifts.filter(s => s.check_in_time || s.check_out_time);
  
  const filteredShifts = statusFilter === 'all' 
    ? evvShifts 
    : evvShifts.filter(s => s.evv_status === statusFilter);

  // Stats
  const verifiedCount = evvShifts.filter(s => s.evv_status === 'verified').length;
  const pendingCount = evvShifts.filter(s => s.evv_status === 'pending').length;
  const exceptionCount = evvShifts.filter(s => s.evv_status === 'exception').length;
  const rejectedCount = evvShifts.filter(s => s.evv_status === 'rejected').length;

  // Get caregiver's upcoming shift for clock-in
  const caregiverUpcomingShift = shifts.find(s => 
    s.status === 'scheduled' && 
    new Date(s.start_time) <= new Date(Date.now() + 2 * 60 * 60 * 1000) // Within 2 hours
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
            Electronic Visit Verification
          </h1>
          <p className="text-slate-500 mt-1">Track and verify caregiver visits with GPS</p>
        </div>
        <Button 
          onClick={() => setExportDialogOpen(true)}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <Download className="w-4 h-4 mr-2" />
          Export EVV Data
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Verified</p>
              <p className="text-2xl font-bold text-slate-900">{verifiedCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Exceptions</p>
              <p className="text-2xl font-bold text-slate-900">{exceptionCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Rejected</p>
              <p className="text-2xl font-bold text-slate-900">{rejectedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="clockin">Clock In/Out</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          {/* Filter */}
          <div className="flex items-center gap-4 mb-6">
            <Filter className="w-4 h-4 text-slate-500" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Visits</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="exception">Exceptions</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Visit List */}
          <div className="space-y-3">
            {filteredShifts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No EVV records found</p>
              </div>
            ) : (
              filteredShifts.map((shift) => {
                const StatusIcon = statusConfig[shift.evv_status]?.icon || Clock;
                return (
                  <div
                    key={shift.id}
                    className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-slate-900">{shift.client_name}</h3>
                          <Badge className={cn("text-xs", statusConfig[shift.evv_status]?.color)}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig[shift.evv_status]?.label}
                          </Badge>
                          {shift.geofence_status && shift.geofence_status !== 'not_checked' && (
                            <Badge className={cn("text-xs", geofenceConfig[shift.geofence_status]?.color)}>
                              <MapPin className="w-3 h-3 mr-1" />
                              {geofenceConfig[shift.geofence_status]?.label}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600">Caregiver: {shift.caregiver_name}</p>
                        {shift.service_type && (
                          <p className="text-sm text-slate-500 capitalize">
                            {shift.service_type.replace('_', ' ')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      {shift.check_in_time && (
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Check In</p>
                          <p className="text-sm font-medium text-slate-900">
                            {format(new Date(shift.check_in_time), 'MMM d, h:mm a')}
                          </p>
                          {shift.check_in_gps && (
                            <p className="text-xs text-slate-500">
                              GPS: {shift.check_in_gps.latitude.toFixed(4)}, {shift.check_in_gps.longitude.toFixed(4)}
                            </p>
                          )}
                        </div>
                      )}
                      {shift.check_out_time && (
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Check Out</p>
                          <p className="text-sm font-medium text-slate-900">
                            {format(new Date(shift.check_out_time), 'MMM d, h:mm a')}
                          </p>
                          {shift.actual_hours && (
                            <p className="text-xs text-slate-500">
                              Duration: {shift.actual_hours} hours
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {shift.evv_exceptions && shift.evv_exceptions.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-amber-800 mb-1">Exceptions:</p>
                        <ul className="text-xs text-amber-700 space-y-1">
                          {shift.evv_exceptions.map((ex, idx) => (
                            <li key={idx}>• {ex}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {shift.verification_method && (
                      <p className="text-xs text-slate-500 mt-2">
                        Verified via: {shift.verification_method.replace('_', ' ')}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="clockin">
          <div className="max-w-2xl mx-auto">
            {caregiverUpcomingShift ? (
              <EVVClockIn 
                shift={caregiverUpcomingShift} 
                onUpdate={() => {
                  // Refresh data after clock in/out
                }}
              />
            ) : (
              <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No upcoming scheduled visits</p>
                <p className="text-sm text-slate-400 mt-1">
                  Check back when you have a visit scheduled within the next 2 hours
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Export Dialog */}
      <EVVExportDialog 
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        shifts={evvShifts}
      />
    </div>
  );
}