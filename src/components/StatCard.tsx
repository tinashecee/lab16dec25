import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
  icon: LucideIcon;
  change: string;
  color: string;
  trend: 'up' | 'down';
}

export default function StatCard({ 
  label, 
  value, 
  subtext, 
  icon: Icon, 
  change, 
  color, 
  trend 
}: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-start gap-4">
        <div className={`${color} bg-opacity-10 p-3 rounded-lg`}>
          <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
        <div className="flex-1">
          <p className="text-sm text-secondary-600">{label}</p>
          <div className="flex items-end gap-2 mt-1">
            <p className="text-2xl font-semibold text-secondary-900">{value}</p>
            <span className={`text-sm ${
              trend === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {change}
            </span>
          </div>
          {subtext && (
            <p className="text-sm text-secondary-500 mt-1">{subtext}</p>
          )}
        </div>
      </div>
    </div>
  );
}