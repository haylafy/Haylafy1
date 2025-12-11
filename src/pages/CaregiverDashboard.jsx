import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, isToday, isThisWeek, isFuture, startOfDay, endOfDay, addDays, isSameDay } from 'date-fns';
import { Clock, MapPin, ClipboardList, AlertCircle, CheckCircle, Calendar, User, Phone, ChevronRight, Home } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import AssignedTasksList from '@/components/caregiver/AssignedTasksList';

export default function CaregiverDashboard() {
  const [user, setUser] = useState(null);
  const [clockingIn, setClockingIn] = useState(false);
  const [gpsWarning, setGpsWarning] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: shifts = [] } = useQuery({
    queryKey: ['my-shifts', user?.email],
    queryFn: () => base44.entities.Shift.list('-start_time'),
    enabled: !!user?.id,
    select: (data) => data.filter(shift => shift.caregiver_id === user?.id),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    enabled: !!user?.id,
  });

  // Get today's shifts
  const todayShifts = shifts.filter(shift => isToday(new Date(shift.start_time)));
  const todayShift = todayShifts[0];

  // Get upcoming shifts (next 7 days)
  const upcomingShifts = shifts.filter(shift => {
    const shiftDate = new Date(shift.start_time);
    return isFuture(shiftDate) && isThisWeek(shiftDate, { weekStartsOn: 0 });
  }).slice(0, 5);

  // Get unique clients from shifts
  const myClients = clients.filter(client => 
    shifts.some(shift => shift.client_id === client.id)
  );

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959; // Earth radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleClockIn = async (forceClockIn = false) => {
    if (!todayShift) {
      toast.error('No shift scheduled for today');
      return;
    }

    setClockingIn(true);

    try {
      // Get GPS coordinates
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        });
      });

      const { latitude, longitude, accuracy } = position.coords;
      setCurrentLocation({ latitude, longitude, accuracy });

      // For demo: use a fixed client location or parse from address
      // In production, you'd geocode the client address
      const clientLat = 40.7128; // Example coordinates
      const clientLon = -74.0060;

      const distance = calculateDistance(latitude, longitude, clientLat, clientLon);

      // Check if outside geofence
      if (distance > 0.5 && !forceClockIn) {
        setGpsWarning(true);
        setClockingIn(false);
        return;
      }

      // Clock in
      const now = new Date().toISOString();
      await base44.entities.Shift.update(todayShift.id, {
        ...todayShift,
        status: 'in_progress',
        check_in_time: now,
        check_in_gps: { latitude, longitude, accuracy },
        geofence_status: distance <= 0.5 ? 'in_range' : 'out_of_range'
      });

      // Create notification for admin
      await base44.entities.Notification.create({
        user_email: 'admin@example.com', // Replace with actual admin email
        type: 'shift_reminder',
        title: 'Caregiver Clocked In',
        message: `${user.full_name} has clocked in for ${todayShift.client_name}`,
        related_shift_id: todayShift.id,
        priority: 'low'
      });

      toast.success('Clocked in successfully!');
      setGpsWarning(false);
      setClockingIn(false);
    } catch (error) {
      console.error('Clock in error:', error);
      toast.error('Failed to clock in. Please check GPS permissions.');
      setClockingIn(false);
    }
  };

  const getClientInfo = (clientId) => {
    return clients.find(c => c.id === clientId);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Welcome back, {user?.full_name}</h1>
        <p className="text-slate-500 mt-1">Your personalized caregiver dashboard</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-br from-teal-50 to-white border-teal-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Today's Shifts</p>
              <p className="text-3xl font-bold text-teal-600">{todayShifts.length}</p>
            </div>
            <Clock className="w-10 h-10 text-teal-600 opacity-20" />
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-white border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">This Week</p>
              <p className="text-3xl font-bold text-blue-600">{upcomingShifts.length}</p>
            </div>
            <Calendar className="w-10 h-10 text-blue-600 opacity-20" />
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-white border-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">My Clients</p>
              <p className="text-3xl font-bold text-purple-600">{myClients.length}</p>
            </div>
            <User className="w-10 h-10 text-purple-600 opacity-20" />
          </div>
        </Card>
      </div>

      <Tabs defaultValue="today" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="clients">My Clients</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-6">
          {todayShifts.length === 0 ? (
            <Card className="p-12 text-center">
              <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No Shifts Today</h3>
              <p className="text-slate-500">Enjoy your day off! Check upcoming shifts for your schedule.</p>
            </Card>
          ) : (
            todayShifts.map((shift) => {
              const client = getClientInfo(shift.client_id);
              return (
                <div key={shift.id}>

                  <Card className="p-6 bg-gradient-to-br from-teal-50 to-white border-2 border-teal-100">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-teal-600 text-white">
                            {format(new Date(shift.start_time), 'h:mm a')} - {format(new Date(shift.end_time), 'h:mm a')}
                          </Badge>
                          <Badge variant="outline" className={
                            shift.status === 'scheduled' ? 'border-blue-500 text-blue-700' :
                            shift.status === 'in_progress' ? 'border-green-500 text-green-700' :
                            'border-slate-500 text-slate-700'
                          }>
                            {shift.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">{shift.client_name}</h2>
                      </div>
                      <Clock className="w-8 h-8 text-teal-600" />
                    </div>

                    <div className="space-y-3 mb-4">
                      {client && (
                        <>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Phone className="w-4 h-4" />
                            <a href={`tel:${client.phone}`} className="hover:text-teal-600">{client.phone}</a>
                          </div>
                          <div className="flex items-start gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-slate-600 mt-0.5" />
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shift.client_address || client.address || '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-teal-600 hover:text-teal-700 underline"
                            >
                              {shift.client_address || client.address || 'Address not available'}
                            </a>
                          </div>
                        </>
                      )}
                    </div>

                    {/* GPS Warning */}
                    {gpsWarning && (
                      <Alert className="border-orange-200 bg-orange-50 mb-4">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-orange-800">
                          <p className="font-medium mb-2">You appear to be away from the client's location.</p>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setGpsWarning(false)}
                            >
                              Cancel
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => handleClockIn(true)}
                              className="bg-orange-600 hover:bg-orange-700"
                            >
                              Clock In Anyway
                            </Button>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Clock In/Out Button */}
                    {shift.status === 'scheduled' && (
                      <Button 
                        onClick={() => handleClockIn(false)}
                        disabled={clockingIn}
                        className="w-full h-14 text-lg font-semibold bg-teal-600 hover:bg-teal-700 mb-4"
                      >
                        <Clock className="w-5 h-5 mr-2" />
                        {clockingIn ? 'Getting Location...' : 'CLOCK IN'}
                      </Button>
                    )}

                    {shift.status === 'in_progress' && (
                      <Alert className="border-green-200 bg-green-50 mb-4">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          Currently clocked in • Started at {format(new Date(shift.check_in_time), 'h:mm a')}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Tasks */}
                    {shift.tasks && shift.tasks.length > 0 && (
                      <div className="border-t pt-4">
                        <div className="flex items-center gap-2 mb-3">
                          <ClipboardList className="w-4 h-4 text-slate-600" />
                          <h3 className="font-semibold text-slate-900 text-sm">Tasks for this visit</h3>
                        </div>
                        <div className="space-y-2">
                          {shift.tasks.map((task, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded-lg text-sm">
                              <div className="w-4 h-4 rounded border-2 border-slate-300" />
                              <span className="text-slate-700">{task.task}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {shift.notes && (
                      <div className="border-t pt-4 mt-4">
                        <h3 className="font-semibold text-slate-900 text-sm mb-2">Special Instructions</h3>
                        <p className="text-sm text-slate-700">{shift.notes}</p>
                      </div>
                    )}
                  </Card>
                </div>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingShifts.length === 0 ? (
            <Card className="p-12 text-center">
              <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No Upcoming Shifts</h3>
              <p className="text-slate-500">You don't have any shifts scheduled for this week.</p>
            </Card>
          ) : (
            upcomingShifts.map((shift) => {
              const client = getClientInfo(shift.client_id);
              return (
                <Card key={shift.id} className="p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                          {format(new Date(shift.start_time), 'EEEE, MMM d')}
                        </Badge>
                        <Badge className="bg-slate-100 text-slate-700">
                          {format(new Date(shift.start_time), 'h:mm a')} - {format(new Date(shift.end_time), 'h:mm a')}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">{shift.client_name}</h3>
                      {client && (
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            <span>{client.phone}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="truncate max-w-xs">{client.address}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          {myClients.length === 0 ? (
            <Card className="p-12 text-center">
              <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No Clients Assigned</h3>
              <p className="text-slate-500">You don't have any assigned clients yet.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myClients.map((client) => {
                const clientShifts = shifts.filter(s => s.client_id === client.id);
                const upcomingCount = clientShifts.filter(s => isFuture(new Date(s.start_time))).length;
                
                return (
                  <Card key={client.id} className="p-5 hover:shadow-lg transition-shadow">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                        {client.name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-slate-900 mb-1">{client.name}</h3>
                        <div className="space-y-1 text-sm text-slate-600 mb-3">
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <a href={`tel:${client.phone}`} className="hover:text-teal-600">{client.phone}</a>
                          </div>
                          <div className="flex items-start gap-2">
                            <Home className="w-4 h-4 mt-0.5" />
                            <span className="line-clamp-2">{client.address}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {upcomingCount} upcoming shifts
                          </Badge>
                          <Link to={createPageUrl('Clients')} className="text-xs text-teal-600 hover:text-teal-700 font-medium">
                            View Details →
                          </Link>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks">
          <AssignedTasksList />
        </TabsContent>
      </Tabs>
    </div>
  );
}