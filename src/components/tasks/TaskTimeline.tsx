import React from 'react';
import { Clock, CheckCircle, PlayCircle, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format, differenceInMinutes, differenceInHours, differenceInDays, isBefore } from 'date-fns';
import { Task } from '../../types/task';

interface TaskTimelineProps {
  task: Task;
}

interface TimelineStage {
  name: string;
  status: 'completed' | 'current' | 'pending';
  timestamp: Date | null;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const formatDuration = (fromDate: Date, toDate: Date): string => {
  const minutes = differenceInMinutes(toDate, fromDate);
  const hours = differenceInHours(toDate, fromDate);
  const days = differenceInDays(toDate, fromDate);

  if (days > 0) {
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  } else if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  } else {
    return `${minutes}m`;
  }
};

const calculateTotalResolutionTime = (createdAt: Date, completedAt: Date | null): string | null => {
  if (!completedAt) return null;
  return formatDuration(createdAt, completedAt);
};

const calculateResolutionStatus = (dueDate: string, completedAt: Date | null): {
  status: 'on-time' | 'late-acceptable' | 'late';
  color: 'green' | 'amber' | 'red';
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  delay?: string;
} => {
  if (!completedAt) {
    return {
      status: 'on-time',
      color: 'green',
      icon: Clock,
      label: 'In Progress'
    };
  }

  const deadline = new Date(dueDate);
  const completionTime = completedAt;
  
  if (isBefore(completionTime, deadline) || completionTime.getTime() === deadline.getTime()) {
    return {
      status: 'on-time',
      color: 'green',
      icon: CheckCircle2,
      label: 'On Time'
    };
  }
  
  const delayMinutes = differenceInMinutes(completionTime, deadline);
  const delayFormatted = delayMinutes < 60 ? `${delayMinutes}m` : formatDuration(deadline, completionTime);
  
  if (delayMinutes <= 20) {
    return {
      status: 'late-acceptable',
      color: 'amber',
      icon: AlertTriangle,
      label: 'Slightly Late',
      delay: delayFormatted
    };
  }
  
  return {
    status: 'late',
    color: 'red',
    icon: AlertTriangle,
    label: 'Late',
    delay: delayFormatted
  };
};

export default function TaskTimeline({ task }: TaskTimelineProps) {
  const createdAt = task.createdAt?.toDate() || null;
  const acceptedAt = task.acceptedAt?.toDate() || null;
  const completedAt = task.completedAt?.toDate() || null;

  const stages: TimelineStage[] = [
    {
      name: 'Created',
      status: 'completed',
      timestamp: createdAt,
      icon: FileText,
      color: 'blue'
    },
    {
      name: 'Accepted',
      status: acceptedAt ? 'completed' : (task.status === 'InProgress' || task.status === 'Completed' ? 'current' : 'pending'),
      timestamp: acceptedAt,
      icon: PlayCircle,
      color: 'yellow'
    },
    {
      name: 'Completed',
      status: completedAt ? 'completed' : (task.status === 'Completed' ? 'current' : 'pending'),
      timestamp: completedAt,
      icon: CheckCircle,
      color: 'green'
    }
  ];

  const totalResolutionTime = createdAt && completedAt ? calculateTotalResolutionTime(createdAt, completedAt) : null;
  const resolutionStatus = calculateResolutionStatus(task.dueDate, completedAt);
  
  const getStageColor = (stage: TimelineStage) => {
    switch (stage.status) {
      case 'completed':
        return stage.color === 'blue' ? 'bg-blue-500' : stage.color === 'yellow' ? 'bg-yellow-500' : 'bg-green-500';
      case 'current':
        return stage.color === 'blue' ? 'bg-blue-200' : stage.color === 'yellow' ? 'bg-yellow-200' : 'bg-green-200';
      default:
        return 'bg-gray-300';
    }
  };

  const getStageTextColor = (stage: TimelineStage) => {
    switch (stage.status) {
      case 'completed':
        return 'text-white';
      case 'current':
        return stage.color === 'blue' ? 'text-blue-700' : stage.color === 'yellow' ? 'text-yellow-700' : 'text-green-700';
      default:
        return 'text-gray-500';
    }
  };

  const getResolutionStatusColor = () => {
    switch (resolutionStatus.color) {
      case 'green':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'amber':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'red':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-3">
              {/* Header with Resolution Status */}
        <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Task Timeline</h3>
        </div>
        <div className="flex items-center gap-4">
          {/* Resolution Status Indicator */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getResolutionStatusColor()}`}>
            <resolutionStatus.icon className="w-4 h-4" />
            <span className="text-sm font-medium">{resolutionStatus.label}</span>
            {resolutionStatus.delay && (
              <span className="text-xs">({resolutionStatus.delay})</span>
            )}
          </div>
          {totalResolutionTime && (
            <div>
              <span className="text-sm text-gray-500">Total Time: </span>
              <span className="text-sm font-bold text-primary-600">{totalResolutionTime}</span>
            </div>
          )}
        </div>
      </div>

      {/* Horizontal Timeline */}
      <div className="relative">
        {/* Horizontal timeline line */}
        <div className="absolute top-6 left-6 right-6 h-0.5 bg-gray-300"></div>

        {/* Timeline stages - horizontal layout */}
        <div className="relative flex items-start justify-between">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            const nextStage = stages[index + 1];
            const duration = stage.timestamp && nextStage?.timestamp 
              ? formatDuration(stage.timestamp, nextStage.timestamp)
              : null;

            return (
              <div key={stage.name} className="flex flex-col items-center flex-1">
                {/* Stage icon */}
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center z-10 
                  ${getStageColor(stage)}
                  transition-all duration-200
                `}>
                  <Icon className={`w-6 h-6 ${getStageTextColor(stage)}`} />
                </div>

                {/* Stage content */}
                <div className="mt-3 text-center">
                  <h4 className={`
                    text-sm font-semibold 
                    ${stage.status === 'completed' ? 'text-gray-900' : 
                      stage.status === 'current' ? 'text-primary-600' : 'text-gray-500'}
                  `}>
                    {stage.name}
                  </h4>
                  
                  {stage.timestamp ? (
                    <div className="mt-1">
                      <div className="text-xs font-medium text-gray-900">
                        {format(stage.timestamp, 'MMM d')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(stage.timestamp, 'h:mm a')}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 mt-1">
                      {stage.status === 'current' ? 'In progress' : 'Pending'}
                    </div>
                  )}

                  {/* Duration badge */}
                  {duration && index < stages.length - 1 && (
                    <div className="mt-2">
                      <span className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded-full">
                        {duration}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

              {/* Detailed Stats */}
        <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <span className="text-gray-500 block">Time to Accept</span>
            <div className="font-medium text-gray-900">
              {createdAt && acceptedAt ? formatDuration(createdAt, acceptedAt) : '--'}
            </div>
          </div>
          <div className="text-center">
            <span className="text-gray-500 block">Time to Complete</span>
            <div className="font-medium text-gray-900">
              {acceptedAt && completedAt ? formatDuration(acceptedAt, completedAt) : 
               createdAt && completedAt ? formatDuration(createdAt, completedAt) : '--'}
            </div>
          </div>
          <div className="text-center">
            <span className="text-gray-500 block">Deadline</span>
            <div className="font-medium text-gray-900">
              {format(new Date(task.dueDate), 'MMM d, h:mm a')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 