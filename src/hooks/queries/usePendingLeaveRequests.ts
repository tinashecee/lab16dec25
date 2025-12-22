import { useQuery } from '@tanstack/react-query';
import type { LeaveRequest } from '../../types/leave';
import { leaveService } from '../../services/leaveService';

export function usePendingLeaveRequests(role?: string) {
  return useQuery<LeaveRequest[]>({
    queryKey: ['leave', 'pendingForRole', role],
    queryFn: () => {
      if (!role) return Promise.resolve([] as LeaveRequest[]);
      return leaveService.getPendingLeaveRequests(role);
    },
    enabled: Boolean(role),
  });
}


