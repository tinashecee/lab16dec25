import { useQuery } from '@tanstack/react-query';
import type { LeaveRequest } from '../../types/leave';
import { leaveService } from '../../services/leaveService';

export function useAllLeaveRequests() {
	return useQuery<LeaveRequest[]>({
		queryKey: ['leave', 'all'],
		queryFn: () => leaveService.getAllLeaveRequests(),
	});
}


