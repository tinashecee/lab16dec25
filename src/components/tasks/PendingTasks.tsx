import React, { useState, useEffect } from "react";
import { Clock, AlertCircle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { taskService } from "../../services/taskService";
import type { Task } from "../../types/task";

export default function PendingTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.uid) {
      fetchPendingTasks();
    } else {
      setIsLoading(false);
    }
  }, [user?.uid]);

  const fetchPendingTasks = async () => {
    if (!user?.uid) return;

    try {
      const pendingTasks = await taskService.getPendingTasksForUser(user.uid);
      setTasks(pendingTasks);
    } catch (error) {
      console.error("Error fetching pending tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeColor = (status: Task["status"]) => {
    return status === "handed-over"
      ? "bg-yellow-50 text-yellow-700"
      : "bg-purple-50 text-purple-700";
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
        <div className="h-20 bg-gray-100 rounded-lg mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="text-center py-6 text-secondary-500">
          <p>Please sign in to view your tasks</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-lg">
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="font-semibold text-secondary-900">Pending Tasks</h2>
            <p className="text-sm text-secondary-500">Tasks assigned to you</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 text-primary-500" />
          <span className="text-primary-500 font-medium">
            {tasks.length} pending
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-secondary-900">{task.title}</h3>
                <p className="text-sm text-secondary-500 mt-1 line-clamp-1">
                  {task.description}
                </p>
              </div>
              <span
                className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeColor(
                  task.status
                )}`}>
                {task.status === "handed-over" ? "New" : "In Progress"}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs text-secondary-500">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    task.priority === "High"
                      ? "bg-red-500"
                      : task.priority === "Medium"
                      ? "bg-yellow-500"
                      : "bg-blue-500"
                  }`}></span>
                <span>{task.priority} Priority</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-6 text-secondary-500">
          <p>No pending tasks</p>
        </div>
      )}

      <button
        onClick={() => (window.location.href = "/tasks")}
        className="mt-4 w-full py-2 text-sm text-primary-600 hover:text-primary-700 font-medium">
        View All Tasks
      </button>
    </div>
  );
}
