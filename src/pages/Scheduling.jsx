import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from "sonner";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  addDays,
  startOfDay,
  endOfDay,
  setHours,
  getHours,
  getMinutes
} from 'date-fns';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Calendar, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  User,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle,
  Filter,
  BarChart3,
  AlertTriangle,
  List,
  Grid3x3,
  Search,
  Copy
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import ShiftForm from '@/components/scheduling/ShiftForm';
import AIScheduleOptimizer from '@/components/scheduling/AIScheduleOptimizer';

const statusColors = {
  scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  missed: 'bg-rose-100 text-rose-700 border-rose-200',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function Scheduling() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [deleteShift, setDeleteShift] = useState(null);
  const [filterCaregiver, setFilterCaregiver] = useState('all');
  const [filterClient, setFilterClient] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('month');
  const [searchQuery, setSearchQuery] = useState('');
  
  const queryClient = useQueryClient();

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list('-start_time'),
  });

  const { data: caregivers = [] } = useQuery({
    queryKey: ['caregivers'],
    queryFn: () => base44.entities.Caregiver.list(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  // Filter shifts
  const filteredShifts = shifts.filter(shift => {
    if (filterCaregiver !== 'all' && shift.caregiver_id !== filterCaregiver) return false;
    if (filterClient !== 'all' && shift.client_id !== filterClient) return false;
    if (filterStatus !== 'all' && shift.status !== filterStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        shift.client_name?.toLowerCase().includes(query) ||
        shift.caregiver_name?.toLowerCase().includes(query) ||
        shift.notes?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getShiftsForDay = (date) => {
    return filteredShifts.filter(shift => isSameDay(new Date(shift.start_time), date));
  };

  const selectedDayShifts = getShiftsForDay(selectedDate);

  // Color coding for shifts
  const caregiverColors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 
    'bg-orange-500', 'bg-teal-500', 'bg-indigo-500', 'bg-rose-500'
  ];
  
  const getCaregiverColor = (caregiverId) => {
    const index = caregivers.findIndex(c => c.id === caregiverId);
    return caregiverColors[index % caregiverColors.length] || 'bg-blue-500';
  };

  const getBorderColor = (caregiverId) => {
    const color = getCaregiverColor(caregiverId);
    return color.replace('bg-', '#').replace('500', '');
  };

  // Stats
  const todayShifts = filteredShifts.filter(s => isToday(new Date(s.start_time)));
  const weekShifts = filteredShifts.filter(s => 
    new Date(s.start_time) >= startOfWeek(new Date()) && 
    new Date(s.start_time) <= endOfWeek(new Date())
  );
  const conflictCount = filteredShifts.filter((s1, i) => 
    filteredShifts.some((s2, j) => i < j && 
      s1.caregiver_id === s2.caregiver_id &&
      s1.status !== 'cancelled' && s2.status !== 'cancelled' &&
      new Date(s1.start_time) < new Date(s2.end_time) &&
      new Date(s1.end_time) > new Date(s2.start_time)
    )
  ).length;

  const handleEdit = (shift) => {
    setEditingShift(shift);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (deleteShift) {
      try {
        await base44.entities.Shift.delete(deleteShift.id);
        queryClient.invalidateQueries({ queryKey: ['shifts'] });
        toast.success('Shift deleted successfully');
        setDeleteShift(null);
      } catch (error) {
        toast.error('Failed to delete shift');
      }
    }
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingShift(null);
  };

  const handleSave = () => {
    queryClient.invalidateQueries({ queryKey: ['shifts'] });
  };

  const handleDuplicate = (shift) => {
    const duplicatedShift = {
      ...shift,
      id: undefined,
      status: 'scheduled',
      check_in_time: null,
      check_out_time: null,
      start_time: format(addDays(new Date(shift.start_time), 7), "yyyy-MM-dd'T'HH:mm"),
      end_time: format(addDays(new Date(shift.end_time), 7), "yyyy-MM-dd'T'HH:mm"),
    };
    setEditingShift(duplicatedShift);
    setFormOpen(true);
  };

  const handleStatusUpdate = async (shift, newStatus) => {
    try {
      const updates = { status: newStatus };
      
      if (newStatus === 'completed') {
        updates.check_out_time = new Date().toISOString();
      } else if (newStatus === 'in_progress') {
        updates.check_in_time = new Date().toISOString();
      }
      
      await base44.entities.Shift.update(shift.id, updates);
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success(`Shift marked as ${(newStatus || 'scheduled').replace('_', ' ')}`);
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('Failed to update shift status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Scheduling</h1>
          <p className="text-slate-500 mt-1">Manage shifts and appointments</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white border border-slate-200 rounded-lg p-1">
            <Button
              size="sm"
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              onClick={() => setViewMode('month')}
              className={viewMode === 'month' ? 'bg-teal-600 hover:bg-teal-700' : ''}
            >
              <Calendar className="w-4 h-4 mr-1" />
              Month
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              onClick={() => setViewMode('week')}
              className={viewMode === 'week' ? 'bg-teal-600 hover:bg-teal-700' : ''}
            >
              <Grid3x3 className="w-4 h-4 mr-1" />
              Week
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-teal-600 hover:bg-teal-700' : ''}
            >
              <List className="w-4 h-4 mr-1" />
              List
            </Button>
          </div>
          <AIScheduleOptimizer onShiftCreate={() => queryClient.invalidateQueries({ queryKey: ['shifts'] })} />
          <Button 
            onClick={() => setFormOpen(true)}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Shift
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-white border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Today</p>
              <p className="text-2xl font-bold text-blue-600">{todayShifts.length}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-50 to-white border-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">This Week</p>
              <p className="text-2xl font-bold text-green-600">{weekShifts.length}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-green-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-50 to-white border-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Active Caregivers</p>
              <p className="text-2xl font-bold text-purple-600">
                {new Set(filteredShifts.map(s => s.caregiver_id)).size}
              </p>
            </div>
            <User className="w-8 h-8 text-purple-600 opacity-20" />
          </div>
        </Card>

        <Card className={cn(
          "p-4 bg-gradient-to-br border",
          conflictCount > 0 
            ? "from-red-50 to-white border-red-100" 
            : "from-emerald-50 to-white border-emerald-100"
        )}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Conflicts</p>
              <p className={cn(
                "text-2xl font-bold",
                conflictCount > 0 ? "text-red-600" : "text-emerald-600"
              )}>
                {conflictCount}
              </p>
            </div>
            {conflictCount > 0 ? (
              <AlertTriangle className="w-8 h-8 text-red-600 opacity-20" />
            ) : (
              <CheckCircle className="w-8 h-8 text-emerald-600 opacity-20" />
            )}
          </div>
        </Card>
      </div>



        {/* Filters & Search */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-slate-600" />
            <h3 className="font-medium text-slate-900">Filters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search shifts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          <Select value={filterCaregiver} onValueChange={setFilterCaregiver}>
            <SelectTrigger>
              <SelectValue placeholder="All Caregivers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Caregivers</SelectItem>
              {caregivers.map(cg => (
                <SelectItem key={cg.id} value={cg.id}>{cg.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger>
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map(cl => (
                <SelectItem key={cl.id} value={cl.id}>{cl.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="missed">Missed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {viewMode === 'list' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="space-y-3">
            {filteredShifts.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No shifts found</p>
              </div>
            ) : (
              filteredShifts.map((shift) => (
                <div 
                  key={shift.id}
                  className="p-4 rounded-xl border-2 transition-all hover:shadow-md"
                  style={{ borderColor: getBorderColor(shift.caregiver_id) }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-slate-900">{shift.client_name}</h4>
                        <Badge className={cn("text-xs", statusColors[shift.status || 'scheduled'])}>
                          {(shift.status || 'scheduled').replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-600 space-y-1">
                        <p><User className="w-3 h-3 inline mr-1" />{shift.caregiver_name}</p>
                        <p><Clock className="w-3 h-3 inline mr-1" />
                          {format(new Date(shift.start_time), 'MMM d, h:mm a')} - {format(new Date(shift.end_time), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {shift.status === 'in_progress' && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(shift, 'completed')}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          Complete
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(shift)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(shift)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          {shift.status === 'scheduled' && (
                            <DropdownMenuItem onClick={() => handleStatusUpdate(shift, 'in_progress')}>
                              <Clock className="w-4 h-4 mr-2" />
                              Start Shift
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => setDeleteShift(shift)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {viewMode === 'month' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setCurrentMonth(new Date());
                  setSelectedDate(new Date());
                }}
              >
                Today
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div 
                key={day} 
                className="text-center text-xs font-medium text-slate-500 py-2"
              >
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {calendarDays.map((day) => {
              const dayShifts = getShiftsForDay(day);
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "relative min-h-[80px] p-2 text-left rounded-xl transition-colors",
                    isCurrentMonth ? "bg-white" : "bg-slate-50/50",
                    isSelected && "ring-2 ring-teal-500 ring-offset-2",
                    !isSelected && "hover:bg-slate-50"
                  )}
                >
                  <span className={cn(
                    "inline-flex items-center justify-center w-7 h-7 text-sm rounded-full",
                    isToday(day) && "bg-teal-600 text-white font-medium",
                    !isToday(day) && isCurrentMonth && "text-slate-900",
                    !isCurrentMonth && "text-slate-400"
                  )}>
                    {format(day, 'd')}
                  </span>
                  
                  {dayShifts.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {dayShifts.slice(0, 2).map((shift) => (
                        <div 
                          key={shift.id}
                          className={cn(
                            "text-xs px-1.5 py-0.5 rounded truncate text-white font-medium",
                            getCaregiverColor(shift.caregiver_id)
                          )}
                          title={`${shift.caregiver_name} → ${shift.client_name}`}
                        >
                          {shift.client_name}
                        </div>
                      ))}
                      {dayShifts.length > 2 && (
                        <div className="text-xs text-slate-500 px-1.5 font-medium">
                          +{dayShifts.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-slate-900">
                {format(selectedDate, 'EEEE')}
              </h3>
              <p className="text-sm text-slate-500">
                {format(selectedDate, 'MMMM d, yyyy')}
              </p>
            </div>
            <Button 
              size="sm" 
              onClick={() => setFormOpen(true)}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-3">
            {selectedDayShifts.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500">No shifts scheduled</p>
              </div>
            ) : (
              selectedDayShifts.map((shift) => (
                <div 
                  key={shift.id}
                  className="p-4 rounded-xl border-2 transition-all hover:shadow-md"
                  style={{ borderColor: getBorderColor(shift.caregiver_id) }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900">{shift.client_name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={cn("text-xs", statusColors[shift.status || 'scheduled'])}>
                          {(shift.status || 'scheduled').replace('_', ' ')}
                        </Badge>
                        <div className={cn(
                          "w-3 h-3 rounded-full",
                          getCaregiverColor(shift.caregiver_id)
                        )} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                     {shift.status === 'in_progress' && (
                       <Button
                         size="sm"
                         onClick={() => handleStatusUpdate(shift, 'completed')}
                         className="bg-emerald-600 hover:bg-emerald-700 text-white"
                       >
                         <CheckCircle className="w-3.5 h-3.5 mr-1" />
                         Complete
                       </Button>
                     )}
                     <DropdownMenu>
                       <DropdownMenuTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-8 w-8">
                           <MoreVertical className="w-4 h-4" />
                         </Button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent align="end">
                         <DropdownMenuItem onClick={() => handleEdit(shift)}>
                           <Edit className="w-4 h-4 mr-2" />
                           Edit
                         </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => handleDuplicate(shift)}>
                           <Copy className="w-4 h-4 mr-2" />
                           Duplicate
                         </DropdownMenuItem>
                         {shift.status === 'scheduled' && (
                           <DropdownMenuItem onClick={() => handleStatusUpdate(shift, 'in_progress')}>
                             <Clock className="w-4 h-4 mr-2" />
                             Start Shift
                           </DropdownMenuItem>
                         )}
                         {shift.status === 'in_progress' && (
                           <DropdownMenuItem onClick={() => handleStatusUpdate(shift, 'completed')}>
                             <CheckCircle className="w-4 h-4 mr-2" />
                             Complete
                           </DropdownMenuItem>
                         )}
                         <DropdownMenuSeparator />
                         <DropdownMenuItem 
                           onClick={() => setDeleteShift(shift)}
                           className="text-red-600"
                         >
                           <Trash2 className="w-4 h-4 mr-2" />
                           Delete
                         </DropdownMenuItem>
                       </DropdownMenuContent>
                     </DropdownMenu>
                    </div>
                    </div>
                  
                  <div className="space-y-1.5 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{shift.caregiver_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {format(new Date(shift.start_time), 'h:mm a')} - {format(new Date(shift.end_time), 'h:mm a')}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        </div>
      )}

      {viewMode === 'week' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Week of {format(startOfWeek(selectedDate), 'MMM d, yyyy')}
            </h2>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setSelectedDate(subMonths(selectedDate, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedDate(new Date())}
              >
                Today
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setSelectedDate(addMonths(selectedDate, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-8 gap-2">
            <div className="text-xs text-slate-500 font-medium py-2">Time</div>
            {eachDayOfInterval({ 
              start: startOfWeek(selectedDate), 
              end: endOfWeek(selectedDate) 
            }).map((day) => (
              <div key={day.toISOString()} className="text-center">
                <p className="text-xs text-slate-500">{format(day, 'EEE')}</p>
                <p className={cn(
                  "text-sm font-medium",
                  isToday(day) ? "text-teal-600" : "text-slate-900"
                )}>
                  {format(day, 'd')}
                </p>
              </div>
            ))}

            {[...Array(24)].map((_, hour) => (
              <React.Fragment key={hour}>
                <div className="text-xs text-slate-400 py-2">
                  {format(setHours(new Date(), hour), 'ha')}
                </div>
                {eachDayOfInterval({ 
                  start: startOfWeek(selectedDate), 
                  end: endOfWeek(selectedDate) 
                }).map((day) => {
                  const dayShifts = getShiftsForDay(day).filter(shift => {
                    const shiftHour = getHours(new Date(shift.start_time));
                    return shiftHour === hour;
                  });
                  
                  return (
                    <div 
                      key={day.toISOString()} 
                      className="min-h-[40px] border border-slate-100 rounded p-1"
                    >
                      {dayShifts.map(shift => (
                        <div
                          key={shift.id}
                          className={cn(
                            "text-xs px-1.5 py-0.5 rounded mb-1 text-white font-medium truncate cursor-pointer",
                            getCaregiverColor(shift.caregiver_id)
                          )}
                          onClick={() => handleEdit(shift)}
                          title={`${shift.client_name} - ${shift.caregiver_name}`}
                        >
                          {shift.client_name}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Shift Form Dialog */}
      <ShiftForm
        shift={editingShift}
        open={formOpen}
        onOpenChange={handleFormClose}
        onSave={handleSave}
        selectedDate={selectedDate}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteShift} onOpenChange={() => setDeleteShift(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shift</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this shift? This action cannot be undone.
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