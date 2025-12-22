import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  doc,
} from "firebase/firestore";
import { db } from "../config/firebase";

export interface SampleTest {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  completedAt?: string;
}

export interface SampleCollection {
  id: string;
  sample_id: string;
  status:
    | "pending"
    | "collected"
    | "registered"
    | "received"
    | "completed"
    | "delivered"
    | "cancelled";
  tests: SampleTest[];
  priority: "routine" | "urgent" | "emergency";
  center_name: string;
  center_address: string;
  center_coordinates: {
    lat: number;
    lng: number;
  };
  caller_name: string;
  caller_number: string;
  notes: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  requested_at: string;
  assigned_driver: {
    id: string;
    name: string;
    messageToken?: string;
  } | null;
  center_id: string | null;
  time_requested: string;
  time_collected: string;
  time_registered?: string;
  time_lapsed: string;
  patient_name: string;
  center: string;
  priority_level: string;
  barcode?: string;
  delivered_at?: string;
  received_by?: string;
  delivery_location?: string;
  signature?: string; // Base64 string of signature image
  patientName?: string;
  labPatientId?: string; // Add this as an alternative field
  testID?: string | string[]; // Test IDs - can be single or multiple
  testName?: string | string[]; // Test names - can be single or multiple
  reason_for_cancellation?: string; // Reason for sample cancellation
}

const collectionRequestsRef = collection(db, "collectionRequests");
const PAGE_SIZE = 100;

