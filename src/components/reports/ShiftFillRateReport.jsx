import React from 'react';
import { Calendar, TrendingUp, AlertTriangle, CheckCircle, Users, Clock } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, eachWeekOfInterval } from 'date-fns';
import { cn } from "@/lib/utils";

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#94a3b8'];

export default function ShiftFillRateReport({ shifts, clients, caregivers }) {
  // Calculate fill rates by time period
  const today = new Date();
  const weeksData = eachWeekOfInterval({
    start: new Date(today.getFullYear(), today.getMonth() - 2, 1),
    end: today
  }).map(weekStart => {
    const weekEnd = endOfWeek(weekStart);
    const weekShifts = shifts.filter(s => {
      const date = new Date(s.start_time);
      return date >= weekStart && date <= weekEnd;
    });

    const scheduledShifts = weekShifts.length;
    const filledShifts = weekShifts.filter(s => s.caregiver_id && s.status !== 'cancelled').length;
    const completedShifts = weekShifts.filter(s => s.status === 'completed').length;
    const cancelledShifts = weekShifts.filter(s => s.status === 'cancelled').length;

    const fillRate = scheduledShifts > 0 ? (filledShifts / scheduledShifts) * 100 : 0;
    const completionRate = filledShifts > 0 ? (completedShifts / filledShifts) * 100 : 0;

    return {
      week: format(weekStart, 'MMM d'),
      fillRate: parseFloat(fillRate.toFixed(1)),
      completionRate: parseFloat(completionRate.toFixed(1)),
      scheduledShifts,
      filledShifts,
      completedShifts,
      cancelledShifts
    };
  });

  // Overall statistics
  const totalScheduled = shifts.length;
  const totalFilled = shifts.filter(s => s.caregiver_id && s.status !== 'cancelled').length;
  const totalCompleted = shifts.filter(s => s.status === 'completed').length;
  const totalCancelled = shifts.filter(s => s.status === 'cancelled').length;
  const totalUnfilled = totalScheduled - totalFilled - totalCancelled;

  const overallFillRate = totalScheduled > 0 ? (totalFilled / totalScheduled) * 100 : 0;
  const overallCompletionRate = totalFilled > 0 ? (totalCompleted / totalFilled) * 100 : 0;
  const cancellationRate = totalScheduled > 0 ? (totalCancelled / totalScheduled) * 100 : 0;

  // Fill rate by client
  const clientFillRates = clients.map(client => {
    const clientShifts = shifts.filter(s => s.client_id === client.id);
    const filled = clientShifts.filter(s => s.caregiver_id && s.status !== 'cancelled').length;
    const fillRate = clientShifts.length > 0 ? (filled / clientShifts.length) * 100 : 0;

    return {
      name: client.name,
      id: client.id,
      totalShifts: clientShifts.length,
      filledShifts: filled,
      fillRate: parseFloat(fillRate.toFixed(1))
    };
  }).filter(d => d.totalShifts > 0).sort((a, b) => b.totalShifts - a.totalShifts);

  // Fill rate by caregiver availability
  const caregiverCapacity = caregivers.map(cg => {
    const assignedShifts = shifts.filter(s => s.caregiver_id === cg.id);
    const completed = assignedShifts.filter(s => s.status === 'completed').length;

    return {
      name: cg.name,
      id: cg.id,
      assignedShifts: assignedShifts.length,
      completedShifts: completed,
      completionRate: assignedShifts.length > 0 ? (completed / assignedShifts.length) * 100 : 0
    };
  }).filter(d => d.assignedShifts > 0);

  // Status distribution
  const statusDistribution = [
    { name: 'Filled & Completed', value: totalCompleted, color: '#10b981' },
    { name: 'Filled (Pending)', value: totalFilled - totalCompleted, color: '#f59e0b' },
    { name: 'Cancelled', value: totalCancelled, color: '#ef4444' },
    { name: 'Unfilled', value: totalUnfilled, color: '#94a3b8' },
  ].filter(d => d.value > 0);

  // High-demand periods
  const dayOfWeekStats = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => {
    const dayShifts = shifts.filter(s => new Date(s.start_time).getDay() === index);
    const filled = dayShifts.filter(s => s.caregiver_id && s.status !== 'cancelled').length;
    return {
      day,
      shifts: dayShifts.length,
      filled,
      fillRate: dayShifts.length > 0 ? (filled / dayShifts.length) * 100 : 0
    };
  });

  const getFillRateBadge = (rate) => {
    if (rate >= 95) return { label: 'Excellent', color: 'bg-green-100 text-green-700' };
    if (rate >= 85) return { label: 'Good', color: 'bg-blue-100 text-blue-700' };
    if (rate >= 75) return { label: 'Fair', color: 'bg-amber-100 text-amber-700' };
    return { label: 'Low', color: 'bg-red-100 text-red-700' };
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Scheduled</p>
              <p className="text-2xl font-bold text-slate-900">{totalScheduled}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              overallFillRate >= 85 ? "bg-green-100" : "bg-amber-100"
            )}>
              <TrendingUp className={cn(
                "w-6 h-6",
                overallFillRate >= 85 ? "text-green-600" : "text-amber-600"
              )} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Overall Fill Rate</p>
              <p className="text-2xl font-bold text-slate-900">{overallFillRate.toFixed(1)}%</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Completion Rate</p>
              <p className="text-2xl font-bold text-slate-900">{overallCompletionRate.toFixed(1)}%</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              cancellationRate < 10 ? "bg-teal-100" : "bg-red-100"
            )}>
              <AlertTriangle className={cn(
                "w-6 h-6",
                cancellationRate < 10 ? "text-teal-600" : "text-red-600"
              )} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Cancellation Rate</p>
              <p className="text-2xl font-bold text-slate-900">{cancellationRate.toFixed(1)}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Fill Rate Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Weekly Fill Rate Trends</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={weeksData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="fillRate" stroke="#14b8a6" strokeWidth={3} name="Fill Rate %" dot={{ r: 4 }} />
              <Line type="monotone" dataKey="completionRate" stroke="#8b5cf6" strokeWidth={3} name="Completion Rate %" dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Shift Status Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Fill Rate by Day of Week */}
      <Card className="p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Fill Rate by Day of Week</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={dayOfWeekStats}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Bar dataKey="fillRate" fill="#14b8a6" name="Fill Rate %" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Client Fill Rates */}
      <Card className="p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Fill Rates by Patient</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Patient</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Scheduled</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Filled</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Fill Rate</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {clientFillRates.map((client) => {
                const badge = getFillRateBadge(client.fillRate);
                return (
                  <tr key={client.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-900">{client.name}</p>
                    </td>
                    <td className="text-right py-3 px-4 text-slate-600">
                      {client.totalShifts}
                    </td>
                    <td className="text-right py-3 px-4 text-slate-600">
                      {client.filledShifts}
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className={cn(
                        "font-bold",
                        client.fillRate >= 85 ? "text-green-600" :
                        client.fillRate >= 75 ? "text-blue-600" :
                        "text-amber-600"
                      )}>
                        {client.fillRate}%
                      </span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <Badge className={badge.color}>{badge.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Caregiver Capacity */}
      <Card className="p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Caregiver Workload & Reliability</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Caregiver</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Assigned</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Completed</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Reliability</th>
              </tr>
            </thead>
            <tbody>
              {caregiverCapacity.sort((a, b) => b.assignedShifts - a.assignedShifts).map((caregiver) => (
                <tr key={caregiver.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <p className="font-medium text-slate-900">{caregiver.name}</p>
                  </td>
                  <td className="text-right py-3 px-4 text-slate-600">
                    {caregiver.assignedShifts}
                  </td>
                  <td className="text-right py-3 px-4 text-slate-600">
                    {caregiver.completedShifts}
                  </td>
                  <td className="text-right py-3 px-4">
                    <span className={cn(
                      "font-semibold",
                      caregiver.completionRate >= 90 ? "text-green-600" :
                      caregiver.completionRate >= 75 ? "text-blue-600" :
                      "text-amber-600"
                    )}>
                      {caregiver.completionRate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Insights */}
      <Card className="p-6 bg-gradient-to-br from-teal-50 to-blue-50 border-teal-200">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-teal-600" />
          Key Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm font-medium text-slate-700 mb-1">Highest Demand Day</p>
            <p className="text-xl font-bold text-teal-600">
              {dayOfWeekStats.reduce((max, day) => day.shifts > max.shifts ? day : max, dayOfWeekStats[0])?.day}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm font-medium text-slate-700 mb-1">Lowest Fill Rate Day</p>
            <p className="text-xl font-bold text-amber-600">
              {dayOfWeekStats.reduce((min, day) => day.fillRate < min.fillRate && day.shifts > 0 ? day : min, dayOfWeekStats[0])?.day}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm font-medium text-slate-700 mb-1">Unfilled Shifts</p>
            <p className="text-xl font-bold text-red-600">{totalUnfilled}</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm font-medium text-slate-700 mb-1">Active Caregivers</p>
            <p className="text-xl font-bold text-blue-600">{caregiverCapacity.length}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}