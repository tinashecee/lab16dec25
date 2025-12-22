import { useQuery } from '@tanstack/react-query';
import { queryService } from '../../../services/queryService';
import type { Query } from '../../../types/query';

export function useQueries() {
	return useQuery<Query[]>({
		queryKey: ['queries'],
		queryFn: () => queryService.getQueries(),
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 30 * 60 * 1000, // 30 minutes
		refetchOnWindowFocus: false,
		refetchOnMount: false, // Don't refetch if data is still fresh
	});
}


