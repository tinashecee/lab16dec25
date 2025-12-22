import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../../config/firebase';

export interface GeneralCall {
  id: string;
  [key: string]: any;
}

export function useGeneralCalls() {
  return useQuery<GeneralCall[]>({
    queryKey: ['frontdesk', 'generalCalls'],
    queryFn: async () => {
      const callsRef = collection(db, 'generalCalls');
      const q = query(callsRef, orderBy('created_at', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as GeneralCall[];
    },
  });
}


