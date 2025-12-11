import React from 'react';
import { format, isToday, isTomorrow } from 'date-fns';
import { Clock, MapPin, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700' },
  missed: { label: 'Missed', color: 'bg-rose-100 text-rose-700' },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-700' },
};

export default function ShiftsList({ shifts, title = "Upcoming Shifts" }) {
  const formatShiftDate = (dateStr) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
      <div className="p-6 border-b border-slate-100">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {shifts.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500">No shifts scheduled</p>
          </div>
        ) : (
          shifts.map((shift) => (
            <div key={shift.id} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center">
                  <span className="text-xs font-medium text-slate-500">{format(new Date(shift.start_time), 'EEE')}</span>
                  <span className="text-lg font-bold text-slate-900">{format(new Date(shift.start_time), 'd')}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-slate-900 truncate">{shift.client_name}</h4>
                    <Badge className={cn("text-xs", statusConfig[shift.status]?.color)}>
                      {statusConfig[shift.status]?.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {shift.caregiver_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {format(new Date(shift.start_time), 'h:mm a')} - {format(new Date(shift.end_time), 'h:mm a')}
                    </span>
                  </div>
                </div>
                {shift.status === 'in_progress' && (
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}