import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check } from 'lucide-react';
import { format } from 'date-fns';
import { taskService } from '../../services/taskService';
import { useAuth } from '../../hooks/useAuth';
import { useClickOutside } from '../../hooks/useClickOutside';
import { Task } from '../../types/task';

export default function TaskNotifications() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'new' | 'read'>('new');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useClickOutside(dropdownRef, () => setIsOpen(false));

  const fetchTasks = async () => {
    if (!user?.uid) return;

    try {
      const userTasks = await taskService.getTasksByAssignedUser(user.uid);
      setTasks(userTasks);
      
      // Count unread tasks
      const unread = userTasks.filter((t: Task) => !t.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  useEffect(() => {
    fetchTasks();
    // Refresh every 30 seconds
    const interval = setInterval(fetchTasks, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const markAsRead = async (taskId: string) => {
    try {
      await taskService.updateTask(taskId, { read: true });
      fetchTasks(); // Refresh the task list
    } catch (error) {
      console.error('Error marking task as read:', error);
    }
  };

  const handleTaskClick = (task: Task) => {
    if (!task.read) {
      markAsRead(task.id);
    }
    // Navigate to task details
    window.location.href = `/tasks/${task.id}`;
    setIsOpen(false);
  };

  const newTasks = tasks.filter(t => !t.read);
  const readTasks = tasks.filter(t => t.read);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Task Notifications</h3>
          </div>

          <div className="flex border-b border-gray-200">
            <button
              className={`flex-1 py-2 text-sm font-medium ${activeTab === 'new' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('new')}
            >
              New ({newTasks.length})
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium ${activeTab === 'read' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('read')}
            >
              Read ({readTasks.length})
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {(activeTab === 'new' ? newTasks : readTasks).length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No {activeTab === 'new' ? 'new' : 'read'} tasks
              </div>
            ) : (
              (activeTab === 'new' ? newTasks : readTasks).map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleTaskClick(task)}
                  className="w-full p-4 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-primary-700">
                        {task.priority.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {task.title}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {task.description}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Due: {format(new Date(task.dueDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                    {!task.read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                    )}
                    {task.read && (
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {tasks.length > 0 && (
            <div className="p-3 border-t border-gray-200">
              <button
                onClick={() => window.location.href = '/tasks'}
                className="w-full text-center text-sm text-primary-600 hover:text-primary-700"
              >
                View all tasks
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
