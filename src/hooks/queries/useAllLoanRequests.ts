import { useQuery } from '@tanstack/react-query';
import { loanService, type LoanRequest } from '../../services/loanService';

export function useAllLoanRequests() {
	return useQuery<LoanRequest[]>({
		queryKey: ['loans', 'all'],
		queryFn: () => loanService.getAllLoanRequests(),
	});
}


