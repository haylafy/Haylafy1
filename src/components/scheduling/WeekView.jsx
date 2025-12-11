import React from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, User, MoreVertical, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const statusColors = {
  scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  missed: 'bg-rose-100 text-rose-700 border-rose-200',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function WeekView({ selectedDate, shifts, onDateChange, onEdit, onDelete, onStatusUpdate }) {
  const weekStart = startOfWeek(selectedDate);
  const weekEnd = endOfWeek(selectedDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getShiftsForDay = (date) => {
    return shifts.filter(shift => isSameDay(new Date(shift.start_time), date));
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-900">
          {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
        </h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => onDateChange(subWeeks(selectedDate, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onDateChange(new Date())}
          >
            This Week
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => onDateChange(addWeeks(selectedDate, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const dayShifts = getShiftsForDay(day);
          const isCurrentDay = isToday(day);
          
          return (
            <div 
              key={day.toISOString()} 
              className={cn(
                "min-h-[400px] rounded-xl border transition-all",
                isCurrentDay ? "border-teal-500 ring-2 ring-teal-100" : "border-slate-200"
              )}
            >
              {/* Day header */}
              <div className={cn(
                "p-3 border-b",
                isCurrentDay ? "bg-teal-50 border-teal-200" : "bg-slate-50 border-slate-200"
              )}>
                <div className="text-center">
                  <p className="text-xs font-medium text-slate-600 uppercase">
                    {format(day, 'EEE')}
                  </p>
                  <p className={cn(
                    "text-xl font-bold mt-1",
                    isCurrentDay ? "text-teal-600" : "text-slate-900"
                  )}>
                    {format(day, 'd')}
                  </p>
                </div>
              </div>

              {/* Shifts */}
              <div className="p-2 space-y-2">
                {dayShifts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-xs text-slate-400">No shifts</p>
                  </div>
                ) : (
                  dayShifts.map((shift) => (
                    <div
                      key={shift.id}
                      className={cn(
                        "p-2 rounded-lg border text-xs transition-all hover:shadow-md",
                        statusColors[shift.status]
                      )}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="font-medium truncate pr-1">{shift.client_name}</div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5 flex-shrink-0">
                              <MoreVertical className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(shift)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {shift.status === 'scheduled' && (
                              <>
                                <DropdownMenuItem onClick={() => onStatusUpdate(shift, 'in_progress')}>
                                  <Clock className="w-4 h-4 mr-2" />
                                  Start
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onStatusUpdate(shift, 'missed')}>
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Missed
                                </DropdownMenuItem>
                              </>
                            )}
                            {shift.status === 'in_progress' && (
                              <DropdownMenuItem onClick={() => onStatusUpdate(shift, 'completed')}>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Complete
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => onDelete(shift)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="space-y-0.5 text-[10px]">
                        <div className="flex items-center gap-1">
                          <User className="w-2.5 h-2.5" />
                          <span className="truncate">{shift.caregiver_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{format(new Date(shift.start_time), 'h:mm a')}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Week Summary */}
      <div className="mt-6 grid grid-cols-5 gap-4">
        <div className="text-center p-3 bg-slate-50 rounded-lg">
          <p className="text-2xl font-bold text-slate-900">{shifts.length}</p>
          <p className="text-xs text-slate-600 mt-1">Total Shifts</p>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <p className="text-2xl font-bold text-blue-600">
            {shifts.filter(s => s.status === 'scheduled').length}
          </p>
          <p className="text-xs text-blue-700 mt-1">Scheduled</p>
        </div>
        <div className="text-center p-3 bg-amber-50 rounded-lg">
          <p className="text-2xl font-bold text-amber-600">
            {shifts.filter(s => s.status === 'in_progress').length}
          </p>
          <p className="text-xs text-amber-700 mt-1">In Progress</p>
        </div>
        <div className="text-center p-3 bg-emerald-50 rounded-lg">
          <p className="text-2xl font-bold text-emerald-600">
            {shifts.filter(s => s.status === 'completed').length}
          </p>
          <p className="text-xs text-emerald-700 mt-1">Completed</p>
        </div>
        <div className="text-center p-3 bg-rose-50 rounded-lg">
          <p className="text-2xl font-bold text-rose-600">
            {shifts.filter(s => s.status === 'missed').length}
          </p>
          <p className="text-xs text-rose-700 mt-1">Missed</p>
        </div>
      </div>
    </div>
  );
}