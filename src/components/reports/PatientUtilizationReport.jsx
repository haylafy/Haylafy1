import React from 'react';
import { Users, Activity, TrendingUp, Clock } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';

export default function PatientUtilizationReport({ visits, clients, startDate, endDate }) {
  // Calculate utilization per patient
  const patientData = clients.map(client => {
    const clientVisits = visits.filter(v => v.client_id === client.id);
    
    const totalHours = clientVisits.reduce((sum, visit) => 
      sum + ((visit.duration_minutes || 0) / 60), 0
    );

    const avgHoursPerVisit = clientVisits.length > 0 
      ? totalHours / clientVisits.length 
      : 0;

    // Service types
    const services = {};
    clientVisits.forEach(visit => {
      visit.services_provided?.forEach(service => {
        services[service] = (services[service] || 0) + 1;
      });
    });

    return {
      name: client.name,
      id: client.id,
      totalVisits: clientVisits.length,
      totalHours: parseFloat(totalHours.toFixed(1)),
      avgHoursPerVisit: parseFloat(avgHoursPerVisit.toFixed(1)),
      services: Object.keys(services),
      topService: Object.entries(services).sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'
    };
  }).filter(data => data.totalVisits > 0);

  // Trend over time
  const trendData = {};
  visits.forEach(visit => {
    const date = format(parseISO(visit.visit_date), 'MMM d');
    if (!trendData[date]) {
      trendData[date] = { date, visits: 0, hours: 0 };
    }
    trendData[date].visits++;
    trendData[date].hours += (visit.duration_minutes || 0) / 60;
  });

  const chartData = Object.values(trendData).map(d => ({
    ...d,
    hours: parseFloat(d.hours.toFixed(1))
  }));

  const totalPatients = patientData.length;
  const totalVisits = patientData.reduce((sum, p) => sum + p.totalVisits, 0);
  const totalHours = patientData.reduce((sum, p) => sum + p.totalHours, 0);
  const avgVisitsPerPatient = totalPatients > 0 ? (totalVisits / totalPatients).toFixed(1) : 0;

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
              <p className="text-sm text-slate-500">Active Patients</p>
              <p className="text-2xl font-bold text-slate-900">{totalPatients}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Visits</p>
              <p className="text-2xl font-bold text-slate-900">{totalVisits}</p>
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
              <p className="text-2xl font-bold text-slate-900">{totalHours.toFixed(1)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Avg Visits/Patient</p>
              <p className="text-2xl font-bold text-slate-900">{avgVisitsPerPatient}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-4">Visit Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="visits" stroke="#0d9488" strokeWidth={2} name="Daily Visits" />
              <Line type="monotone" dataKey="hours" stroke="#8b5cf6" strokeWidth={2} name="Daily Hours" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Patient Details */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-900 mb-4">Patient Service Utilization</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Patient</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Visits</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Total Hours</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Avg Hours</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Primary Service</th>
              </tr>
            </thead>
            <tbody>
              {patientData.map((patient) => (
                <tr key={patient.id} className="border-b border-slate-100">
                  <td className="py-3 px-4">
                    <p className="font-medium text-slate-900">{patient.name}</p>
                  </td>
                  <td className="text-right py-3 px-4 text-slate-600">
                    {patient.totalVisits}
                  </td>
                  <td className="text-right py-3 px-4 text-slate-600">
                    {patient.totalHours}h
                  </td>
                  <td className="text-right py-3 px-4 text-slate-600">
                    {patient.avgHoursPerVisit}h
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="secondary">{patient.topService}</Badge>
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