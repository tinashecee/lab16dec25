import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  Timestamp,
  DocumentReference
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface CollectionCenter {
  id?: string;
  centerName: string;
  address: string;
  email: string;
  phone: string;
  route: string;
  contactPerson: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  status: 'active' | 'inactive';
}

const COLLECTION_NAME = 'collectionCenters';

export const collectionCenterService = {
  async addCenter(center: Omit<CollectionCenter, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<string> {
    try {
      const centerData = {
        ...center,
        centerName: center.centerName.trim(),
        status: 'active' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), centerData);
      console.log('Center added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error adding collection center:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to add collection center: ${error.message}`);
      }
      throw new Error('Failed to add collection center');
    }
  },

  async getCenters(): Promise<CollectionCenter[]> {
    try {
      const centersRef = collection(db, COLLECTION_NAME);
      const q = query(
        centersRef,
        where('status', '==', 'active'),
        orderBy('centerName', 'asc'),
        orderBy('__name__', 'asc')
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('No collection centers found');
        return [];
      }
      
      const centers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as CollectionCenter[];

      console.log('Fetched centers:', centers);
      return centers;
    } catch (error) {
      console.error('Error fetching collection centers:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to fetch collection centers: ${error.message}`);
      }
      throw new Error('Failed to fetch collection centers');
    }
  },

  async getCentersByRoute(route: string): Promise<CollectionCenter[]> {
    try {
      const centersRef = collection(db, COLLECTION_NAME);
      const q = query(
        centersRef,
        where('status', '==', 'active'),
        where('route', '==', route),
        orderBy('centerName', 'asc'),
        orderBy('__name__', 'asc')
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('No centers found for route:', route);
        return [];
      }
      
      const centers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as CollectionCenter[];

      console.log('Fetched centers for route:', route, centers);
      return centers;
    } catch (error) {
      console.error('Error fetching centers by route:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to fetch centers by route: ${error.message}`);
      }
      throw new Error('Failed to fetch centers by route');
    }
  }
}; 