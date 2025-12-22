import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryService } from '../../services/queryService';
import type { NewQuery } from '../../types/query';

export function useCreateQuery() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (newQuery: NewQuery) => queryService.createQuery(newQuery),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['queries'] });
		},
	});
}

export function useAddSolution() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ queryId, solutionText, userId, userName }: { queryId: string; solutionText: string; userId: string; userName: string }) =>
			queryService.addSolution(queryId, solutionText, userId, userName),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['queries'] });
		},
	});
}

export function useUpdateQueryStatus() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ queryId, status }: { queryId: string; status: string }) => queryService.updateQuery(queryId, { status }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['queries'] });
		},
	});
}

export function useAddComment() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ queryId, commentData }: { queryId: string; commentData: any }) => queryService.addComment(queryId, commentData),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['queries'] });
		},
	});
}

export function useAddAttachment() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ queryId, file, userId, userName }: { queryId: string; file: File; userId: string; userName: string }) =>
			queryService.addAttachmentToQuery(queryId, file, userId, userName),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['queries'] });
		},
	});
}


