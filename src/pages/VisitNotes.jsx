import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  FileText, 
  Plus, 
  Search, 
  MoreVertical,
  Edit,
  Trash2,
  User,
  Calendar,
  Heart,
  AlertTriangle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import VisitNoteForm from '@/components/visitnotes/VisitNoteForm';

const moodConfig = {
  excellent: { label: 'Excellent', color: 'bg-emerald-100 text-emerald-700' },
  good: { label: 'Good', color: 'bg-blue-100 text-blue-700' },
  fair: { label: 'Fair', color: 'bg-amber-100 text-amber-700' },
  poor: { label: 'Poor', color: 'bg-rose-100 text-rose-700' },
};

export default function VisitNotes() {
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [deleteNote, setDeleteNote] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['visitnotes'],
    queryFn: () => base44.entities.VisitNote.list('-created_date'),
  });

  const filteredNotes = notes.filter(note =>
    note.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    note.caregiver_name?.toLowerCase().includes(search.toLowerCase()) ||
    note.notes?.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (note) => {
    setEditingNote(note);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (deleteNote) {
      await base44.entities.VisitNote.delete(deleteNote.id);
      queryClient.invalidateQueries({ queryKey: ['visitnotes'] });
      setDeleteNote(null);
    }
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingNote(null);
  };

  const handleSave = () => {
    queryClient.invalidateQueries({ queryKey: ['visitnotes'] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Visit Notes</h1>
          <p className="text-slate-500 mt-1">Document care activities and observations</p>
        </div>
        <Button 
          onClick={() => setFormOpen(true)}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Note
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Notes List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">No visit notes found</h3>
          <p className="text-slate-500 mb-6">
            {search ? 'Try adjusting your search' : 'Start documenting your visits'}
          </p>
          {!search && (
            <Button onClick={() => setFormOpen(true)} className="bg-teal-600 hover:bg-teal-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Note
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-semibold">
                    {note.client_name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{note.client_name}</h3>
                    <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {note.caregiver_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(note.created_date), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {note.mood && (
                    <Badge className={cn("", moodConfig[note.mood]?.color)}>
                      <Heart className="w-3 h-3 mr-1" />
                      {moodConfig[note.mood]?.label}
                    </Badge>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(note)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setDeleteNote(note)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <p className="text-slate-700 mb-4">{note.notes}</p>

              {note.tasks_completed?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-slate-500 mb-2">Tasks Completed</p>
                  <div className="flex flex-wrap gap-1.5">
                    {note.tasks_completed.map((task) => (
                      <Badge key={task} variant="secondary" className="text-xs bg-slate-100 text-slate-600">
                        {task}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {note.concerns && (
                <div className="p-3 bg-rose-50 rounded-lg border border-rose-100">
                  <div className="flex items-center gap-2 text-rose-700 text-sm font-medium mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    Concerns
                  </div>
                  <p className="text-sm text-rose-600">{note.concerns}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Note Form Dialog */}
      <VisitNoteForm
        note={editingNote}
        open={formOpen}
        onOpenChange={handleFormClose}
        onSave={handleSave}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteNote} onOpenChange={() => setDeleteNote(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Visit Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
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