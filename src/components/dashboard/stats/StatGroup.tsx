import React from 'react';
import { TestTube2, Clock, Timer } from 'lucide-react';
import StatCard from '../../StatCard';
import SampleTurnAroundCard from '../../SampleTurnAroundCard';
import SamplesTable from '../samples/SamplesTable';
import PendingTasks from '../PendingTasks';
import DriversLocation from '../drivers/DriversLocation';
import { useDashboardStats } from '../../../hooks/queries/dashboard/useDashboardStats';
import { Skeleton } from '../../ui/skeleton';
import { StatCardProps } from './types';

export default function StatGroup() {
  const { data: stats, isLoading: loading, error } = useDashboardStats();

  if (loading) {
    return <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>;
  }

  if (error) {
    return <div className="text-red-500">Error loading stats: {error}</div>;
  }

  const statCards: StatCardProps[] = [
    { 
      label: 'Total Samples', 
      value: stats?.totalSamples.current.toLocaleString() || '0', 
      subtext: `Month to date: ${stats?.totalSamples.monthToDate.toLocaleString()}`,
      icon: TestTube2,
      change: `Today: +${stats?.totalSamples.todayChange || 0}`,
      color: 'bg-primary-500',
      trend: (stats?.totalSamples.todayChange || 0) > 0 ? 'up' : 'down'
    },
    { 
      label: 'Samples In Progress', 
      value: stats?.inProgress.total.toLocaleString() || '0', 
      subtext: `Month to date: ${stats?.inProgress.monthToDate.toLocaleString()}`,
      icon: Clock,
      change: `Today: +${stats?.inProgress.todayChange || 0}`,
      color: 'bg-amber-500',
      trend: (stats?.inProgress.todayChange || 0) > 0 ? 'up' : 'down'
    },
    { 
      label: 'Pending Collections', 
      value: stats?.pendingCollections.total.toLocaleString() || '0', 
      subtext: `Month to date: ${stats?.pendingCollections.monthToDate.toLocaleString()}`,
      icon: Timer,
      change: `Today: +${stats?.pendingCollections.todayChange || 0}`,
      color: 'bg-blue-500',
      trend: (stats?.pendingCollections.todayChange || 0) > 0 ? 'up' : 'down'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>
      <SampleTurnAroundCard />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <SamplesTable />
        </div>
        <div className="lg:col-span-1">
          <PendingTasks />
        </div>
      </div>
      
      <div>
        <DriversLocation />
      </div>
    </div>
  );
}