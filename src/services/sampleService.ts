import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface TimelineEvent {
  id: string;
  type: 'request' | 'driver_assigned' | 'collection' | 'registration' | 'received' | 
        'test_completed' | 'all_tests_completed' | 'driver_notified' | 'delivered' | 'canceled';
  timestamp: string;
  details: string;
  actor?: string;
  testId?: string;
  status?: 'completed' | 'canceled' | 'in_progress';
}

export interface TestDetail {
  id: string;
  name: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'canceled';
  startedAt?: string;
  completedAt?: string;
  targetTAT: number; // in hours
  results?: string;
  notes?: string;
}

export interface Sample {
  id: string;
  patientId: string;
  patientName: string;
  status: 'pending' | 'collected' | 'registered' | 'received' | 'completed' | 'delivered' | 'canceled';
  requestedAt: string;
  completedAt?: string;
  receivedAt: string;
  collectedAt?: string;
  registeredAt?: string;
  deliveredAt?: string;
  priority: 'routine' | 'urgent' | 'stat';
  testType: string;
  collectionCenter: string;
  accessionNumber: string;
  results?: string;
  driverName?: string;
  collectedBy?: string;
  processedBy?: string;
  deliveredBy?: string;
  deliveredTo?: string;
  tests: TestDetail[];
  completedTestsCount: number;
  totalTestsCount: number;
  timeline: TimelineEvent[];
  requestedBy?: string;
  driverAssignedAt?: string;
}

export const sampleService = {
  async getSamplesByStatusPaginated(
    status: string,
    lastDoc?: QueryDocumentSnapshot<DocumentData>
  ): Promise<{
    samples: Sample[];
    lastDoc: QueryDocumentSnapshot<DocumentData> | null;
    hasMore: boolean;
  }> {
    try {
      const collectionRef = collection(db, status === 'pending' ? 'sample-collections' : 'samples');
      
      // Build query based on whether we're filtering by status or not
      let q;
      
      if (status !== 'pending') {
        if (lastDoc) {
          q = query(
            collectionRef,
            where('status', '==', status),
            orderBy('requestedAt', 'desc'),
            limit(20),
            startAfter(lastDoc)
          );
        } else {
          q = query(
            collectionRef,
            where('status', '==', status),
            orderBy('requestedAt', 'desc'),
            limit(20)
          );
        }
      } else {
        if (lastDoc) {
          q = query(
            collectionRef,
            orderBy('requestedAt', 'desc'),
            limit(20),
            startAfter(lastDoc)
          );
        } else {
          q = query(
            collectionRef,
            orderBy('requestedAt', 'desc'),
            limit(20)
          );
        }
      }
      
      // Execute the query
      const snapshot = await getDocs(q);
      
      return {
        samples: snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Sample[],
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: !snapshot.empty && snapshot.docs.length === 20
      };
    } catch (error) {
      console.error('Error in getSamplesByStatusPaginated:', error);
      throw error;
    }
  },

  async getSamplesForTATCalculation(dateRange?: [Date | null, Date | null]): Promise<Sample[]> {
    try {
      console.log('Starting getSamplesForTATCalculation with dateRange:', dateRange);
      // Get all samples with status completed or delivered
      const collectionRef = collection(db, 'samples');
      console.log('Collection reference:', collectionRef.path);
      let q;
      
      if (dateRange && dateRange[0] && dateRange[1]) {
        const [start, end] = dateRange;
        console.log('Using date range filter:', { start, end });
        
        // Convert Date objects to Firestore Timestamps
        const startTimestamp = Timestamp.fromDate(start);
        const endTimestamp = Timestamp.fromDate(end);
        
        // Check if this is a quick filter (same day or very recent) vs custom range
        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        console.log('Days difference:', daysDiff);
        
        if (daysDiff <= 365) {
          // For quick filters and short ranges, get all data without limit
          q = query(
            collectionRef,
            where('status', 'in', ['completed', 'delivered']),
            where('requestedAt', '>=', startTimestamp),
            where('requestedAt', '<=', endTimestamp),
            orderBy('requestedAt', 'desc')
          );
        } else {
          // For very long custom ranges, use a reasonable limit
          q = query(
            collectionRef,
            where('status', 'in', ['completed', 'delivered']),
            where('requestedAt', '>=', startTimestamp),
            where('requestedAt', '<=', endTimestamp),
            orderBy('requestedAt', 'desc'),
            limit(5000)
          );
        }
      } else {
        // For "All Time", remove limit to get all samples
        console.log('Using all-time filter (no date range)');
        q = query(
          collectionRef,
          where('status', 'in', ['completed', 'delivered']),
          orderBy('requestedAt', 'desc')
        );
      }
      
      console.log('Executing query for samples');
      const snapshot = await getDocs(q);
      console.log('Query result:', snapshot.size, 'documents');
      const result = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Sample[];
      console.log('Returning', result.length, 'samples');
      return result;
    } catch (error) {
      console.error('Error in getSamplesForTATCalculation:', error);
      throw error;
    }
  },

  async getSampleCollectionsForTATCalculation(dateRange?: [Date | null, Date | null]): Promise<TimelineSamples[]> {
    try {
      console.log('Starting getSampleCollectionsForTATCalculation with dateRange:', dateRange);
      // Get sample collections from the collectionRequests collection 
      const collectionRef = collection(db, 'collectionRequests');
      console.log('Collection reference:', collectionRef.path);
      let q;
      
      if (dateRange && dateRange[0] && dateRange[1]) {
        const [start, end] = dateRange;
        console.log('Using date range filter:', { start, end });
        
        // Convert Date objects to Firestore Timestamps
        const startTimestamp = Timestamp.fromDate(start);
        const endTimestamp = Timestamp.fromDate(end);
        
        // Check if this is a quick filter (same day or very recent) vs custom range
        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        console.log('Days difference:', daysDiff);
        
        if (daysDiff <= 365) {
          // For quick filters and short ranges, get all data without limit
          q = query(
            collectionRef,
            where('status', 'in', ['completed', 'delivered']),
            where('created_at', '>=', startTimestamp),
            where('created_at', '<=', endTimestamp),
            orderBy('created_at', 'desc')
          );
        } else {
          // For very long custom ranges, use a reasonable limit
          q = query(
            collectionRef,
            where('status', 'in', ['completed', 'delivered']),
            where('created_at', '>=', startTimestamp),
            where('created_at', '<=', endTimestamp),
            orderBy('created_at', 'desc'),
            limit(5000)
          );
        }
      } else {
        // For "All Time", remove limit to get all samples
        console.log('Using all-time filter (no date range)');
        q = query(
          collectionRef,
          where('status', 'in', ['completed', 'delivered']),
          orderBy('created_at', 'desc')
        );
      }
      
      console.log('Executing query for collection requests');
      const snapshot = await getDocs(q);
      console.log('Query result:', snapshot.size, 'documents');
      const result = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TimelineSamples[];
      console.log('Returning', result.length, 'collection requests');
      return result;
    } catch (error) {
      console.error('Error in getSampleCollectionsForTATCalculation:', error);
      throw error;
    }
  }
}; 

// Type for the combined data needed for TAT calculations
export interface TimelineSamples {
  id: string;
  requested_at?: string;
  time_requested?: string;  // Alternative field name
  driver_assigned_at?: string;
  accepted_collection_at?: string;
  collected_at?: string;
  time_collected?: string;  // Alternative field name
  time_registered?: string;
  registered_at?: string;
  received_at?: string;
  completed_at?: string;
  delivered_at?: string;
  created_at?: Timestamp | string;
  updated_at?: Timestamp | string;
  status?: string;
  priority?: string;
} 