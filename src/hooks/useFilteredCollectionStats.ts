import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type TimeFilter = 'day' | 'week' | 'month' | 'quarter' | 'year';

export type CollectionStats = {
  pendingRequests: number;
  completedRequests: number;
  uniqueCenters: number;
  totalRequests: number;
};

export function useFilteredCollectionStats(initialFilter: TimeFilter = 'day') {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(initialFilter);
  const [stats, setStats] = useState<CollectionStats>({
    pendingRequests: 0,
    completedRequests: 0,
    uniqueCenters: 0,
    totalRequests: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Calculate date range based on time filter
  const getDateRange = (filter: TimeFilter): { start: Date, end: Date } => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    
    switch (filter) {
      case 'day':
        // Today (already set)
        break;
      case 'week':
        // Last 7 days
        start.setDate(start.getDate() - 6);
        break;
      case 'month':
        // Current month
        start.setDate(1);
        break;
      case 'quarter':
        // Current quarter
        const currentMonth = start.getMonth();
        const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
        start.setMonth(quarterStartMonth, 1);
        break;
      case 'year':
        // Current year
        start.setMonth(0, 1);
        break;
    }
    
    return { start, end };
  };
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Get date range based on filter
        const { start, end } = getDateRange(timeFilter);
        const startTimestamp = Timestamp.fromDate(start);
        const endTimestamp = Timestamp.fromDate(end);
        
        const collectionRequestsRef = collection(db, "collectionRequests");
        
        // Get all requests in date range
        const timeRangeQuery = query(
          collectionRequestsRef,
          where("created_at", ">=", startTimestamp),
          where("created_at", "<=", endTimestamp)
        );
        
        const snapshot = await getDocs(timeRangeQuery);
        const requests = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Calculate stats
        const pendingCount = requests.filter(req => req.status === 'pending').length;
        const completedCount = requests.filter(req => 
          req.status === 'completed' || req.status === 'delivered'
        ).length;
        
        // Get unique centers
        const uniqueCentersSet = new Set();
        requests.forEach(req => {
          if (req.center_id) {
            uniqueCentersSet.add(req.center_id);
          } else if (req.center_name) {
            // Use center_name as fallback if center_id doesn't exist
            uniqueCentersSet.add(req.center_name);
          }
        });
        
        setStats({
          pendingRequests: pendingCount,
          completedRequests: completedCount,
          uniqueCenters: uniqueCentersSet.size,
          totalRequests: requests.length
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError('Failed to load dashboard statistics');
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [timeFilter]);
  
  return { 
    stats, 
    loading, 
    error, 
    timeFilter, 
    setTimeFilter 
  };
} 