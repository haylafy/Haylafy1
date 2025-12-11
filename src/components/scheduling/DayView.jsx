import React from 'react';
import { format, eachHourOfInterval, startOfDay, endOfDay, addDays, subDays, isWithinInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Clock, User, MoreVertical, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
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

export default function DayView({ selectedDate, shifts, onDateChange, onEdit, onDelete, onStatusUpdate, onAddShift }) {
  const dayStart = startOfDay(selectedDate);
  const dayEnd = endOfDay(selectedDate);
  const hours = eachHourOfInterval({ start: dayStart, end: dayEnd });

  const getShiftsForHour = (hour) => {
    return shifts.filter(shift => {
      const shiftStart = new Date(shift.start_time);
      const shiftEnd = new Date(shift.end_time);
      const hourEnd = new Date(hour.getTime() + 60 * 60 * 1000);
      
      return (
        (shiftStart >= hour && shiftStart < hourEnd) ||
        (shiftStart <= hour && shiftEnd > hour)
      );
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {format(selectedDate, 'EEEE')}
          </h2>
          <p className="text-slate-500 mt-1">{format(selectedDate, 'MMMM d, yyyy')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => onDateChange(subDays(selectedDate, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onDateChange(new Date())}
          >
            Today
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => onDateChange(addDays(selectedDate, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button 
            onClick={onAddShift}
            className="bg-teal-600 hover:bg-teal-700 ml-2"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Shift
          </Button>
        </div>
      </div>

      {/* Day Schedule */}
      <div className="space-y-0 border border-slate-200 rounded-lg overflow-hidden">
        {hours.map((hour) => {
          const hourShifts = getShiftsForHour(hour);
          
          return (
            <div key={hour.toISOString()} className="flex border-b border-slate-100 last:border-b-0">
              {/* Time column */}
              <div className="w-20 flex-shrink-0 bg-slate-50 p-3 text-sm font-medium text-slate-600 border-r border-slate-200">
                {format(hour, 'h:mm a')}
              </div>
              
              {/* Shifts column */}
              <div className="flex-1 p-3 min-h-[60px]">
                {hourShifts.length === 0 ? (
                  <div className="h-full"></div>
                ) : (
                  <div className="space-y-2">
                    {hourShifts.map((shift) => (
                      <div
                        key={shift.id}
                        className={cn(
                          "p-3 rounded-lg border transition-all",
                          statusColors[shift.status],
                          "hover:shadow-md"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-sm">{shift.client_name}</h4>
                              <Badge variant="secondary" className="text-xs">
                                {shift.status?.replace('_', ' ')}
                              </Badge>
                            </div>
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center gap-2 text-slate-700">
                                <User className="w-3 h-3" />
                                <span>{shift.caregiver_name}</span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-700">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {format(new Date(shift.start_time), 'h:mm a')} - {format(new Date(shift.end_time), 'h:mm a')}
                                </span>
                              </div>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreVertical className="w-3.5 h-3.5" />
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
                                    Start Shift
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => onStatusUpdate(shift, 'missed')}>
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Mark as Missed
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
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 grid grid-cols-4 gap-4">
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