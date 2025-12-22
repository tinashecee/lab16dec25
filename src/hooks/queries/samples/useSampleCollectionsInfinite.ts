import { useInfiniteQuery } from '@tanstack/react-query';
import { sampleCollectionService } from '../../../services/sampleCollectionService';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import type { SampleCollection } from '../../../services/sampleCollectionService';

export function useSampleCollectionsInfinite(
  status: SampleCollection['status'] | 'all',
  options?: { enabled?: boolean }
) {
  return useInfiniteQuery({
    queryKey: ['samples', 'collections', status],
    queryFn: async ({ pageParam }: { pageParam?: QueryDocumentSnapshot<DocumentData> }) => {
      return sampleCollectionService.getSampleCollectionsPaginated(status, pageParam);
    },
    initialPageParam: undefined as QueryDocumentSnapshot<DocumentData> | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.lastDoc : undefined),
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
}


