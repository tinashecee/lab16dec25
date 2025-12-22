import React from 'react';
import { Clock, ChevronRight } from 'lucide-react';
import { Task } from '../../types/tasks';

interface TaskItemProps {
  task: Task;
}

export default function TaskItem({ task }: TaskItemProps) {
  const priorityColors = {
    HIGH: 'bg-red-50 text-red-700 border-red-100',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-100',
    LOW: 'bg-green-50 text-green-700 border-green-100'
  };

  return (
    <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
      <div className="flex gap-3 items-center">
        <div className="w-2 h-2 rounded-full bg-primary-500" />
        <div>
          <p className="font-medium text-secondary-900">{task.title}</p>
          <div className="flex items-center gap-2 text-sm text-secondary-500">
            <Clock className="w-4 h-4" />
            <span>{task.dueTime}</span>
            <span>•</span>
            <span>ID: {task.sampleId}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`px-3 py-1 rounded-full text-xs border ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
        <button className="text-secondary-400 hover:text-secondary-600">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}