import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh for 5 minutes
			gcTime: 30 * 60 * 1000, // 30 minutes - cache persists for 30 minutes
			refetchOnWindowFocus: false, // Don't refetch when window regains focus
			refetchOnMount: false, // Don't refetch on mount if data is fresh
			refetchOnReconnect: true, // Refetch when network reconnects
			retry: 1, // Only retry once on failure
			// Enable structural sharing to prevent unnecessary re-renders
			structuralSharing: true,
		},
	},
});


