import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  GraduationCap, 
  Plus, 
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Award,
  ClipboardList,
  Shield,
  Package,
  MoreVertical,
  Edit,
  Trash2,
  ExternalLink,
  Filter
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { cn } from "@/lib/utils";
import OnboardingTaskForm from '@/components/onboarding/OnboardingTaskForm';

const taskTypeIcons = {
  document: FileText,
  training: Award,
  orientation: GraduationCap,
  compliance: Shield,
  equipment: Package,
  other: ClipboardList,
};

const taskTypeColors = {
  document: 'bg-blue-100 text-blue-700 border-blue-200',
  training: 'bg-purple-100 text-purple-700 border-purple-200',
  orientation: 'bg-teal-100 text-teal-700 border-teal-200',
  compliance: 'bg-rose-100 text-rose-700 border-rose-200',
  equipment: 'bg-amber-100 text-amber-700 border-amber-200',
  other: 'bg-slate-100 text-slate-700 border-slate-200',
};

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: Clock },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  not_applicable: { label: 'N/A', color: 'bg-slate-100 text-slate-600', icon: AlertCircle },
};

export default function Onboarding() {
  const [search, setSearch] = useState('');
  const [caregiverFilter, setCaregiverFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteTask, setDeleteTask] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['onboarding-tasks'],
    queryFn: () => base44.entities.OnboardingTask.list('-created_date'),
  });

  const { data: caregivers = [] } = useQuery({
    queryKey: ['caregivers'],
    queryFn: () => base44.entities.Caregiver.list(),
  });

  const isLoading = loadingTasks;

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = 
      task.caregiver_name?.toLowerCase().includes(search.toLowerCase()) ||
      task.task_name?.toLowerCase().includes(search.toLowerCase());
    const matchesCaregiver = caregiverFilter === 'all' || task.caregiver_id === caregiverFilter;
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    return matchesSearch && matchesCaregiver && matchesStatus;
  });

  // Group by caregiver
  const caregiverProgress = caregivers.map(caregiver => {
    const cgTasks = tasks.filter(t => t.caregiver_id === caregiver.id);
    const completed = cgTasks.filter(t => t.status === 'completed').length;
    const total = cgTasks.length;
    const progress = total > 0 ? (completed / total) * 100 : 0;
    
    return {
      caregiver,
      tasks: cgTasks,
      completed,
      total,
      progress,
      pending: cgTasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length,
    };
  }).filter(cp => cp.total > 0);

  const handleEdit = (task) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (deleteTask) {
      await base44.entities.OnboardingTask.delete(deleteTask.id);
      queryClient.invalidateQueries({ queryKey: ['onboarding-tasks'] });
      setDeleteTask(null);
    }
  };

  const handleMarkComplete = async (task) => {
    await base44.entities.OnboardingTask.update(task.id, {
      ...task,
      status: 'completed',
      completed_date: new Date().toISOString().split('T')[0],
    });
    queryClient.invalidateQueries({ queryKey: ['onboarding-tasks'] });
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingTask(null);
  };

  const handleSave = () => {
    queryClient.invalidateQueries({ queryKey: ['onboarding-tasks'] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">HR Onboarding</h1>
          <p className="text-slate-500 mt-1">Manage new hire onboarding and training</p>
        </div>
        <Button 
          onClick={() => setFormOpen(true)}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">All Tasks</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Active Onboarding</p>
                  <p className="text-2xl font-bold text-slate-900">{caregiverProgress.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Pending Tasks</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Completed</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {tasks.filter(t => t.status === 'completed').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Tasks</p>
                  <p className="text-2xl font-bold text-slate-900">{tasks.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Caregiver Progress */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-semibold text-slate-900 mb-6">Caregiver Onboarding Progress</h3>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            ) : caregiverProgress.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <GraduationCap className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500">No onboarding in progress</p>
              </div>
            ) : (
              <div className="space-y-4">
                {caregiverProgress.map(({ caregiver, tasks, completed, total, progress, pending }) => (
                  <div key={caregiver.id} className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                          {caregiver.name?.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-900">{caregiver.name}</h4>
                          <p className="text-sm text-slate-500">
                            {completed} of {total} tasks completed
                            {pending > 0 && ` • ${pending} pending`}
                          </p>
                        </div>
                      </div>
                      <Badge className={cn(
                        "text-xs",
                        progress === 100 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {Math.round(progress)}%
                      </Badge>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* All Tasks Tab */}
        <TabsContent value="tasks" className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={caregiverFilter} onValueChange={setCaregiverFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Caregivers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Caregivers</SelectItem>
                {caregivers.map((cg) => (
                  <SelectItem key={cg.id} value={cg.id}>{cg.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="not_applicable">Not Applicable</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tasks List */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-slate-100">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <ClipboardList className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No tasks found</h3>
              <p className="text-slate-500 mb-6">
                {search || caregiverFilter !== 'all' || statusFilter !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Create your first onboarding task'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const TaskIcon = taskTypeIcons[task.task_type] || ClipboardList;
                const StatusIcon = statusConfig[task.status]?.icon || Clock;
                
                return (
                  <div
                    key={task.id}
                    className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center border",
                        taskTypeColors[task.task_type]
                      )}>
                        <TaskIcon className="w-6 h-6" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-slate-900">{task.task_name}</h4>
                            <p className="text-sm text-slate-600">{task.caregiver_name}</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(task)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              {task.status !== 'completed' && (
                                <DropdownMenuItem onClick={() => handleMarkComplete(task)}>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Mark Complete
                                </DropdownMenuItem>
                              )}
                              {task.document_url && (
                                <DropdownMenuItem asChild>
                                  <a href={task.document_url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    View Document
                                  </a>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => setDeleteTask(task)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <Badge className={cn("", statusConfig[task.status]?.color)}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig[task.status]?.label}
                          </Badge>
                          
                          {task.due_date && (
                            <span className="text-slate-500 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              Due {format(new Date(task.due_date), 'MMM d')}
                            </span>
                          )}
                          
                          {task.assigned_to && (
                            <span className="text-slate-500">
                              Assigned to {task.assigned_to}
                            </span>
                          )}
                        </div>
                        
                        {task.description && (
                          <p className="text-sm text-slate-600 mt-2">{task.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Task Form Dialog */}
      <OnboardingTaskForm
        task={editingTask}
        open={formOpen}
        onOpenChange={handleFormClose}
        onSave={handleSave}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTask} onOpenChange={() => setDeleteTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this onboarding task? This action cannot be undone.
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