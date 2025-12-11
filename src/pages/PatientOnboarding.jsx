import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, CheckCircle, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";
import PatientWizard from '@/components/onboarding/PatientWizard';
import { toast } from "sonner";

export default function PatientOnboarding() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const queryClient = useQueryClient();

  const updatePatientMutation = useMutation({
    mutationFn: async (patientId) => {
      return await base44.entities.Client.update(patientId, { status: 'active' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['recent-patients'] });
      toast.success('Patient onboarding completed');
    },
    onError: (error) => {
      console.error('Onboarding error:', error);
      toast.error('Failed to complete onboarding');
    }
  });

  const { data: recentPatients = [] } = useQuery({
    queryKey: ['recent-patients'],
    queryFn: () => base44.entities.Client.filter({ status: 'pending' }, '-created_date', 10),
  });

  const { data: allPatients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
  });

  const completedCount = allPatients.filter(p => p.status === 'active').length;
  const pendingCount = recentPatients.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Patient Onboarding</h1>
          <p className="text-slate-500 mt-1">Streamlined patient intake and enrollment process</p>
        </div>
        <Button 
          onClick={() => setWizardOpen(true)}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Start New Onboarding
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Patients</p>
              <p className="text-2xl font-bold text-slate-900">{allPatients.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending Onboarding</p>
              <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Active Patients</p>
              <p className="text-2xl font-bold text-slate-900">{completedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Onboarding */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Pending Onboarding</h2>
        {pendingCount === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500">All patients are fully onboarded</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentPatients.map((patient) => (
              <div key={patient.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-semibold">
                    {patient.name?.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">{patient.name}</h4>
                    <p className="text-sm text-slate-500">
                      {patient.phone} {patient.email && `• ${patient.email}`}
                    </p>
                  </div>
                </div>
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => updatePatientMutation.mutate(patient.id)}
                  disabled={updatePatientMutation.isPending}
                >
                  {updatePatientMutation.isPending ? 'Completing...' : 'Complete Onboarding'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Wizard */}
      <PatientWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['clients'] });
          queryClient.invalidateQueries({ queryKey: ['recent-patients'] });
        }}
      />
    </div>
  );
}