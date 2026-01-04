import {
  collection,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import moment from "moment";

export interface ManualSection {
  id: string;
  title: string;
  description: string;
  order: number;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
  };
  lastUpdatedBy: {
    id: string;
    name: string;
  };
}

export interface ManualContent {
  id: string;
  sectionId: string;
  title: string;
  content: string;
  attachments?: {
    name: string;
    url: string;
    type: string;
  }[];
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
  };
  lastUpdatedBy: {
    id: string;
    name: string;
  };
}

export interface BusinessDocument {
  id: string;
  title: string;
  description: string;
  category: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: {
    id: string;
    name: string;
  };
}

const manualSectionsCollection = collection(db, "manualSections");
const manualContentsCollection = collection(db, "manualContents");
const COLLECTION_NAME = 'businessDocuments';

export const businessManualService = {
  async getAllUserEmails(): Promise<string[]> {
    const usersRef = collection(db, "users");
    const snap = await getDocs(usersRef);
    return snap.docs
      .map((d) => (d.data() as { email?: string }).email)
      .filter((e): e is string => !!e);
  },
  // Section Operations
  async getSections(): Promise<ManualSection[]> {
    try {
      const q = query(manualSectionsCollection, orderBy("order", "asc"));
      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate().toISOString(),
        updatedAt: doc.data().updatedAt.toDate().toISOString(),
      })) as ManualSection[];
    } catch (error) {
      console.error("Error fetching manual sections:", error);
      throw error;
    }
  },

  async getSection(sectionId: string): Promise<ManualSection> {
    try {
      const docRef = doc(manualSectionsCollection, sectionId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error("Section not found");
      }

      return {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt.toDate().toISOString(),
        updatedAt: docSnap.data().updatedAt.toDate().toISOString(),
      } as ManualSection;
    } catch (error) {
      console.error("Error fetching section:", error);
      throw error;
    }
  },

  async createSection(
    data: Omit<ManualSection, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    try {
      const docRef = await addDoc(manualSectionsCollection, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Error creating section:", error);
      throw error;
    }
  },

  async updateSection(
    sectionId: string,
    data: Partial<ManualSection>
  ): Promise<void> {
    try {
      const docRef = doc(manualSectionsCollection, sectionId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating section:", error);
      throw error;
    }
  },

  async deleteSection(sectionId: string): Promise<void> {
    try {
      const docRef = doc(manualSectionsCollection, sectionId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Error deleting section:", error);
      throw error;
    }
  },

  // Content Operations
  async getSectionContents(sectionId: string): Promise<ManualContent[]> {
    try {
      const q = query(
        manualContentsCollection,
        where("sectionId", "==", sectionId),
        orderBy("version", "desc")
      );
      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate().toISOString(),
        updatedAt: doc.data().updatedAt.toDate().toISOString(),
      })) as ManualContent[];
    } catch (error) {
      console.error("Error fetching section contents:", error);
      throw error;
    }
  },

  async getContent(contentId: string): Promise<ManualContent> {
    try {
      const docRef = doc(manualContentsCollection, contentId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error("Content not found");
      }

      return {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt.toDate().toISOString(),
        updatedAt: docSnap.data().updatedAt.toDate().toISOString(),
      } as ManualContent;
    } catch (error) {
      console.error("Error fetching content:", error);
      throw error;
    }
  },

  async createContent(
    data: Omit<ManualContent, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    try {
      const docRef = await addDoc(manualContentsCollection, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Error creating content:", error);
      throw error;
    }
  },

  async updateContent(
    contentId: string,
    data: Partial<ManualContent>
  ): Promise<void> {
    try {
      const docRef = doc(manualContentsCollection, contentId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating content:", error);
      throw error;
    }
  },

  async deleteContent(contentId: string): Promise<void> {
    try {
      const docRef = doc(manualContentsCollection, contentId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Error deleting content:", error);
      throw error;
    }
  },

  async uploadAttachment(
    file: File,
    sectionId: string
  ): Promise<{
    name: string;
    url: string;
    type: string;
  }> {
    try {
      const storage = getStorage();
      const fileRef = ref(
        storage,
        `manual/${sectionId}/${Date.now()}_${file.name}`
      );

      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      return {
        name: file.name,
        url,
        type: file.type,
      };
    } catch (error) {
      console.error("Error uploading attachment:", error);
      throw error;
    }
  },

  // Get documents for a specific category
  async getDocuments(category: string) {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("category", "==", category),
      orderBy("createdAt", "desc")
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as BusinessDocument[];
  },

  // Upload a new document
  async uploadDocument(file: File, documentData: Omit<BusinessDocument, 'id' | 'fileUrl' | 'createdAt' | 'updatedAt'>) {
    // Upload file to Firebase Storage
    const storage = getStorage();
    const fileRef = ref(storage, `business-manuals/${Date.now()}-${file.name}`);
    await uploadBytes(fileRef, file);
    const fileUrl = await getDownloadURL(fileRef);

    // Add document to Firestore
    const docData = {
      ...documentData,
      fileUrl,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), docData);
    try {
      const emails = await this.getAllUserEmails();
      const today = moment().format("YYYY-MM-DD");
      await Promise.all(
        emails.map((email) =>
          fetch("https://app.labpartners.co.zw/send-business-manual-added-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              a: documentData?.createdBy?.name || "System", // userName
              b: today, // dateAdded
              c: today, // effectiveDate (fallback)
              d: documentData?.fileName || "v1", // version
              e: documentData?.category || "General", // department/category
              f: documentData?.description || "", // notes
              g: today, // lastUpdated
              h: fileUrl, // file_url
              i: email, // email
            }),
          }).catch(() => undefined)
        )
      );
    } catch (e) {
      console.error("Failed to send business manual added emails", e);
    }
    return docRef.id;
  },

  // Update a document
  async updateDocument(documentId: string, data: Partial<BusinessDocument>) {
    const docRef = doc(db, COLLECTION_NAME, documentId);
    const existing = await getDoc(docRef);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    try {
      const emails = await this.getAllUserEmails();
      const today = moment().format("YYYY-MM-DD");
      const current = existing.data() as BusinessDocument | undefined;
      const fileUrl = (data as any)?.fileUrl || current?.fileUrl || "";
      await Promise.all(
        emails.map((email) =>
          fetch("https://app.labpartners.co.zw/send-business-manual-updated-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              a: (current as any)?.createdBy?.name || "System", // userName
              b: today, // dateAdded
              c: today, // effectiveDate
              d: data?.fileName || current?.fileName || "v1", // version
              e: current?.category || "General", // department/category
              f: data?.description || current?.description || "", // notes
              g: today, // lastUpdated
              h: fileUrl, // file_url
              i: email, // email
            }),
          }).catch(() => undefined)
        )
      );
    } catch (e) {
      console.error("Failed to send business manual updated emails", e);
    }
  },

  // Delete a document
  async deleteDocument(documentId: string) {
    await deleteDoc(doc(db, COLLECTION_NAME, documentId));
  }
};
