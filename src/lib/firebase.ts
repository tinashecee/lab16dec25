import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { collection, getDocs, query, where, doc, updateDoc, addDoc, orderBy, startAfter, limit } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase'; // Adjust path if needed

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase only if it hasn't been initialized
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore and Storage
export const db = getFirestore(app);
export const storage = getStorage(app);

// Add the missing collectionRequestService
export const collectionRequestService = {
  async getCollectionRequests() {
    try {
      const collectionRequestsRef = collection(db, "collectionRequests");
      const snapshot = await getDocs(collectionRequestsRef);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error fetching collection requests:", error);
      throw error;
    }
  },

  async getPendingCollectionRequests() {
    try {
      const collectionRequestsRef = collection(db, "collectionRequests");
      const q = query(
        collectionRequestsRef,
        where("status", "==", "PENDING")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error fetching pending collection requests:", error);
      throw error;
    }
  },

  async updateCollectionRequestStatus(id: string, status: string) {
    try {
      const collectionRequestRef = doc(db, "collectionRequests", id);
      await updateDoc(collectionRequestRef, {
        status: status,
        updatedAt: Timestamp.now()
      });
      return true;
    } catch (error) {
      console.error("Error updating collection request status:", error);
      throw error;
    }
  },

  async createCollectionRequest(data: any) {
    try {
      const collectionRequestsRef = collection(db, "collectionRequests");
      await addDoc(collectionRequestsRef, {
        ...data,
        status: "PENDING",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      return true;
    } catch (error) {
      console.error("Error creating collection request:", error);
      throw error;
    }
  },

  async getAllRequests(
    startDate?: Date,
    endDate?: Date,
    lastDoc?: QueryDocumentSnapshot<DocumentData>
  ) {
    try {
      const collectionRequestsRef = collection(db, "collectionRequests");
      let q = query(collectionRequestsRef, orderBy("created_at", "desc"));
      
      // Add date filtering if dates provided
      if (startDate && endDate) {
        q = query(
          q,
          where("created_at", ">=", startDate),
          where("created_at", "<=", endDate)
        );
      }
      
      // Add pagination if provided
      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }
      
      // Add limit
      q = query(q, limit(10));
      
      const snapshot = await getDocs(q);
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return {
        requests,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || undefined,
        hasMore: snapshot.docs.length === 10
      };
    } catch (error) {
      console.error("Error fetching collection requests:", error);
      throw error;
    }
  },
  
  // You might also need to add these functions based on your indexes
  async getRequestsByDriver(driverName: string) {
    try {
      const collectionRequestsRef = collection(db, "collectionRequests");
      // Using the index: assigned_driver.name Ascending requested_at Ascending __name__ Ascending
      const q = query(
        collectionRequestsRef,
        where("assigned_driver.name", "==", driverName),
        orderBy("requested_at", "asc"),
        orderBy("__name__", "asc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error fetching requests by driver:", error);
      throw error;
    }
  },
  
  async getRequestsByStatus(status: string) {
    try {
      const collectionRequestsRef = collection(db, "collectionRequests");
      // Using the index: status Ascending receivedAt Descending __name__ Descending
      const q = query(
        collectionRequestsRef,
        where("status", "==", status),
        orderBy("receivedAt", "desc"),
        orderBy("__name__", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error(`Error fetching requests with status ${status}:`, error);
      throw error;
    }
  }
}; 