import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type CollectionStats = {
  pendingRequests: number;
  completedToday: number;
  driverAssigned: number;
  totalRequests: number;
  loading: boolean;
};

export function useCollectionStats() {
  const [stats, setStats] = useState<CollectionStats>({
    pendingRequests: 0,
    completedToday: 0,
    driverAssigned: 0,
    totalRequests: 0,
    loading: true
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    
    const startTimestamp = Timestamp.fromDate(startOfToday);
    const endTimestamp = Timestamp.fromDate(endOfToday);
    
    const collectionRequestsRef = collection(db, "collectionRequests");
    
    // Use a single query with a more complex where clause for efficiency
    const q = query(collectionRequestsRef);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const allRequests = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Calculate stats client-side for more efficient Firestore usage
        const pendingCount = allRequests.filter(req => req.status === 'pending').length;
        
        const completedTodayCount = allRequests.filter(req => 
          (req.status === 'completed' || req.status === 'delivered') && 
          req.updated_at && 
          req.updated_at.toDate() >= startOfToday &&
          req.updated_at.toDate() <= endOfToday
        ).length;
        
        const assignedDriverCount = allRequests.filter(req => req.assigned_driver).length;
        
        setStats({
          pendingRequests: pendingCount,
          completedToday: completedTodayCount,
          driverAssigned: assignedDriverCount,
          totalRequests: allRequests.length,
          loading: false
        });
      } catch (err) {
        console.error('Error processing stats:', err);
        setError('Failed to process statistics');
        setStats(prev => ({...prev, loading: false}));
      }
    }, (err) => {
      console.error('Error fetching stats:', err);
      setError('Failed to load statistics');
      setStats(prev => ({...prev, loading: false}));
    });
    
    return () => unsubscribe();
  }, []);

  return { stats, error };
} 