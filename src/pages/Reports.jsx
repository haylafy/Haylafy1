import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReportFilters from '@/components/reports/ReportFilters';
import VisitSummaryReport from '@/components/reports/VisitSummaryReport';
import BillingSummaryReport from '@/components/reports/BillingSummaryReport';
import CaregiverUtilizationReport from '@/components/reports/CaregiverUtilizationReport';
import PatientUtilizationReport from '@/components/reports/PatientUtilizationReport';
import CaregiverPerformanceReport from '@/components/reports/CaregiverPerformanceReport';
import ShiftFillRateReport from '@/components/reports/ShiftFillRateReport';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  subMonths,
  isSameMonth
} from 'date-fns';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { cn } from "@/lib/utils";

const COLORS = ['#14b8a6', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Reports() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [activeReport, setActiveReport] = useState('overview');
  const [filters, setFilters] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    clientId: 'all',
    caregiverId: 'all',
    serviceType: 'all'
  });

  const { data: shifts = [], isLoading: loadingShifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list('-start_time'),
  });

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: caregivers = [] } = useQuery({
    queryKey: ['caregivers'],
    queryFn: () => base44.entities.Caregiver.list(),
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['visits'],
    queryFn: () => base44.entities.Visit.list('-visit_date'),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-invoice_date'),
  });

  const isLoading = loadingShifts || loadingPayments;

  // Filter data for selected month
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);

  const monthShifts = shifts.filter(s => {
    const date = new Date(s.start_time);
    return date >= monthStart && date <= monthEnd;
  });

  const monthPayments = payments.filter(p => {
    const date = new Date(p.created_date);
    return date >= monthStart && date <= monthEnd;
  });

  // Shift stats
  const completedShifts = monthShifts.filter(s => s.status === 'completed').length;
  const missedShifts = monthShifts.filter(s => s.status === 'missed').length;
  const scheduledShifts = monthShifts.filter(s => s.status === 'scheduled').length;
  const totalHours = monthShifts
    .filter(s => s.status === 'completed')
    .reduce((sum, s) => {
      const start = new Date(s.start_time);
      const end = new Date(s.end_time);
      return sum + (end - start) / (1000 * 60 * 60);
    }, 0);

  // Payment stats
  const totalRevenue = monthPayments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalPending = monthPayments
    .filter(p => p.status === 'pending' || p.status === 'overdue')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  // Charts data
  const shiftStatusData = [
    { name: 'Completed', value: completedShifts, color: '#10b981' },
    { name: 'Scheduled', value: scheduledShifts, color: '#3b82f6' },
    { name: 'Missed', value: missedShifts, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const paymentStatusData = [
    { name: 'Paid', value: monthPayments.filter(p => p.status === 'paid').length, color: '#10b981' },
    { name: 'Pending', value: monthPayments.filter(p => p.status === 'pending').length, color: '#f59e0b' },
    { name: 'Overdue', value: monthPayments.filter(p => p.status === 'overdue').length, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // Daily shifts chart
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const dailyShiftsData = daysInMonth.map(day => {
    const dayShifts = monthShifts.filter(s => 
      format(new Date(s.start_time), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
    );
    return {
      date: format(day, 'd'),
      completed: dayShifts.filter(s => s.status === 'completed').length,
      scheduled: dayShifts.filter(s => s.status === 'scheduled').length,
    };
  });

  // Revenue trend (last 6 months)
  const revenueTrend = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(new Date(), 5 - i);
    const monthPayments = payments.filter(p => {
      const date = new Date(p.created_date);
      return isSameMonth(date, month) && p.status === 'paid';
    });
    return {
      month: format(month, 'MMM'),
      revenue: monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
    };
  });

  // Top caregivers by shifts
  const caregiverStats = caregivers.map(cg => {
    const cgShifts = monthShifts.filter(s => s.caregiver_id === cg.id);
    return {
      name: cg.name,
      shifts: cgShifts.length,
      completed: cgShifts.filter(s => s.status === 'completed').length,
    };
  }).sort((a, b) => b.shifts - a.shifts).slice(0, 5);

  // Filter data for custom reports
  const getFilteredData = () => {
    const start = filters.startDate ? new Date(filters.startDate) : null;
    const end = filters.endDate ? new Date(filters.endDate) : null;

    const filteredVisits = visits.filter(v => {
      if (start && new Date(v.visit_date) < start) return false;
      if (end && new Date(v.visit_date) > end) return false;
      if (filters.clientId !== 'all' && v.client_id !== filters.clientId) return false;
      if (filters.caregiverId !== 'all' && v.caregiver_id !== filters.caregiverId) return false;
      return true;
    });

    const filteredInvoices = invoices.filter(inv => {
      if (start && new Date(inv.invoice_date) < start) return false;
      if (end && new Date(inv.invoice_date) > end) return false;
      if (filters.clientId !== 'all' && inv.client_id !== filters.clientId) return false;
      return true;
    });

    const filteredShifts = shifts.filter(s => {
      if (start && new Date(s.start_time) < start) return false;
      if (end && new Date(s.start_time) > end) return false;
      if (filters.clientId !== 'all' && s.client_id !== filters.clientId) return false;
      if (filters.caregiverId !== 'all' && s.caregiver_id !== filters.caregiverId) return false;
      return true;
    });

    return { filteredVisits, filteredInvoices, filteredShifts };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-slate-500 mt-1">Comprehensive insights and customizable reports</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeReport} onValueChange={setActiveReport} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Caregiver Performance</TabsTrigger>
          <TabsTrigger value="fillrates">Shift Fill Rates</TabsTrigger>
          <TabsTrigger value="visits">Visit Summary</TabsTrigger>
          <TabsTrigger value="billing">Billing Summary</TabsTrigger>
          <TabsTrigger value="caregiver">Caregiver Utilization</TabsTrigger>
          <TabsTrigger value="patient">Patient Utilization</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-sm border border-slate-100 w-fit">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-4 font-medium text-slate-900">
              {format(selectedMonth, 'MMMM yyyy')}
            </span>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSelectedMonth(new Date())}
              disabled={isSameMonth(selectedMonth, new Date())}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Completed Shifts</p>
              <p className="text-2xl font-bold text-slate-900">{completedShifts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Hours</p>
              <p className="text-2xl font-bold text-slate-900">{totalHours.toFixed(1)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Revenue</p>
              <p className="text-2xl font-bold text-slate-900">${totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-2xl font-bold text-slate-900">${totalPending.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Shifts */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-6">Daily Shifts</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyShiftsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }} 
              />
              <Bar dataKey="completed" fill="#14b8a6" radius={[4, 4, 0, 0]} name="Completed" />
              <Bar dataKey="scheduled" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Scheduled" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Trend */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-6">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `$${v}`} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px'
                }}
                formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#14b8a6" 
                strokeWidth={3}
                dot={{ fill: '#14b8a6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shift Status */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-6">Shift Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={shiftStatusData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {shiftStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-4">
            {shiftStatusData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-slate-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Status */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-6">Payment Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={paymentStatusData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {paymentStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-4">
            {paymentStatusData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-slate-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Caregivers */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-6">Top Caregivers</h3>
          <div className="space-y-4">
            {caregiverStats.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No data available</p>
            ) : (
              caregiverStats.map((cg, index) => (
                <div key={cg.name} className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm",
                    index === 0 ? "bg-amber-500" : 
                    index === 1 ? "bg-slate-400" : 
                    index === 2 ? "bg-amber-700" : "bg-slate-300"
                  )}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{cg.name}</p>
                    <p className="text-xs text-slate-500">{cg.completed} completed</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{cg.shifts} shifts</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-6 text-white">
          <h3 className="font-semibold mb-4">Quick Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-teal-100 text-sm">Active Clients</p>
              <p className="text-3xl font-bold">{clients.filter(c => c.status === 'active').length}</p>
            </div>
            <div>
              <p className="text-teal-100 text-sm">Active Caregivers</p>
              <p className="text-3xl font-bold">{caregivers.filter(c => c.status === 'active').length}</p>
            </div>
            <div>
              <p className="text-teal-100 text-sm">Completion Rate</p>
              <p className="text-3xl font-bold">
                {monthShifts.length > 0 
                  ? Math.round((completedShifts / monthShifts.length) * 100) 
                  : 0}%
              </p>
            </div>
            <div>
              <p className="text-teal-100 text-sm">Avg. Daily Shifts</p>
              <p className="text-3xl font-bold">
                {daysInMonth.length > 0 
                  ? Math.round(monthShifts.length / daysInMonth.length * 10) / 10
                  : 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-4">Performance Summary</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Total Shifts This Month</span>
              <span className="font-semibold text-slate-900">{monthShifts.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Missed Shifts</span>
              <span className={cn(
                "font-semibold",
                missedShifts > 0 ? "text-rose-600" : "text-slate-900"
              )}>
                {missedShifts}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Total Invoices</span>
              <span className="font-semibold text-slate-900">{monthPayments.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Collection Rate</span>
              <span className="font-semibold text-emerald-600">
                {monthPayments.length > 0 
                  ? Math.round((monthPayments.filter(p => p.status === 'paid').length / monthPayments.length) * 100)
                  : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>
        </TabsContent>

        {/* Caregiver Performance Report */}
        <TabsContent value="performance" className="space-y-6">
          <ReportFilters
            filters={filters}
            onFilterChange={setFilters}
            clients={clients}
            caregivers={caregivers}
            onGenerate={() => {}}
          />
          <CaregiverPerformanceReport
            shifts={getFilteredData().filteredShifts}
            visits={getFilteredData().filteredVisits}
            caregivers={caregivers}
          />
        </TabsContent>

        {/* Shift Fill Rates Report */}
        <TabsContent value="fillrates" className="space-y-6">
          <ReportFilters
            filters={filters}
            onFilterChange={setFilters}
            clients={clients}
            caregivers={caregivers}
            onGenerate={() => {}}
          />
          <ShiftFillRateReport
            shifts={getFilteredData().filteredShifts}
            clients={clients}
            caregivers={caregivers}
          />
        </TabsContent>

        {/* Visit Summary Report */}
        <TabsContent value="visits" className="space-y-6">
          <ReportFilters
            filters={filters}
            onFilterChange={setFilters}
            clients={clients}
            caregivers={caregivers}
            onGenerate={() => {}}
          />
          <VisitSummaryReport
            visits={getFilteredData().filteredVisits}
            clients={clients}
            caregivers={caregivers}
          />
        </TabsContent>

        {/* Billing Summary Report */}
        <TabsContent value="billing" className="space-y-6">
          <ReportFilters
            filters={filters}
            onFilterChange={setFilters}
            clients={clients}
            caregivers={caregivers}
            onGenerate={() => {}}
          />
          <BillingSummaryReport
            invoices={getFilteredData().filteredInvoices}
            payments={payments}
          />
        </TabsContent>

        {/* Caregiver Utilization Report */}
        <TabsContent value="caregiver" className="space-y-6">
          <ReportFilters
            filters={filters}
            onFilterChange={setFilters}
            clients={clients}
            caregivers={caregivers}
            onGenerate={() => {}}
          />
          <CaregiverUtilizationReport
            shifts={getFilteredData().filteredShifts}
            visits={getFilteredData().filteredVisits}
            caregivers={caregivers}
          />
        </TabsContent>

        {/* Patient Utilization Report */}
        <TabsContent value="patient" className="space-y-6">
          <ReportFilters
            filters={filters}
            onFilterChange={setFilters}
            clients={clients}
            caregivers={caregivers}
            onGenerate={() => {}}
          />
          <PatientUtilizationReport
            visits={getFilteredData().filteredVisits}
            clients={clients}
            startDate={filters.startDate}
            endDate={filters.endDate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}