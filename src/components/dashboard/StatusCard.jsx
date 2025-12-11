import React from 'react';
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function StatusCard({ title, items, icon: Icon, color = "blue" }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-slate-500" />
          <h3 className="text-sm font-medium text-slate-900">{title}</h3>
        </div>
        {items?.length > 0 && (
          <Badge className={cn("text-xs", colorClasses[color])}>
            {items.length}
          </Badge>
        )}
      </div>
      <div className="space-y-2">
        {items?.length > 0 ? (
          items.slice(0, 3).map((item, index) => (
            <div key={index} className="text-xs text-slate-600 py-1 border-l-2 border-slate-200 pl-2">
              {item}
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-400">No items</p>
        )}
        {items?.length > 3 && (
          <p className="text-xs text-slate-500 font-medium pt-1">+{items.length - 3} more</p>
        )}
      </div>
    </div>
  );
}