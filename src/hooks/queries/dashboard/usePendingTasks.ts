import { useQuery } from '@tanstack/react-query';
import { taskService } from '../../../services/taskService';
import { Task } from '../../../types/task';

/**
 * Hook to fetch user's pending/in-progress tasks with TanStack Query caching
 * Returns tasks that:
 * 1. Are assigned to the logged-in user (assignee), OR
 * 2. Were assigned by the logged-in user (assigning party)
 * 3. Have status of "Pending" or "InProgress" (excludes "Completed" and "Cancelled")
 */
export function usePendingTasks(userId: string | undefined) {
  return useQuery({
    queryKey: ['pendingTasks', userId],
    queryFn: async (): Promise<Task[]> => {
      if (!userId) return [];
      
      // Fetch all tasks relevant to the user
      // getUserRelevantTasks already returns tasks where:
      // - User is assigned (in assignedUsers array)
      // - User created (createdBy === userId)
      // - User assigned (assignedBy === userId or userName)
      const relevantTasks = await taskService.getUserRelevantTasks(userId);
      
      // Since getUserRelevantTasks already filters for relevance, we just need to filter by status
      // Only include Pending or InProgress tasks (explicitly exclude Completed and Cancelled)
      const myIncompleteTasks = relevantTasks.filter((task: Task) => {
        const isPendingOrInProgress = task.status === 'Pending' || task.status === 'InProgress';
        const isNotCompleted = task.status !== 'Completed';
        const isNotCancelled = task.status !== 'Cancelled';
        
        return isPendingOrInProgress && isNotCompleted && isNotCancelled;
      });
      
      // Sort by due date (earliest first), then by status (Pending before InProgress)
      myIncompleteTasks.sort((a, b) => {
        // First sort by status: Pending comes before InProgress
        const statusOrder = { 'Pending': 0, 'InProgress': 1 };
        const statusDiff = (statusOrder[a.status as keyof typeof statusOrder] ?? 99) - 
                          (statusOrder[b.status as keyof typeof statusOrder] ?? 99);
        if (statusDiff !== 0) return statusDiff;
        
        // Then sort by due date (earliest first)
        const dateA = new Date(a.dueDate);
        const dateB = new Date(b.dueDate);
        return dateA.getTime() - dateB.getTime();
      });
      
      return myIncompleteTasks;
    },
    enabled: !!userId,
    staleTime: 3 * 60 * 1000, // 3 minutes - tasks don't change that frequently
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch if data is still fresh
  });
}

