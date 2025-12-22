import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';

export type TimeFilter = 'day' | 'week' | 'month' | 'year' | 'all';

export interface SampleStats {
	totalSamples: number;
	pendingCollections: number;
	inProgress: number;
	completed: number;
	delivered: number;
}

function getDateRange(filter: TimeFilter): { start: Date | null; end: Date | null } {
	const now = new Date();
	const start = new Date();
	const end = new Date();
	switch (filter) {
		case 'day':
			start.setHours(0, 0, 0, 0);
			end.setHours(23, 59, 59, 999);
			return { start, end };
		case 'week':
			start.setDate(now.getDate() - 7);
			start.setHours(0, 0, 0, 0);
			end.setHours(23, 59, 59, 999);
			return { start, end };
		case 'month':
			start.setMonth(now.getMonth() - 1);
			start.setHours(0, 0, 0, 0);
			end.setHours(23, 59, 59, 999);
			return { start, end };
		case 'year':
			start.setFullYear(now.getFullYear() - 1);
			start.setHours(0, 0, 0, 0);
			end.setHours(23, 59, 59, 999);
			return { start, end };
		case 'all':
		default:
			return { start: null, end: null };
	}
}

export function useSampleStats(timeFilter: TimeFilter) {
	return useQuery<SampleStats>({
		queryKey: ['samples', 'stats', timeFilter],
		queryFn: async () => {
			const { start, end } = getDateRange(timeFilter);
			const collectionRequestsRef = collection(db, 'collectionRequests');

			const buildQuery = (statusFilter?: string | string[]) => {
				if (timeFilter === 'all') {
					if (!statusFilter) return query(collectionRequestsRef);
					if (Array.isArray(statusFilter)) return query(collectionRequestsRef, where('status', 'in', statusFilter));
					return query(collectionRequestsRef, where('status', '==', statusFilter));
				}
				const startTs = Timestamp.fromDate(start!);
				const endTs = Timestamp.fromDate(end!);
				if (!statusFilter) return query(collectionRequestsRef, where('created_at', '>=', startTs), where('created_at', '<=', endTs));
				if (Array.isArray(statusFilter))
					return query(
						collectionRequestsRef,
						where('status', 'in', statusFilter),
						where('created_at', '>=', startTs),
						where('created_at', '<=', endTs)
					);
				return query(collectionRequestsRef, where('status', '==', statusFilter), where('created_at', '>=', startTs), where('created_at', '<=', endTs));
			};

			const [totalSnapshot, pendingSnapshot, inProgressSnapshot, completedSnapshot, deliveredSnapshot] = await Promise.all([
				getDocs(buildQuery()),
				getDocs(buildQuery('pending')),
				getDocs(buildQuery(['collected', 'registered', 'received'])),
				getDocs(buildQuery('completed')),
				getDocs(buildQuery('delivered')),
			]);

			return {
				totalSamples: totalSnapshot.size,
				pendingCollections: pendingSnapshot.size,
				inProgress: inProgressSnapshot.size,
				completed: completedSnapshot.size,
				delivered: deliveredSnapshot.size,
			};
		},
		staleTime: 60_000,
	});
}


