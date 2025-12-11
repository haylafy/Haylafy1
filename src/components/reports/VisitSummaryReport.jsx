import React from 'react';
import { format } from 'date-fns';
import { FileText, User, Clock, CheckCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function VisitSummaryReport({ visits, clients, caregivers }) {
  const totalVisits = visits.length;
  const completedVisits = visits.filter(v => v.status === 'submitted' || v.status === 'reviewed').length;
  const totalMinutes = visits.reduce((sum, v) => sum + (v.duration_minutes || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  // Group by caregiver
  const caregiverStats = {};
  visits.forEach(visit => {
    if (!caregiverStats[visit.caregiver_id]) {
      caregiverStats[visit.caregiver_id] = {
        name: visit.caregiver_name,
        count: 0,
        hours: 0
      };
    }
    caregiverStats[visit.caregiver_id].count++;
    caregiverStats[visit.caregiver_id].hours += (visit.duration_minutes || 0) / 60;
  });

  const chartData = Object.values(caregiverStats).map(stat => ({
    name: stat.name,
    visits: stat.count,
    hours: parseFloat(stat.hours.toFixed(1))
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Visits</p>
              <p className="text-2xl font-bold text-slate-900">{totalVisits}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Completed</p>
              <p className="text-2xl font-bold text-slate-900">{completedVisits}</p>
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
              <p className="text-2xl font-bold text-slate-900">{totalHours}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <User className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Avg Hours/Visit</p>
              <p className="text-2xl font-bold text-slate-900">
                {totalVisits > 0 ? (totalMinutes / totalVisits / 60).toFixed(1) : '0'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-4">Visits by Caregiver</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="visits" fill="#0d9488" name="Total Visits" />
              <Bar dataKey="hours" fill="#8b5cf6" name="Total Hours" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detailed List */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-900 mb-4">Visit Details</h3>
        <div className="space-y-2">
          {visits.map((visit) => (
            <div key={visit.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-900">{visit.client_name}</p>
                  <Badge variant="secondary" className="text-xs">
                    {visit.caregiver_name}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  {format(new Date(visit.visit_date), 'MMM d, yyyy')} • {visit.duration_minutes} mins
                </p>
              </div>
              <Badge className={visit.status === 'reviewed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>
                {visit.status}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}