import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { taskService } from '../../services/taskService';
import { Task } from '../../interfaces/task';

const TaskList = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const loadTasks = async () => {
      if (!user) return;
      
      try {
        const accessibleTasks = await taskService.getAccessibleTasks(user.id);
        setTasks(accessibleTasks);
      } catch (error) {
        console.error('Error loading tasks:', error);
      }
    };

    loadTasks();
  }, [user]);

  // ... rest of the component
};

export default TaskList; 