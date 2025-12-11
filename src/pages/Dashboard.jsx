import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, startOfDay, endOfDay, addDays, isBefore, isAfter, differenceInDays } from 'date-fns';
import { 
  Users, 
  UserCog, 
  DollarSign, 
  TrendingUp,
  Calendar,
  Award,
  Clock,
  Cake,
  Shield,
  FileText,
  AlertCircle
} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import CircularKPI from '@/components/dashboard/CircularKPI';
import StatusCard from '@/components/dashboard/StatusCard';

export default function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Redirect caregivers to EVV Home
  useEffect(() => {
    if (user && user.user_role === 'caregiver') {
      window.location.href = createPageUrl('CaregiverDashboard');
    }
  }, [user]);

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['clients', user?.business_id],
    queryFn: async () => {
      if (user?.role === 'admin') return base44.entities.Client.list();
      return base44.entities.Client.filter({ business_id: user?.business_id });
    },
    enabled: !!user,
  });

  const { data: caregivers = [], isLoading: loadingCaregivers } = useQuery({
    queryKey: ['caregivers', user?.business_id],
    queryFn: async () => {
      if (user?.role === 'admin') return base44.entities.Caregiver.list();
      return base44.entities.Caregiver.filter({ business_id: user?.business_id });
    },
    enabled: !!user,
  });

  const { data: shifts = [], isLoading: loadingShifts } = useQuery({
    queryKey: ['shifts', user?.business_id],
    queryFn: async () => {
      if (user?.role === 'admin') return base44.entities.Shift.list('-start_time', 100);
      return base44.entities.Shift.filter({ business_id: user?.business_id }, '-start_time', 100);
    },
    enabled: !!user,
  });

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['payments', user?.business_id],
    queryFn: async () => {
      if (user?.role === 'admin') return base44.entities.Payment.list('-created_date', 50);
      return base44.entities.Payment.filter({ business_id: user?.business_id }, '-created_date', 50);
    },
    enabled: !!user,
  });

  const { data: onboardingTasks = [] } = useQuery({
    queryKey: ['onboarding-tasks', user?.business_id],
    queryFn: async () => {
      if (user?.role === 'admin') return base44.entities.OnboardingTask.list();
      return base44.entities.OnboardingTask.filter({ business_id: user?.business_id });
    },
    enabled: !!user,
  });

  const isLoading = loadingClients || loadingCaregivers || loadingShifts || loadingPayments;

  // Calculate KPIs
  const activeClients = clients.filter(c => c.status === 'active').length;
  const totalClients = clients.length || 1;
  const censusPercentage = Math.round((activeClients / totalClients) * 100);

  const paidPayments = payments.filter(p => p.status === 'paid');
  const totalRevenue = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const expectedRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0) || 1;
  const revenuePercentage = Math.round((totalRevenue / expectedRevenue) * 100);

  const completedShifts = shifts.filter(s => s.status === 'completed').length;
  const totalShifts = shifts.length || 1;
  const retentionPercentage = Math.round((completedShifts / totalShifts) * 100);

  const agencySnapshotPercentage = Math.round((
    censusPercentage * 0.3 + 
    revenuePercentage * 0.4 + 
    retentionPercentage * 0.3
  ));

  // Status Cards Data
  const today = new Date();
  const next30Days = addDays(today, 30);

  // Upcoming Authorizations (using payments as proxy)
  const upcomingAuthorizations = payments
    .filter(p => p.due_date && isBefore(new Date(p.due_date), next30Days) && p.status === 'pending')
    .map(p => `${p.client_name} - Due ${format(new Date(p.due_date), 'MMM d')}`);

  // Expiring Credentials (using onboarding tasks)
  const expiringCredentials = onboardingTasks
    .filter(t => t.due_date && isBefore(new Date(t.due_date), next30Days) && t.status !== 'completed')
    .map(t => `${t.caregiver_name} - ${t.task_name}`);

  // Last 24 Hours Visits
  const yesterday = addDays(today, -1);
  const last24HoursVisits = shifts
    .filter(s => {
      const shiftDate = new Date(s.start_time);
      return isAfter(shiftDate, yesterday) && s.status === 'completed';
    })
    .map(s => `${s.client_name} - ${s.caregiver_name}`);

  // Upcoming Birthdays (using caregivers hire_date as proxy)
  const upcomingBirthdays = caregivers
    .filter(c => c.hire_date)
    .slice(0, 3)
    .map(c => `${c.name} - ${format(new Date(c.hire_date), 'MMM d')}`);

  // Agency Licensing (dummy data)
  const agencyLicensing = [
    'State License - Expires Mar 2026',
    'Medicare Certification - Active',
    'Liability Insurance - Current'
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">{format(today, 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <CircularKPI
          title="Shift Fill Rate"
          value={agencySnapshotPercentage}
          color="blue"
          icon={TrendingUp}
        />
        <CircularKPI
          title="Census"
          value={censusPercentage}
          dynamicColor={true}
          icon={Users}
        />
        <CircularKPI
          title="Revenue"
          value={revenuePercentage}
          color="green"
          icon={DollarSign}
        />
        <CircularKPI
          title="Retention Rate"
          value={retentionPercentage}
          color="yellow"
          icon={Award}
        />
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatusCard
          title="Upcoming Authorizations"
          items={upcomingAuthorizations}
          icon={Calendar}
          color="blue"
        />
        <StatusCard
          title="Expiring Credentials"
          items={expiringCredentials}
          icon={AlertCircle}
          color="red"
        />
        <StatusCard
          title="Last 24 Hours Visits"
          items={last24HoursVisits}
          icon={Clock}
          color="amber"
        />
        <StatusCard
          title="Upcoming Birthdays"
          items={upcomingBirthdays}
          icon={Cake}
          color="purple"
        />
        <StatusCard
          title="Agency Licensing"
          items={agencyLicensing}
          icon={Shield}
          color="green"
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Active Patients</p>
              <p className="text-2xl font-bold text-slate-900">{activeClients}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <UserCog className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Active Employees</p>
              <p className="text-2xl font-bold text-slate-900">
                {caregivers.filter(c => c.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Visits</p>
              <p className="text-2xl font-bold text-slate-900">{completedShifts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Revenue</p>
              <p className="text-2xl font-bold text-slate-900">${totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}