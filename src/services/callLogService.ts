import { 
  collection, 
  addDoc,
  query,
  orderBy,
  getDocs,
  serverTimestamp} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface CallLog {
  id?: string;
  date: string;
  time: string;
  callPurpose: 'inquiry' | 'complaint' | 'follow_up';
  center: string;
  priority: 'routine' | 'urgent' | 'emergency';
  callerName: string;
  callerNumber: string;
  callNotes?: string;
  loggedAt: any;
}

const COLLECTION_NAME = 'callLogs';

export const callLogService = {
  async logCall(callData: Omit<CallLog, 'id' | 'loggedAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...callData,
        loggedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error logging call:', error);
      throw error;
    }
  },

  async getRecentCalls(): Promise<CallLog[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('loggedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CallLog[];
    } catch (error) {
      console.error('Error fetching call logs:', error);
      throw error;
    }
  }
}; 