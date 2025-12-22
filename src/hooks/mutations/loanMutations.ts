import { useMutation, useQueryClient } from '@tanstack/react-query';
import { loanService } from '../../services/loanService';

export function useUpdateLoanStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, status, additionalData }: { requestId: string; status: string; additionalData?: any }) =>
      loanService.updateLoanRequestStatus(requestId, status, additionalData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loans'] });
    },
  });
}


