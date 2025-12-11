import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format } from 'date-fns';
import { Clock, User, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export default function DragDropScheduler({ 
  shifts, 
  onDragEnd, 
  onEdit, 
  onDelete,
  groupBy = 'date' // 'date' or 'caregiver'
}) {
  const groupedShifts = React.useMemo(() => {
    const groups = {};
    
    shifts.forEach(shift => {
      const key = groupBy === 'date' 
        ? format(new Date(shift.start_time), 'yyyy-MM-dd')
        : shift.caregiver_id;
      
      if (!groups[key]) {
        groups[key] = {
          id: key,
          title: groupBy === 'date' 
            ? format(new Date(shift.start_time), 'EEEE, MMM d')
            : shift.caregiver_name,
          shifts: []
        };
      }
      groups[key].shifts.push(shift);
    });
    
    return Object.values(groups).sort((a, b) => a.id.localeCompare(b.id));
  }, [shifts, groupBy]);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="space-y-4">
        {groupedShifts.map(group => (
          <div key={group.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900 mb-3">{group.title}</h3>
            
            <Droppable droppableId={group.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    "space-y-2 min-h-[100px] p-2 rounded-lg transition-colors",
                    snapshot.isDraggingOver && "bg-teal-50 border-2 border-dashed border-teal-300"
                  )}
                >
                  {group.shifts.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      Drop shifts here
                    </div>
                  ) : (
                    group.shifts.map((shift, index) => (
                      <Draggable key={shift.id} draggableId={shift.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              "p-3 rounded-lg border border-slate-200 bg-white transition-shadow",
                              snapshot.isDragging && "shadow-lg ring-2 ring-teal-500"
                            )}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-medium text-slate-900 text-sm">{shift.client_name}</h4>
                                <Badge className={cn("text-xs mt-1", statusColors[shift.status])}>
                                  {shift.status?.replace('_', ' ')}
                                </Badge>
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
                            
                            <div className="space-y-1 text-xs text-slate-600">
                              <div className="flex items-center gap-2">
                                <User className="w-3 h-3 text-slate-400" />
                                <span>{shift.caregiver_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>
                                  {format(new Date(shift.start_time), 'h:mm a')} - {format(new Date(shift.end_time), 'h:mm a')}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}