import { useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveService } from '../../services/leaveService';

export function useConfirmLeaveRequest(role?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, approverId }: { requestId: string; approverId: string }) =>
      leaveService.confirmLeaveRequest(requestId, approverId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave'] });
      if (role) qc.invalidateQueries({ queryKey: ['leave', 'pendingForRole', role] });
    },
  });
}

export function useApproveLeaveRequest(role?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, approverId, comments }: { requestId: string; approverId: string; comments?: string }) =>
      leaveService.approveLeaveRequest(requestId, approverId, comments),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave'] });
      if (role) qc.invalidateQueries({ queryKey: ['leave', 'pendingForRole', role] });
    },
  });
}

export function useRejectLeaveRequest(role?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, rejectorId, reason }: { requestId: string; rejectorId: string; reason: string }) =>
      leaveService.rejectLeaveRequest(requestId, rejectorId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave'] });
      if (role) qc.invalidateQueries({ queryKey: ['leave', 'pendingForRole', role] });
    },
  });
}


