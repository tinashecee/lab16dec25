import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where, Timestamp, getCountFromServer } from 'firebase/firestore';
import { db } from '../../../config/firebase';

export interface DashboardStats {
  totalSamples: {
    current: number;
    monthToDate: number;
    todayChange: number;
  };
  inProgress: {
    total: number;
    monthToDate: number;
    todayChange: number;
  };
  pendingCollections: {
    total: number;
    monthToDate: number;
    todayChange: number;
  };
}

/**
 * Optimized hook to fetch dashboard statistics using TanStack Query
 * Uses server-side filtering where possible to reduce data transfer
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async (): Promise<DashboardStats> => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const todayTimestamp = Timestamp.fromDate(today);
      const monthStartTimestamp = Timestamp.fromDate(monthStart);

      const collectionRequestsRef = collection(db, 'collectionRequests');

      // Fetch data in parallel with optimized queries
      // Instead of fetching all documents, we fetch:
      // 1. All documents (for total count)
      // 2. Month-to-date documents (filtered server-side)
      // 3. Today's documents (filtered server-side)
      // 4. Status-specific queries for in-progress and pending

      // Use count queries for better performance - only fetch counts, not full documents
      // This dramatically reduces data transfer and improves load times
      const [
        totalCount,
        monthToDateCount,
        todayCount,
        inProgressTotalCount,
        inProgressMonthCount,
        inProgressTodayCount,
        pendingTotalCount,
        pendingMonthCount,
        pendingTodayCount
      ] = await Promise.all([
        // Total count - use count query instead of fetching all docs
        getCountFromServer(collectionRequestsRef),
        // Month-to-date count
        getCountFromServer(query(
          collectionRequestsRef,
          where('created_at', '>=', monthStartTimestamp)
        )),
        // Today's count
        getCountFromServer(query(
          collectionRequestsRef,
          where('created_at', '>=', todayTimestamp)
        )),
        // In-progress total count
        getCountFromServer(query(
          collectionRequestsRef,
          where('status', 'in', ['collected', 'registered', 'received'])
        )),
        // In-progress month-to-date count
        getCountFromServer(query(
          collectionRequestsRef,
          where('status', 'in', ['collected', 'registered', 'received']),
          where('created_at', '>=', monthStartTimestamp)
        )),
        // In-progress today count
        getCountFromServer(query(
          collectionRequestsRef,
          where('status', 'in', ['collected', 'registered', 'received']),
          where('created_at', '>=', todayTimestamp)
        )),
        // Pending total count
        getCountFromServer(query(
          collectionRequestsRef,
          where('status', '==', 'pending')
        )),
        // Pending month-to-date count
        getCountFromServer(query(
          collectionRequestsRef,
          where('status', '==', 'pending'),
          where('created_at', '>=', monthStartTimestamp)
        )),
        // Pending today count
        getCountFromServer(query(
          collectionRequestsRef,
          where('status', '==', 'pending'),
          where('created_at', '>=', todayTimestamp)
        ))
      ]);

      // Calculate stats from count results
      const totalSamples = {
        current: totalCount.data().count,
        monthToDate: monthToDateCount.data().count,
        todayChange: todayCount.data().count,
      };

      const inProgress = {
        total: inProgressTotalCount.data().count,
        monthToDate: inProgressMonthCount.data().count,
        todayChange: inProgressTodayCount.data().count,
      };

      const pendingCollections = {
        total: pendingTotalCount.data().count,
        monthToDate: pendingMonthCount.data().count,
        todayChange: pendingTodayCount.data().count,
      };

      return {
        totalSamples,
        inProgress,
        pendingCollections,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - stats don't need to be super fresh, cache longer
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache longer
    refetchOnWindowFocus: false, // Don't refetch on window focus for dashboard stats
    refetchOnMount: false, // Don't refetch if data is still fresh
  });
}

