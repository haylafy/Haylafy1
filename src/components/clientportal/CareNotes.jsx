import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { FileText, User, Calendar, Smile, Meh, Frown, Heart } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const moodIcons = {
  excellent: { icon: Heart, color: 'text-emerald-500' },
  good: { icon: Smile, color: 'text-green-500' },
  fair: { icon: Meh, color: 'text-amber-500' },
  poor: { icon: Frown, color: 'text-red-500' },
};

export default function CareNotes({ clientId }) {
  const { data: visitNotes = [], isLoading } = useQuery({
    queryKey: ['client-visit-notes', clientId],
    queryFn: () => base44.entities.VisitNote.list('-created_date'),
    enabled: !!clientId,
    select: (data) => data.filter(note => note.client_id === clientId)
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['client-visits-for-notes', clientId],
    queryFn: () => base44.entities.Visit.list('-visit_date'),
    enabled: !!clientId,
    select: (data) => data.filter(visit => visit.client_id === clientId && visit.notes)
  });

  // Combine visit notes and visit documentation
  const allNotes = [
    ...visitNotes.map(note => ({ ...note, type: 'visit_note' })),
    ...visits.map(visit => ({ ...visit, type: 'visit' }))
  ].sort((a, b) => new Date(b.created_date || b.visit_date) - new Date(a.created_date || a.visit_date));

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (allNotes.length === 0) {
    return (
      <Card className="p-12 text-center">
        <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-900 mb-2">No Care Notes Yet</h3>
        <p className="text-slate-500">Updates from your caregivers will appear here after visits.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {allNotes.map((note, idx) => {
        const MoodIcon = note.mood ? moodIcons[note.mood]?.icon : null;
        const moodColor = note.mood ? moodIcons[note.mood]?.color : '';
        
        return (
          <Card key={idx} className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white flex-shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{note.caregiver_name}</h3>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {format(new Date(note.created_date || note.visit_date), 'MMMM d, yyyy • h:mm a')}
                    </span>
                  </div>
                </div>
              </div>
              
              {MoodIcon && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    <MoodIcon className={cn("w-3 h-3 mr-1", moodColor)} />
                    {note.mood}
                  </Badge>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Care Notes:</h4>
                <p className="text-slate-600 whitespace-pre-wrap">{note.notes}</p>
              </div>

              {note.tasks_completed && note.tasks_completed.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Tasks Completed:</h4>
                  <ul className="space-y-1">
                    {note.tasks_completed.map((task, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="text-green-600 mt-0.5">✓</span>
                        <span>{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {note.concerns && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <h4 className="text-sm font-medium text-amber-900 mb-1">Concerns Noted:</h4>
                  <p className="text-sm text-amber-800">{note.concerns}</p>
                </div>
              )}

              {note.services_provided && note.services_provided.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {note.services_provided.map((service, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {service}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}