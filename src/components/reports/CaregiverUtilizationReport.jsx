import React from 'react';
import { Users, Clock, TrendingUp, Award } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function CaregiverUtilizationReport({ shifts, visits, caregivers }) {
  // Calculate utilization per caregiver
  const utilizationData = caregivers.map(caregiver => {
    const caregiverShifts = shifts.filter(s => s.caregiver_id === caregiver.id);
    const caregiverVisits = visits.filter(v => v.caregiver_id === caregiver.id);
    
    const totalScheduledHours = caregiverShifts.reduce((sum, shift) => {
      const start = new Date(shift.start_time);
      const end = new Date(shift.end_time);
      return sum + (end - start) / (1000 * 60 * 60);
    }, 0);

    const completedHours = caregiverVisits.reduce((sum, visit) => 
      sum + ((visit.duration_minutes || 0) / 60), 0
    );

    const completedShifts = caregiverShifts.filter(s => s.status === 'completed').length;
    const totalShifts = caregiverShifts.length;
    const utilizationRate = totalScheduledHours > 0 ? (completedHours / totalScheduledHours) * 100 : 0;

    return {
      name: caregiver.name,
      id: caregiver.id,
      scheduledHours: parseFloat(totalScheduledHours.toFixed(1)),
      completedHours: parseFloat(completedHours.toFixed(1)),
      totalShifts,
      completedShifts,
      utilizationRate: parseFloat(utilizationRate.toFixed(1)),
      status: caregiver.status
    };
  }).filter(data => data.totalShifts > 0);

  const avgUtilization = utilizationData.length > 0
    ? utilizationData.reduce((sum, d) => sum + d.utilizationRate, 0) / utilizationData.length
    : 0;

  const topPerformers = [...utilizationData]
    .sort((a, b) => b.completedHours - a.completedHours)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Active Caregivers</p>
              <p className="text-2xl font-bold text-slate-900">{utilizationData.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Avg Utilization</p>
              <p className="text-2xl font-bold text-slate-900">{avgUtilization.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Hours</p>
              <p className="text-2xl font-bold text-slate-900">
                {utilizationData.reduce((sum, d) => sum + d.completedHours, 0).toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Award className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Shifts</p>
              <p className="text-2xl font-bold text-slate-900">
                {utilizationData.reduce((sum, d) => sum + d.totalShifts, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Utilization Chart */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-900 mb-4">Hours by Caregiver</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={utilizationData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="scheduledHours" fill="#3b82f6" name="Scheduled Hours" />
            <Bar dataKey="completedHours" fill="#10b981" name="Completed Hours" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Performers */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-900 mb-4">Top Performers</h3>
        <div className="space-y-3">
          {topPerformers.map((caregiver, index) => (
            <div key={caregiver.id} className="flex items-center justify-between p-4 rounded-lg bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-semibold text-sm">
                  #{index + 1}
                </div>
                <div>
                  <p className="font-medium text-slate-900">{caregiver.name}</p>
                  <p className="text-sm text-slate-600">
                    {caregiver.completedShifts} shifts • {caregiver.completedHours}hrs
                  </p>
                </div>
              </div>
              <Badge className="bg-teal-100 text-teal-700">
                {caregiver.utilizationRate}% utilized
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed List */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-900 mb-4">All Caregivers</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Caregiver</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Shifts</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Scheduled</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Completed</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {utilizationData.map((caregiver) => (
                <tr key={caregiver.id} className="border-b border-slate-100">
                  <td className="py-3 px-4">
                    <p className="font-medium text-slate-900">{caregiver.name}</p>
                  </td>
                  <td className="text-right py-3 px-4 text-slate-600">
                    {caregiver.completedShifts}/{caregiver.totalShifts}
                  </td>
                  <td className="text-right py-3 px-4 text-slate-600">
                    {caregiver.scheduledHours}h
                  </td>
                  <td className="text-right py-3 px-4 text-slate-600">
                    {caregiver.completedHours}h
                  </td>
                  <td className="text-right py-3 px-4">
                    <span className={`font-semibold ${
                      caregiver.utilizationRate >= 80 ? 'text-green-600' :
                      caregiver.utilizationRate >= 60 ? 'text-blue-600' :
                      'text-amber-600'
                    }`}>
                      {caregiver.utilizationRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}