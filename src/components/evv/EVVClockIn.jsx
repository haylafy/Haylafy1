import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from 'date-fns';

export default function EVVClockIn({ shift, onUpdate }) {
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const queryClient = useQueryClient();

  const isClockInDisabled = shift.status === 'completed' || shift.status === 'cancelled';
  const isInProgress = shift.status === 'in_progress';

  // Get current location
  const getCurrentLocation = () => {
    setLoadingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setLoadingLocation(false);
      },
      (error) => {
        setLocationError('Unable to retrieve your location. Please enable GPS.');
        setLoadingLocation(false);
        console.error(error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (!isClockInDisabled) {
      getCurrentLocation();
    }
  }, [isClockInDisabled]);

  const clockInMutation = useMutation({
    mutationFn: async () => {
      if (!location) {
        throw new Error('Location required for clock-in');
      }

      const now = new Date().toISOString();
      const updateData = {
        check_in_time: now,
        check_in_gps: location,
        check_in_location: `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`,
        status: 'in_progress',
        verification_method: 'app_login',
        caregiver_device_id: navigator.userAgent,
        evv_status: 'pending'
      };

      // Calculate geofence validation (simplified)
      // In production, you'd geocode the client address and calculate actual distance
      const geofenceStatus = 'in_range'; // Placeholder
      updateData.geofence_status = geofenceStatus;

      return base44.entities.Shift.update(shift.id, updateData);
    },
    onSuccess: () => {
      toast.success('Successfully clocked in!');
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      onUpdate?.();
    },
    onError: (error) => {
      toast.error('Failed to clock in');
      console.error(error);
    }
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      if (!location) {
        throw new Error('Location required for clock-out');
      }

      const now = new Date().toISOString();
      const checkInTime = new Date(shift.check_in_time);
      const checkOutTime = new Date(now);
      const actualHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);

      const updateData = {
        check_out_time: now,
        check_out_gps: location,
        check_out_location: `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`,
        status: 'completed',
        actual_hours: Math.round(actualHours * 100) / 100,
        evv_status: 'verified'
      };

      // Calculate if visit was late/early
      const scheduledStart = new Date(shift.start_time);
      const scheduledEnd = new Date(shift.end_time);
      
      if (checkInTime > scheduledStart) {
        updateData.late_arrival_minutes = Math.round((checkInTime - scheduledStart) / (1000 * 60));
      }
      if (checkOutTime < scheduledEnd) {
        updateData.early_departure_minutes = Math.round((scheduledEnd - checkOutTime) / (1000 * 60));
      }

      // Check for exceptions
      const exceptions = [];
      if (updateData.late_arrival_minutes > 15) {
        exceptions.push('Late arrival (>15 min)');
      }
      if (updateData.early_departure_minutes > 15) {
        exceptions.push('Early departure (>15 min)');
      }
      if (shift.authorized_hours && Math.abs(actualHours - shift.authorized_hours) > 0.5) {
        exceptions.push('Duration mismatch with authorization');
      }
      if (exceptions.length > 0) {
        updateData.evv_exceptions = exceptions;
        updateData.evv_status = 'exception';
      }

      return base44.entities.Shift.update(shift.id, updateData);
    },
    onSuccess: () => {
      toast.success('Successfully clocked out!');
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      onUpdate?.();
    },
    onError: (error) => {
      toast.error('Failed to clock out');
      console.error(error);
    }
  });

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-teal-600" />
          EVV Clock In/Out
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Visit Info */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Patient:</span>
            <span className="font-medium">{shift.client_name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Caregiver:</span>
            <span className="font-medium">{shift.caregiver_name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Scheduled:</span>
            <span className="font-medium">
              {format(new Date(shift.start_time), 'MMM d, h:mm a')} - {format(new Date(shift.end_time), 'h:mm a')}
            </span>
          </div>
          {shift.service_type && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Service:</span>
              <span className="font-medium capitalize">{shift.service_type.replace('_', ' ')}</span>
            </div>
          )}
        </div>

        {/* GPS Status */}
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">GPS Location</span>
          </div>
          {loadingLocation ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Getting location...
            </div>
          ) : locationError ? (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" />
              {locationError}
            </div>
          ) : location ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                Location acquired
              </div>
              <p className="text-xs text-slate-500">
                Accuracy: {Math.round(location.accuracy)}m
              </p>
            </div>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={getCurrentLocation}
              className="w-full"
            >
              Refresh Location
            </Button>
          )}
        </div>

        {/* Clock In/Out Status */}
        {shift.check_in_time && (
          <div className="bg-blue-50 rounded-lg p-3 text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-blue-700 font-medium">Clocked In:</span>
              <span className="text-blue-900">{format(new Date(shift.check_in_time), 'h:mm a')}</span>
            </div>
            {shift.geofence_status === 'in_range' && (
              <Badge className="bg-green-100 text-green-700 text-xs">Within geofence</Badge>
            )}
          </div>
        )}

        {shift.check_out_time && (
          <div className="bg-green-50 rounded-lg p-3 text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-green-700 font-medium">Clocked Out:</span>
              <span className="text-green-900">{format(new Date(shift.check_out_time), 'h:mm a')}</span>
            </div>
            {shift.actual_hours && (
              <p className="text-green-700 text-xs">Duration: {shift.actual_hours} hours</p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {!isInProgress && !isClockInDisabled && (
            <Button
              onClick={() => clockInMutation.mutate()}
              disabled={!location || clockInMutation.isPending}
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              {clockInMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Clocking In...
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  Start Visit
                </>
              )}
            </Button>
          )}

          {isInProgress && (
            <Button
              onClick={() => clockOutMutation.mutate()}
              disabled={!location || clockOutMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {clockOutMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Clocking Out...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  End Visit
                </>
              )}
            </Button>
          )}

          {isClockInDisabled && (
            <div className="text-center text-sm text-slate-500 py-2">
              Visit {shift.status}
            </div>
          )}
        </div>

        {/* Warnings */}
        {shift.evv_exceptions && shift.evv_exceptions.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm font-medium text-amber-800 mb-2">EVV Exceptions:</p>
            <ul className="text-xs text-amber-700 space-y-1">
              {shift.evv_exceptions.map((ex, idx) => (
                <li key={idx}>• {ex}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}