import React from 'react';
import { Users, Clock, CheckCircle, Star, TrendingUp, AlertCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { cn } from "@/lib/utils";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

export default function CaregiverPerformanceReport({ shifts, visits, caregivers }) {
  // Calculate performance metrics per caregiver
  const performanceData = caregivers.map(caregiver => {
    const caregiverShifts = shifts.filter(s => s.caregiver_id === caregiver.id);
    const caregiverVisits = visits.filter(v => v.caregiver_id === caregiver.id);
    
    const completedShifts = caregiverShifts.filter(s => s.status === 'completed').length;
    const missedShifts = caregiverShifts.filter(s => s.status === 'missed').length;
    const totalShifts = caregiverShifts.length;

    // Calculate hours worked
    const hoursWorked = caregiverVisits.reduce((sum, visit) => 
      sum + ((visit.duration_minutes || 0) / 60), 0
    );

    // On-time performance (check-in within 15 mins of scheduled start)
    const onTimeShifts = caregiverShifts.filter(shift => {
      if (!shift.check_in_time || !shift.start_time) return false;
      const scheduled = new Date(shift.start_time);
      const actual = new Date(shift.check_in_time);
      const diff = (actual - scheduled) / (1000 * 60); // minutes
      return diff <= 15 && diff >= -15;
    }).length;

    const onTimeRate = completedShifts > 0 ? (onTimeShifts / completedShifts) * 100 : 0;
    const completionRate = totalShifts > 0 ? (completedShifts / totalShifts) * 100 : 0;

    // Task completion (from visits)
    const totalTasks = caregiverVisits.reduce((sum, v) => 
      (v.tasks_completed?.length || 0) + (v.tasks_not_completed?.length || 0), 0
    );
    const completedTasks = caregiverVisits.reduce((sum, v) => 
      v.tasks_completed?.filter(t => t.completed).length || 0, 0
    );
    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Overall performance score (weighted average)
    const performanceScore = (
      completionRate * 0.4 + 
      onTimeRate * 0.3 + 
      taskCompletionRate * 0.3
    );

    return {
      name: caregiver.name,
      id: caregiver.id,
      totalShifts,
      completedShifts,
      missedShifts,
      hoursWorked: parseFloat(hoursWorked.toFixed(1)),
      onTimeShifts,
      completionRate: parseFloat(completionRate.toFixed(1)),
      onTimeRate: parseFloat(onTimeRate.toFixed(1)),
      taskCompletionRate: parseFloat(taskCompletionRate.toFixed(1)),
      performanceScore: parseFloat(performanceScore.toFixed(1)),
      totalTasks,
      completedTasks,
      status: caregiver.status
    };
  }).filter(data => data.totalShifts > 0);

  // Sort by performance score
  const sortedPerformers = [...performanceData].sort((a, b) => b.performanceScore - a.performanceScore);
  const topPerformers = sortedPerformers.slice(0, 5);
  const lowPerformers = sortedPerformers.slice(-3).reverse();

  // Aggregate stats
  const totalHours = performanceData.reduce((sum, d) => sum + d.hoursWorked, 0);
  const avgCompletionRate = performanceData.length > 0
    ? performanceData.reduce((sum, d) => sum + d.completionRate, 0) / performanceData.length
    : 0;
  const avgOnTimeRate = performanceData.length > 0
    ? performanceData.reduce((sum, d) => sum + d.onTimeRate, 0) / performanceData.length
    : 0;

  // Performance distribution
  const performanceDistribution = [
    { name: 'Excellent (90%+)', value: performanceData.filter(d => d.performanceScore >= 90).length, color: '#10b981' },
    { name: 'Good (75-89%)', value: performanceData.filter(d => d.performanceScore >= 75 && d.performanceScore < 90).length, color: '#3b82f6' },
    { name: 'Fair (60-74%)', value: performanceData.filter(d => d.performanceScore >= 60 && d.performanceScore < 75).length, color: '#f59e0b' },
    { name: 'Needs Improvement (<60%)', value: performanceData.filter(d => d.performanceScore < 60).length, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const getPerformanceBadge = (score) => {
    if (score >= 90) return { label: 'Excellent', color: 'bg-green-100 text-green-700' };
    if (score >= 75) return { label: 'Good', color: 'bg-blue-100 text-blue-700' };
    if (score >= 60) return { label: 'Fair', color: 'bg-amber-100 text-amber-700' };
    return { label: 'Needs Improvement', color: 'bg-red-100 text-red-700' };
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Caregivers Evaluated</p>
              <p className="text-2xl font-bold text-slate-900">{performanceData.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Hours Worked</p>
              <p className="text-2xl font-bold text-slate-900">{totalHours.toFixed(1)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Avg Completion Rate</p>
              <p className="text-2xl font-bold text-slate-900">{avgCompletionRate.toFixed(1)}%</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Avg On-Time Rate</p>
              <p className="text-2xl font-bold text-slate-900">{avgOnTimeRate.toFixed(1)}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Performance Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Performance Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={performanceDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {performanceDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Performance Metrics</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topPerformers.slice(0, 5)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="completionRate" fill="#10b981" name="Completion %" />
              <Bar dataKey="onTimeRate" fill="#3b82f6" name="On-Time %" />
              <Bar dataKey="taskCompletionRate" fill="#8b5cf6" name="Task %" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Top Performers */}
      <Card className="p-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-500" />
          Top 5 Performers
        </h3>
        <div className="space-y-3">
          {topPerformers.map((caregiver, index) => {
            const badge = getPerformanceBadge(caregiver.performanceScore);
            return (
              <div key={caregiver.id} className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-slate-50 to-white border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold">
                    #{index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{caregiver.name}</p>
                    <div className="flex items-center gap-3 text-sm text-slate-600 mt-1">
                      <span>{caregiver.hoursWorked}h worked</span>
                      <span>•</span>
                      <span>{caregiver.completedShifts}/{caregiver.totalShifts} shifts</span>
                      <span>•</span>
                      <span>{caregiver.completedTasks}/{caregiver.totalTasks} tasks</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-teal-600">{caregiver.performanceScore}%</p>
                    <Badge className={badge.color}>{badge.label}</Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Needs Attention */}
      {lowPerformers.length > 0 && (
        <Card className="p-6 border-amber-200 bg-amber-50">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            Needs Attention
          </h3>
          <div className="space-y-3">
            {lowPerformers.map((caregiver) => {
              const badge = getPerformanceBadge(caregiver.performanceScore);
              return (
                <div key={caregiver.id} className="flex items-center justify-between p-4 rounded-lg bg-white">
                  <div>
                    <p className="font-medium text-slate-900">{caregiver.name}</p>
                    <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                      <span>Completion: {caregiver.completionRate}%</span>
                      <span>On-Time: {caregiver.onTimeRate}%</span>
                      <span>Tasks: {caregiver.taskCompletionRate}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-amber-600">{caregiver.performanceScore}%</p>
                    <Badge className={badge.color}>{badge.label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Detailed Table */}
      <Card className="p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Complete Performance Report</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Caregiver</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Shifts</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Hours</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Completion</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">On-Time</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Tasks</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Score</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Rating</th>
              </tr>
            </thead>
            <tbody>
              {sortedPerformers.map((caregiver) => {
                const badge = getPerformanceBadge(caregiver.performanceScore);
                return (
                  <tr key={caregiver.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-900">{caregiver.name}</p>
                    </td>
                    <td className="text-right py-3 px-4 text-slate-600">
                      {caregiver.completedShifts}/{caregiver.totalShifts}
                    </td>
                    <td className="text-right py-3 px-4 text-slate-600">
                      {caregiver.hoursWorked}h
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className={cn(
                        "font-semibold",
                        caregiver.completionRate >= 90 ? "text-green-600" :
                        caregiver.completionRate >= 75 ? "text-blue-600" :
                        "text-amber-600"
                      )}>
                        {caregiver.completionRate}%
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className={cn(
                        "font-semibold",
                        caregiver.onTimeRate >= 90 ? "text-green-600" :
                        caregiver.onTimeRate >= 75 ? "text-blue-600" :
                        "text-amber-600"
                      )}>
                        {caregiver.onTimeRate}%
                      </span>
                    </td>
                    <td className="text-right py-3 px-4 text-slate-600">
                      {caregiver.completedTasks}/{caregiver.totalTasks}
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className="font-bold text-slate-900">{caregiver.performanceScore}%</span>
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
    </div>
  );
}