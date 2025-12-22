import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, orderBy, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';

export interface CollectionRequest {
  id: string;
  [key: string]: any;
}

export function useCollectionRequests(params?: { start?: Date | null; end?: Date | null }) {
  return useQuery<CollectionRequest[]>({
    queryKey: ['frontdesk', 'collectionRequests', params?.start?.toISOString() ?? 'null', params?.end?.toISOString() ?? 'null'],
    queryFn: async () => {
      const collectionRequestsRef = collection(db, 'collectionRequests');
      let q;
      if (params?.start && params?.end) {
        const startTs = Timestamp.fromDate(params.start);
        const endTs = Timestamp.fromDate(params.end);
        q = query(collectionRequestsRef, where('requested_at', '>=', startTs), where('requested_at', '<=', endTs), orderBy('requested_at', 'desc'));
      } else {
        q = query(collectionRequestsRef, orderBy('created_at', 'desc'));
      }
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as CollectionRequest[];
    },
  });
}


