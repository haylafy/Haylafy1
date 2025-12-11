import React from 'react';
import { cn } from "@/lib/utils";

export default function CircularKPI({ title, value, color, icon: Icon, dynamicColor = false }) {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-500',
      text: 'text-blue-600',
      light: 'bg-blue-50',
      stroke: 'stroke-blue-500'
    },
    red: {
      bg: 'bg-red-500',
      text: 'text-red-600',
      light: 'bg-red-50',
      stroke: 'stroke-red-500'
    },
    green: {
      bg: 'bg-green-500',
      text: 'text-green-600',
      light: 'bg-green-50',
      stroke: 'stroke-green-500'
    },
    teal: {
      bg: 'bg-teal-500',
      text: 'text-teal-600',
      light: 'bg-teal-50',
      stroke: 'stroke-teal-500'
    },
    yellow: {
      bg: 'bg-yellow-500',
      text: 'text-yellow-600',
      light: 'bg-yellow-50',
      stroke: 'stroke-yellow-500'
    },
    orange: {
      bg: 'bg-orange-500',
      text: 'text-orange-600',
      light: 'bg-orange-50',
      stroke: 'stroke-orange-500'
    },
  };

  // Dynamic color based on value
  let finalColor = color;
  if (dynamicColor) {
    if (value <= 40) {
      finalColor = 'red';
    } else if (value <= 70) {
      finalColor = 'orange';
    } else {
      finalColor = 'teal';
    }
  }

  const colors = colorClasses[finalColor] || colorClasses.blue;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex flex-col items-center">
        <div className="relative w-32 h-32 mb-4">
          <svg className="w-32 h-32 transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="45"
              stroke="#e2e8f0"
              strokeWidth="10"
              fill="none"
            />
            <circle
              cx="64"
              cy="64"
              r="45"
              className={colors.stroke}
              strokeWidth="10"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900">{value}%</div>
            </div>
          </div>
        </div>
        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mb-3", colors.light)}>
          <Icon className={cn("w-6 h-6", colors.text)} />
        </div>
        <h3 className="text-sm font-medium text-slate-600 text-center">{title}</h3>
      </div>
    </div>
  );
}