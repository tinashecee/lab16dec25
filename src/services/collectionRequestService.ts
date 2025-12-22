import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const sampleCollectionsRef = collection(db, "sample-collections");
const collectionRequestsRef = collection(db, "collectionRequests");
const PAGE_SIZE = 10;

export interface CollectionRequest {
  id: string;
  sample_id: string;
  sample_type: string;
  status: "pending" | "processing" | "completed" | "rejected";
  priority: "routine" | "urgent" | "emergency";
  center_name: string;
  center_address: string;
  center_coordinates: {
    lat: number;
    lng: number;
  };
  center_id: string | null;
  assigned_driver?: {
    id: string;
    name: string;
  };
  messageToken?: string;
  caller_name: string;
  caller_number: string;
  notes: string;
  created_at: any;
  updated_at?: any;
  requested_at: string;
}

export const collectionRequestService = {
  async getPendingRequests(
    lastDoc?: QueryDocumentSnapshot<DocumentData>
  ): Promise<{
    requests: CollectionRequest[];
    lastDoc: QueryDocumentSnapshot<DocumentData> | undefined;
    hasMore: boolean;
  }> {
    try {
      console.log("Fetching pending requests from sample-collections and collectionRequests...");

      // Query sample-collections
      let sampleCollectionsQuery = query(
        sampleCollectionsRef,
        orderBy("created_at", "desc"),
        limit(PAGE_SIZE)
      );
      if (lastDoc) {
        sampleCollectionsQuery = query(sampleCollectionsQuery, startAfter(lastDoc));
      }
      const sampleCollectionsSnapshot = await getDocs(sampleCollectionsQuery);

      // Query collectionRequests
      let collectionRequestsQuery = query(
        collectionRequestsRef,
        orderBy("created_at", "desc"),
        limit(PAGE_SIZE)
      );
      if (lastDoc) {
        collectionRequestsQuery = query(collectionRequestsQuery, startAfter(lastDoc));
      }
      const collectionRequestsSnapshot = await getDocs(collectionRequestsQuery);

      // Combine and process data from both collections
      const combinedDocs = [
        ...sampleCollectionsSnapshot.docs,
        ...collectionRequestsSnapshot.docs,
      ];

      const combinedRequests = combinedDocs ? combinedDocs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          sample_id: data.sample_id,
          sample_type: data.sample_type || "general",
          status: data.status,
          priority: data.priority,
          center_name: data.center_name,
          center_address: data.center_address || "",
          center_coordinates: data.center_coordinates || { lat: 0, lng: 0 },
          center_id: data.center_id || null,
          assigned_driver: data.assigned_driver
            ? {
                id: data.assigned_driver.id,
                name: data.assigned_driver.name,
              }
            : undefined,
          messageToken: data.messageToken || "",
          caller_name: data.caller_name || "",
          caller_number: data.caller_number || "",
          notes: data.notes || "",
          created_at: data.created_at,
          updated_at: data.updated_at,
          requested_at: data.requested_at,
        };
      }).filter(doc => doc && doc.status === "pending") : [];

      // Handle pagination
      const hasMore = combinedDocs.length > PAGE_SIZE;
      const requests = combinedRequests.slice(0, PAGE_SIZE);

      console.log("Processed pending requests:", requests);

      return {
        requests,
        lastDoc: combinedDocs[requests.length - 1],
        hasMore,
      };
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      throw error;
    }
  },

  async getAllRequests(
    startDate: Date,
    endDate: Date,
    lastDoc?: QueryDocumentSnapshot<DocumentData>
  ): Promise<{
    requests: CollectionRequest[];
    lastDoc: QueryDocumentSnapshot<DocumentData> | undefined;
    hasMore: boolean;
  }> {
    try {
      // Create base query
      let baseQuery = query(
        collection(db, "collection_requests"),
        where("requested_at", ">=", startDate),
        where("requested_at", "<=", endDate),
        orderBy("requested_at", "desc"),
        limit(10)
      );
      
      // If we have a lastDoc for pagination, start after it
      if (lastDoc) {
        baseQuery = query(baseQuery, startAfter(lastDoc));
      }
      
      const snapshot = await getDocs(baseQuery);
      const requests: CollectionRequest[] = [];
      let lastVisible = undefined;
      
      snapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() } as CollectionRequest);
        lastVisible = doc;
      });
      
      return {
        requests,
        lastDoc: lastVisible,
        hasMore: !snapshot.empty && snapshot.size === 10
      };
    } catch (error) {
      console.error("Error getting all requests:", error);
      throw error;
    }
  },
};