export const sampleCollectionService = {
  async getSampleCollectionsPaginated(
    status: SampleCollection["status"] | "all",
    startAfterDoc?: QueryDocumentSnapshot<DocumentData>
  ) {
    try {
      let q;

      // Base query for 'all' status
      if (status === "all") {
        q = query(
          collectionRequestsRef,
          orderBy("created_at", "desc"),
          limit(PAGE_SIZE)
        );
      } else if (status === "completed") {
        // Completed samples are identified by completed_at != null, not by status field
        // We need to query by completed_at and filter out delivered/cancelled client-side
        q = query(
          collectionRequestsRef,
          where("completed_at", "!=", null),
          orderBy("completed_at", "desc"),
          limit(PAGE_SIZE)
        );
      } else {
        // Query with status filter for other statuses
        q = query(
          collectionRequestsRef,
          where("status", "==", status),
          orderBy("created_at", "desc"),
          limit(PAGE_SIZE)
        );
      }

      // Add pagination if startAfterDoc is provided
      if (startAfterDoc) {
        q = query(q, startAfter(startAfterDoc));
      }

      const snapshot = await getDocs(q);
      let collections = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SampleCollection[];

      // For completed status, filter out delivered and cancelled samples
      if (status === "completed") {
        collections = collections
          .filter(doc => {
            const docData = doc as any;
            return docData.status !== "delivered" && docData.status !== "cancelled";
          })
          .map(doc => ({
            ...doc,
            status: "completed" as const, // Ensure status is set to completed for display purposes
            patientName: (doc as any).patientName || (doc as any).labPatientId || "Not provided",
          }));
      }

      return {
        collections,
        lastDoc: snapshot.docs[snapshot.docs.length - 1],
        hasMore: snapshot.docs.length === PAGE_SIZE,
      };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("requires an index")
      ) {
        console.error(
          "Index required. Please create the following index in Firebase Console:"
        );
        console.error("Collection: collectionRequests");
        console.error(
          "Fields to index: status Ascending, created_at Descending"
        );

        // Fallback to client-side filtering temporarily
        const allDocsQuery = query(
          collectionRequestsRef,
          orderBy("created_at", "desc"),
          limit(PAGE_SIZE * 2) // Fetch more to account for filtering
        );

        const snapshot = await getDocs(allDocsQuery);
        let collections = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as SampleCollection[];

        // Filter by status if needed
        if (status !== "all") {
          collections = collections.filter((col) => col.status === status);
        }

        // Handle pagination
        collections = collections.slice(0, PAGE_SIZE);

        return {
          collections,
          lastDoc: snapshot.docs[collections.length - 1],
          hasMore: collections.length === PAGE_SIZE,
        };
      }

      console.error("Error fetching collections:", error);
      throw error;
    }
  },

  async createRequest(formData: {
    center: string;
    center_coordinates: [number, number];
    callerNumber: string;
    priority: "routine" | "urgent" | "emergency";
    callerName?: string;
    notes?: string;
    requestedAt?: string;
    assignedDriver?: {
      id: string;
      name: string;
      messageToken?: string;
    };
    sampleType?: string;
    selectedCenter?: { id: string };
    center_address?: string;
  }) {
    try {
      // Validate required fields
      const requiredFields = {
        center: formData.center,
        center_coordinates: formData.center_coordinates,
        callerNumber: formData.callerNumber,
        priority: formData.priority,
      };

      const missingFields = Object.entries(requiredFields)
        .filter(([, value]) => !value)
        .map(([key]) => key);

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
      }

      // Create the sample request document
      const nowIso = (formData.requestedAt || new Date().toISOString());
      const isWalkIn = formData.center === 'SELF';
      const sampleRequest: Record<string, unknown> = {
        status: isWalkIn ? "collected" : "pending",
        priority: formData.priority,
        center_name: formData.center,
        center_coordinates: {
          lat: formData.center_coordinates[0],
          lng: formData.center_coordinates[1],
        },
        caller_name: formData.callerName || "",
        patient_name: formData.callerName || "",
        caller_number: formData.callerNumber,
        notes: formData.notes || "",
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        requested_at: nowIso,
        sample_type: formData.sampleType || "general",
        center_id: formData.selectedCenter?.id || null,
      };
      if (formData.center_address) {
        sampleRequest.center_address = formData.center_address;
      }
      if (isWalkIn) {
        sampleRequest.accepted_collection_at = nowIso;
        sampleRequest.collected_at = nowIso;
        // For walk-in patients, assign driver for result delivery notifications
        if (formData.assignedDriver) {
          sampleRequest.assigned_driver = formData.assignedDriver;
        }
      } else if (formData.assignedDriver) {
        sampleRequest.assigned_driver = formData.assignedDriver;
      }

      // Add the document to collectionRequests instead of sample-collections
      const docRef = await addDoc(collectionRequestsRef, sampleRequest);

      // Update the document with its ID
      await updateDoc(docRef, { sample_id: docRef.id });
       console.log(docRef.id,formData.assignedDriver?.messageToken, formData.assignedDriver?.name);
      // Send collection notification only for non-walk-in samples
      // Walk-in samples will get delivery notifications when results are ready
      if (!isWalkIn && formData.assignedDriver?.messageToken) {
        try {
          const message = {
            title: `Sample Collection | ${formData.priority}`,
            body: `Location: ${formData.center}`,
            sample_id: docRef.id,
            requestedAt: formData.requestedAt,
            caller_name: `${formData.callerName} ${formData.center}`,
            caller_number: formData.callerNumber,
            lat: String(formData.center_coordinates[0]),
            lng: String(formData.center_coordinates[1]),
            message: formData.notes,
            notification_type: "collection",
          };

          const response = await fetch(
            "https://app.labpartners.co.zw/send-notification",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                token: formData.assignedDriver.messageToken,
                message: message,
              }),
            }
          );

          if (!response.ok) {
            console.warn(
              "Failed to send notification, but request was created"
            );
          } else {
            const result = await response.json();
            console.log("Notification sent:", result);
          }
        } catch (notificationError) {
          // Log the notification error but don't fail the request
          console.warn("Failed to send notification:", notificationError);
        }
      } else if (isWalkIn && formData.assignedDriver) {
        console.log(`Walk-in patient registered with driver ${formData.assignedDriver.name} assigned for result delivery notifications`);
      }

      return docRef.id;
    } catch (error) {
      console.error("Error creating sample request:", error);
      throw new Error("Failed to create sample request");
    }
  },

  async updateSampleCollection(id: string, updates: Partial<SampleCollection>) {
    try {
      const docRef = doc(db, "collectionRequests", id);
      await updateDoc(docRef, {
        ...updates,
        updated_at: serverTimestamp(),
      });

      console.log("Sample updated successfully:", id);
    } catch (error) {
      console.error("Error updating sample:", error);
      throw error;
    }
  },

  async getSampleCollectionById(id: string): Promise<SampleCollection | null> {
    try {
      const docRef = doc(db, "collectionRequests", id);
      const snapshot = await getDoc(docRef);
      
      if (snapshot.exists()) {
        return {
          id: snapshot.id,
          ...snapshot.data(),
        } as SampleCollection;
      }
      
      return null;
    } catch (error) {
      console.error("Error fetching sample collection:", error);
      throw error;
    }
  },
};

// Function to fetch individual completed samples
export const fetchIndividualCompletedSamples = async (): Promise<
  SampleCollection[]
> => {
  const snapshot = await getDocs(
    collection(db, "individual_completed_samples")
  );
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as SampleCollection[];
};

// Function to fetch consolidated completed samples
export const fetchConsolidatedCompletedSamples = async (): Promise<
  SampleCollection[]
> => {
  const snapshot = await getDocs(
    collection(db, "consolidated_completed_samples")
  );
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as SampleCollection[];
};

console.log("sampleCollectionService loaded", sampleCollectionService);
