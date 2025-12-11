import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Save, CheckCircle, ClipboardList } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from 'date-fns';

const assessmentTypes = [
  'initial_intake',
  'safety_assessment',
  'home_environment',
  'fall_risk',
  'cognitive_behavioral',
  'personal_preferences'
];

export default function AssessmentForm() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [assessmentType, setAssessmentType] = useState('');
  const [responses, setResponses] = useState({});
  const [recommendations, setRecommendations] = useState('');

  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: assessments = [] } = useQuery({
    queryKey: ['assessments'],
    queryFn: () => base44.entities.Assessment.list('-assessment_date'),
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Assessment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      toast.success('Assessment saved');
      setDialogOpen(false);
      resetForm();
    }
  });

  const handleSave = () => {
    const client = clients.find(c => c.id === selectedClient);
    createMutation.mutate({
      client_id: selectedClient,
      client_name: client?.name,
      assessment_type: assessmentType,
      assessment_date: format(new Date(), 'yyyy-MM-dd'),
      conducted_by: user?.full_name || user?.email,
      responses,
      recommendations,
      status: 'completed'
    });
  };

  const resetForm = () => {
    setSelectedClient('');
    setAssessmentType('');
    setResponses({});
    setRecommendations('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900">Assessments</h2>
        <Button onClick={() => setDialogOpen(true)} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />
          New Assessment
        </Button>
      </div>

      {/* Assessment List */}
      <div className="space-y-3">
        {assessments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <ClipboardList className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No assessments yet</h3>
            <p className="text-slate-500">Create patient assessments to track health status</p>
          </div>
        ) : (
          assessments.map(assessment => (
            <div key={assessment.id} className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{assessment.client_name}</h3>
                  <p className="text-sm text-slate-500 capitalize">
                    {assessment.assessment_type.replace('_', ' ')} • {format(new Date(assessment.assessment_date), 'MMM d, yyyy')}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">Conducted by: {assessment.conducted_by}</p>
                  
                  {assessment.recommendations && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-700 font-semibold mb-1">Recommendations</p>
                      <p className="text-sm text-blue-900">{assessment.recommendations}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {assessment.risk_level && (
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      assessment.risk_level === 'high' ? 'bg-red-100 text-red-700' :
                      assessment.risk_level === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {assessment.risk_level} risk
                    </span>
                  )}
                  {assessment.status === 'completed' && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Assessment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Assessment</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <Label>Patient</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Assessment Type</Label>
              <Select value={assessmentType} onValueChange={setAssessmentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {assessmentTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {assessmentType === 'fall_risk' && (
              <div className="space-y-4">
                <div>
                  <Label>History of Falls</Label>
                  <RadioGroup 
                    value={responses.history_of_falls}
                    onValueChange={(val) => setResponses({...responses, history_of_falls: val})}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="falls-yes" />
                      <Label htmlFor="falls-yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="falls-no" />
                      <Label htmlFor="falls-no">No</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label>Mobility Aids Used</Label>
                  <Input 
                    value={responses.mobility_aids || ''}
                    onChange={(e) => setResponses({...responses, mobility_aids: e.target.value})}
                    placeholder="Cane, walker, wheelchair, etc."
                  />
                </div>

                <div>
                  <Label>Home Hazards Identified</Label>
                  <Textarea 
                    value={responses.home_hazards || ''}
                    onChange={(e) => setResponses({...responses, home_hazards: e.target.value})}
                    placeholder="Rugs, poor lighting, stairs, etc."
                  />
                </div>
              </div>
            )}

            {assessmentType === 'personal_preferences' && (
              <div className="space-y-4">
                <div>
                  <Label>Daily Routine</Label>
                  <Textarea 
                    value={responses.daily_routine || ''}
                    onChange={(e) => setResponses({...responses, daily_routine: e.target.value})}
                    placeholder="Describe typical daily schedule..."
                  />
                </div>

                <div>
                  <Label>Food Preferences</Label>
                  <Input 
                    value={responses.food_preferences || ''}
                    onChange={(e) => setResponses({...responses, food_preferences: e.target.value})}
                    placeholder="Likes, dislikes, dietary restrictions..."
                  />
                </div>

                <div>
                  <Label>Activities & Hobbies</Label>
                  <Input 
                    value={responses.hobbies || ''}
                    onChange={(e) => setResponses({...responses, hobbies: e.target.value})}
                    placeholder="Favorite activities..."
                  />
                </div>
              </div>
            )}

            <div>
              <Label>Recommendations</Label>
              <Textarea 
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                placeholder="Assessment recommendations and next steps..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleSave} 
                disabled={!selectedClient || !assessmentType}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Assessment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}