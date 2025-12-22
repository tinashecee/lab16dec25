import React from 'react';
import { TestTube2, Clock, Timer, TrendingUp } from 'lucide-react';
import StatCard from './StatCard';
import SampleTurnAroundCard from './SampleTurnAroundCard';

const stats = [
  { 
    label: 'Total Samples', 
    value: '1,248', 
    subtext: 'Month to date: 842',
    icon: TestTube2,
    change: 'Today: +42',
    color: 'bg-primary-500',
    trend: 'up'
  },
  { 
    label: 'Samples In Progress', 
    value: '156', 
    subtext: '32 critical priority',
    icon: Clock,
    change: '+18 last hour',
    color: 'bg-amber-500',
    trend: 'up'
  },
  { 
    label: 'Pending Collections', 
    value: '64', 
    subtext: '12 urgent requests',
    icon: Timer,
    change: '-3 from yesterday',
    color: 'bg-blue-500',
    trend: 'down'
  }
];

export default function Stats() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>
      <SampleTurnAroundCard />
    </div>
  );
}