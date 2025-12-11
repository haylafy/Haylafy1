import React from 'react';
import { cn } from "@/lib/utils";

export default function StatsCard({ title, value, icon: Icon, trend, trendValue, color = "teal" }) {
  const colorClasses = {
    teal: "from-teal-500 to-teal-600 shadow-teal-500/20",
    blue: "from-blue-500 to-blue-600 shadow-blue-500/20",
    purple: "from-purple-500 to-purple-600 shadow-purple-500/20",
    amber: "from-amber-500 to-amber-600 shadow-amber-500/20",
    rose: "from-rose-500 to-rose-600 shadow-rose-500/20",
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
          {trend && (
            <p className={cn(
              "text-sm font-medium mt-2",
              trend === 'up' ? 'text-emerald-600' : 'text-rose-600'
            )}>
              {trend === 'up' ? '↑' : '↓'} {trendValue}
            </p>
          )}
        </div>
        <div className={cn(
          "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg",
          colorClasses[color]
        )}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}