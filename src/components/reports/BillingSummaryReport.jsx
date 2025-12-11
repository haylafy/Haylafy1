import React from 'react';
import { DollarSign, TrendingUp, FileText, AlertCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { format } from 'date-fns';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function BillingSummaryReport({ invoices, payments }) {
  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
  const totalPending = invoices.filter(inv => inv.status === 'pending' || inv.status === 'submitted')
    .reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0);
  const totalOverdue = invoices.filter(inv => 
    inv.due_date && new Date(inv.due_date) < new Date() && inv.status !== 'paid'
  ).reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0);

  // Status breakdown for pie chart
  const statusData = [
    { name: 'Paid', value: invoices.filter(i => i.status === 'paid').length, color: '#10b981' },
    { name: 'Pending', value: invoices.filter(i => i.status === 'pending').length, color: '#f59e0b' },
    { name: 'Submitted', value: invoices.filter(i => i.status === 'submitted').length, color: '#3b82f6' },
    { name: 'Partial', value: invoices.filter(i => i.status === 'partial').length, color: '#8b5cf6' },
    { name: 'Denied', value: invoices.filter(i => i.status === 'denied').length, color: '#ef4444' },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Revenue</p>
              <p className="text-2xl font-bold text-slate-900">${totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Amount Paid</p>
              <p className="text-2xl font-bold text-slate-900">${totalPaid.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-2xl font-bold text-slate-900">${totalPending.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Overdue</p>
              <p className="text-2xl font-bold text-slate-900">${totalOverdue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-4">Invoice Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Clients */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-4">Top Clients by Revenue</h3>
          <div className="space-y-3">
            {Object.entries(
              invoices.reduce((acc, inv) => {
                if (!acc[inv.client_name]) acc[inv.client_name] = 0;
                acc[inv.client_name] += inv.total_amount || 0;
                return acc;
              }, {})
            )
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([client, amount]) => (
                <div key={client} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                  <span className="font-medium text-slate-900">{client}</span>
                  <span className="text-teal-600 font-semibold">${amount.toFixed(2)}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-900 mb-4">Recent Invoices</h3>
        <div className="space-y-2">
          {invoices.slice(0, 10).map((invoice) => (
            <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
              <div className="flex-1">
                <p className="font-medium text-slate-900">Invoice #{invoice.invoice_number}</p>
                <p className="text-sm text-slate-600">
                  {invoice.client_name} • {format(new Date(invoice.invoice_date), 'MMM d, yyyy')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-900">${invoice.total_amount.toFixed(2)}</span>
                <Badge className={
                  invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                  invoice.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  'bg-blue-100 text-blue-700'
                }>
                  {invoice.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}