import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, isPast, isFuture, isToday } from 'date-fns';
import { Calendar, Clock, User, CheckCircle, MapPin } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const statusConfig = {
  scheduled: { color: 'bg-blue-100 text-blue-700', icon: Calendar },
  in_progress: { color: 'bg-green-100 text-green-700', icon: Clock },
  completed: { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  missed: { color: 'bg-red-100 text-red-700', icon: Calendar },
  cancelled: { color: 'bg-slate-100 text-slate-600', icon: Calendar },
};

export default function UpcomingVisits({ clientId }) {
  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['client-shifts', clientId],
    queryFn: () => base44.entities.Shift.list('-start_time'),
    enabled: !!clientId,
    select: (data) => data.filter(shift => shift.client_id === clientId)
  });

  const upcomingShifts = shifts.filter(s => isFuture(new Date(s.start_time)) || isToday(new Date(s.start_time)));
  const pastShifts = shifts.filter(s => isPast(new Date(s.start_time)) && !isToday(new Date(s.start_time)));

  const VisitCard = ({ shift }) => {
    const StatusIcon = statusConfig[shift.status]?.icon || Calendar;
    
    return (
      <Card className="p-5 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className={statusConfig[shift.status]?.color || 'bg-slate-100 text-slate-700'}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {shift.status.replace('_', ' ')}
              </Badge>
              {isToday(new Date(shift.start_time)) && (
                <Badge className="bg-amber-100 text-amber-700">Today</Badge>
              )}
            </div>
            <h3 className="font-semibold text-slate-900">
              {format(new Date(shift.start_time), 'EEEE, MMMM d, yyyy')}
            </h3>
            <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
              <Clock className="w-4 h-4" />
              <span>
                {format(new Date(shift.start_time), 'h:mm a')} - {format(new Date(shift.end_time), 'h:mm a')}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-slate-400" />
            <span className="text-slate-700">
              <span className="font-medium">Caregiver:</span> {shift.caregiver_name}
            </span>
          </div>

          {shift.service_type && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700">
                <span className="font-medium">Service:</span> {shift.service_type.replace('_', ' ')}
              </span>
            </div>
          )}

          {shift.notes && (
            <div className="mt-3 p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">{shift.notes}</p>
            </div>
          )}

          {shift.status === 'completed' && shift.check_in_time && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Completed: {format(new Date(shift.check_in_time), 'h:mm a')} - {format(new Date(shift.check_out_time), 'h:mm a')}
              </p>
            </div>
          )}
        </div>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <Tabs defaultValue="upcoming" className="space-y-4">
      <TabsList>
        <TabsTrigger value="upcoming">
          Upcoming ({upcomingShifts.length})
        </TabsTrigger>
        <TabsTrigger value="past">
          Past Visits ({pastShifts.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="upcoming" className="space-y-4">
        {upcomingShifts.length === 0 ? (
          <Card className="p-12 text-center">
            <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Upcoming Visits</h3>
            <p className="text-slate-500">Your next scheduled visit will appear here.</p>
          </Card>
        ) : (
          upcomingShifts.map(shift => <VisitCard key={shift.id} shift={shift} />)
        )}
      </TabsContent>

      <TabsContent value="past" className="space-y-4">
        {pastShifts.length === 0 ? (
          <Card className="p-12 text-center">
            <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Past Visits</h3>
            <p className="text-slate-500">Your visit history will appear here.</p>
          </Card>
        ) : (
          pastShifts.slice(0, 20).map(shift => <VisitCard key={shift.id} shift={shift} />)
        )}
      </TabsContent>
    </Tabs>
  );
}