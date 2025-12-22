import React from "react";
import { Clock, AlertCircle, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { usePendingTasks } from "../../hooks/queries/dashboard/usePendingTasks";

export default function PendingTasks() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const { data: tasks = [], isLoading: loading, error } = usePendingTasks(userData?.id);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'InProgress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Clock className="w-3 h-3" />;
      case 'InProgress':
        return <AlertCircle className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'border-l-red-500';
      case 'High':
        return 'border-l-orange-500';
      case 'Normal':
        return 'border-l-blue-500';
      case 'Low':
        return 'border-l-green-500';
      default:
        return 'border-l-gray-500';
    }
  };

  const handleTaskClick = (taskId: string) => {
    navigate(`/app/tasks?taskId=${taskId}`);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">My Tasks</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-100 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">My Tasks</h2>
        </div>
        <div className="text-red-500 text-sm">
          {error instanceof Error ? error.message : 'Failed to fetch your tasks'}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">My Tasks</h2>
        </div>
        {tasks.length > 0 && (
          <span className="px-2 py-1 text-xs bg-primary-100 text-primary-800 rounded-full">
            {tasks.length}
          </span>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm">
            Great! You have no pending tasks.
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {tasks.map((task) => (
            <div 
              key={task.id} 
              onClick={() => handleTaskClick(task.id)}
              className={`border-l-4 ${getPriorityColor(task.priority)} bg-gray-50 p-4 rounded-r-lg hover:bg-gray-100 transition-colors cursor-pointer`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 text-sm line-clamp-1">
                    {task.title}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {task.description}
                  </p>
                </div>
              </div>
              
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                    {getStatusIcon(task.status)}
                    {task.status}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-700">
                    {task.priority}
                  </span>
                </div>
              </div>
              
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>
                  Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                </span>
                {task.attachments && task.attachments.length > 0 && (
                  <span className="flex items-center gap-1">
                    📎 {task.attachments.length}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {tasks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Click on any task to view details and take action
          </p>
        </div>
      )}
    </div>
  );
}
