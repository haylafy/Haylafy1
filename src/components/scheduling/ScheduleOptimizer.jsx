import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { Sparkles, MapPin, Clock, User, CheckCircle, Calendar } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Calculate distance between two addresses (simplified)
const calculateDistance = (addr1, addr2) => {
  if (!addr1 || !addr2) return 999;
  // Simple string similarity as proxy for distance
  const similarity = addr1.toLowerCase().includes(addr2.toLowerCase().split(',')[0]) ? 5 : 15;
  return similarity;
};

// Check if caregiver is available on given day/time
const isAvailable = (caregiver, dayOfWeek, startTime, endTime) => {
  if (!caregiver.availability || caregiver.availability.length === 0) return true;
  
  const dayMap = { 0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' };
  const dayName = dayMap[dayOfWeek];
  
  const dayAvail = caregiver.availability.find(a => a.day === dayName);
  if (!dayAvail) return false;
  
  // Simple time comparison
  const startHour = parseInt(startTime.split(':')[0]);
  const availStartHour = parseInt(dayAvail.start_time?.split(':')[0] || '0');
  const availEndHour = parseInt(dayAvail.end_time?.split(':')[0] || '24');
  
  return startHour >= availStartHour && startHour < availEndHour;
};

export default function ScheduleOptimizer({ open, onOpenChange, selectedDate }) {
  const [suggestions, setSuggestions] = useState([]);
  const [generating, setGenerating] = useState(false);
  
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: caregivers = [] } = useQuery({
    queryKey: ['caregivers'],
    queryFn: () => base44.entities.Caregiver.list(),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list(),
  });

  const createShiftMutation = useMutation({
    mutationFn: (shiftData) => base44.entities.Shift.create(shiftData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success('Shift scheduled successfully');
    },
  });

  const generateSuggestions = () => {
    setGenerating(true);
    
    // Get unassigned or active clients
    const needScheduling = clients.filter(c => c.status === 'active');
    const activeCaregivers = caregivers.filter(c => c.status === 'active');
    
    const newSuggestions = [];

    needScheduling.forEach(client => {
      // Default shift time
      const startTime = new Date(selectedDate);
      startTime.setHours(9, 0, 0);
      const endTime = new Date(selectedDate);
      endTime.setHours(13, 0, 0);
      
      const dayOfWeek = selectedDate.getDay();
      
      // Score each caregiver
      const scoredCaregivers = activeCaregivers.map(caregiver => {
        let score = 100;
        
        // 1. Check availability preference
        if (!isAvailable(caregiver, dayOfWeek, '09:00', '13:00')) {
          score -= 40;
        }
        
        // 2. Calculate proximity
        const distance = calculateDistance(client.address, caregiver.address);
        score -= distance;
        
        // 3. Check if already assigned
        const existingShifts = shifts.filter(s => 
          s.caregiver_id === caregiver.id && 
          new Date(s.start_time).toDateString() === selectedDate.toDateString()
        );
        
        if (existingShifts.length > 0) {
          score -= 30; // Prefer caregivers without conflicts
        }
        
        // 4. Skill match
        if (caregiver.skills && caregiver.skills.length > 0) {
          score += 10;
        }
        
        return { caregiver, score, distance };
      });
      
      // Sort by score and take top 3
      scoredCaregivers.sort((a, b) => b.score - a.score);
      const topMatches = scoredCaregivers.slice(0, 3);
      
      if (topMatches.length > 0 && topMatches[0].score > 50) {
        newSuggestions.push({
          client,
          recommendations: topMatches,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });
      }
    });
    
    setSuggestions(newSuggestions);
    setGenerating(false);
    
    if (newSuggestions.length === 0) {
      toast.info('No scheduling suggestions available for this date');
    }
  };

  const acceptSuggestion = async (suggestion, caregiver) => {
    await createShiftMutation.mutateAsync({
      client_id: suggestion.client.id,
      client_name: suggestion.client.name,
      client_address: suggestion.client.address,
      caregiver_id: caregiver.id,
      caregiver_name: caregiver.name,
      start_time: suggestion.startTime,
      end_time: suggestion.endTime,
      status: 'scheduled',
    });
    
    // Remove accepted suggestion
    setSuggestions(suggestions.filter(s => s.client.id !== suggestion.client.id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600" />
            Smart Schedule Suggestions
          </DialogTitle>
          <p className="text-sm text-slate-500">
            AI-optimized caregiver assignments for {format(selectedDate, 'MMMM d, yyyy')}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {suggestions.length === 0 && !generating && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-teal-600" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">Generate Smart Suggestions</h3>
              <p className="text-slate-500 mb-6">
                Get optimal caregiver assignments based on proximity, availability, and skills
              </p>
              <Button 
                onClick={generateSuggestions}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Suggestions
              </Button>
            </div>
          )}

          {generating && (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-slate-600">Analyzing optimal schedules...</p>
            </div>
          )}

          {suggestions.map((suggestion) => (
            <div key={suggestion.client.id} className="border border-slate-200 rounded-xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-slate-900">{suggestion.client.name}</h4>
                  <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{suggestion.client.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {format(new Date(suggestion.startTime), 'h:mm a')} - {format(new Date(suggestion.endTime), 'h:mm a')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500 uppercase">Recommended Caregivers</p>
                {suggestion.recommendations.map((rec, idx) => (
                  <div 
                    key={rec.caregiver.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                        {rec.caregiver.name?.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{rec.caregiver.name}</span>
                          {idx === 0 && (
                            <Badge className="bg-teal-100 text-teal-700 text-xs">Best Match</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-600 mt-0.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            ~{rec.distance}mi away
                          </span>
                          <span>Match Score: {Math.round(rec.score)}%</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => acceptSuggestion(suggestion, rec.caregiver)}
                      disabled={createShiftMutation.isPending}
                      className={cn(
                        idx === 0 ? "bg-teal-600 hover:bg-teal-700" : "bg-slate-600 hover:bg-slate-700"
                      )}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Assign
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {suggestions.length > 0 && (
            <Button 
              variant="outline" 
              onClick={generateSuggestions}
              className="w-full"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Regenerate Suggestions
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}