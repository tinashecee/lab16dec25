import { useEffect, useState } from 'react';
import { Task, taskService } from '../../services/taskService';
import { useAuth } from '../../hooks/useAuth';

export default function TasksList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchTasks = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        // Use the new method to get only relevant tasks
        const userTasks = await taskService.getUserRelevantTasks(user.id);
        setTasks(userTasks);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [user]);

  // ... rest of the component code ...
  
  // Add visual indicators for task relevance
  const getTaskBadge = (task: Task) => {
    if (task.isAssignedToMe) {
      return <span className="px-2 py-1 text-xs rounded-full bg-primary-100 text-primary-800">Assigned to me</span>;
    }
    if (task.isCreatedByMe) {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">Created by me</span>;
    }
    return null;
  };

  // Add this inside your component
  const getTaskLabel = (task: Task) => {
    switch(task.relevance) {
      case 'assigned':
        return <span className="px-2 py-0.5 text-xs bg-primary-100 text-primary-800 rounded-full">Assigned to me</span>;
      case 'created':
        return <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-800 rounded-full">Created by me</span>;
      case 'both':
        return <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-800 rounded-full">My task</span>;
      default:
        return null;
    }
  };
} 