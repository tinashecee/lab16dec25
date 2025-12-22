import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
  getDoc,
  where,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { Query, NewQuery, QuerySolution, QueryComment, QueryAttachment } from "../types/query";
import { fileStorageService } from "./fileStorageService";

class QueryService {
  private queriesCollection = collection(db, "queries");

  async getQueries(): Promise<Query[]> {
    try {
      console.log('getQueries called');
      const q = query(
        this.queriesCollection,
        orderBy("status", "asc"),
        orderBy("createdAt", "desc")
      );

      console.log('Executing Firestore query for queries');
      const snapshot = await getDocs(q);
      console.log(`Retrieved ${snapshot.docs.length} queries from Firestore`);

      const queries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Query[];

      return queries;
    } catch (error) {
      console.error("Error fetching queries:", error);
      throw error;
    }
  }

  async getQueriesByStatus(status: Query["status"]): Promise<Query[]> {
    try {
      const q = query(
        this.queriesCollection,
        where("status", "==", status),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Query[];
    } catch (error) {
      console.error("Error fetching queries by status:", error);
      throw error;
    }
  }

  async getQueriesByCategory(category: Query["category"]): Promise<Query[]> {
    try {
      const q = query(
        this.queriesCollection,
        where("category", "==", category),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Query[];
    } catch (error) {
      console.error("Error fetching queries by category:", error);
      throw error;
    }
  }

  async createQuery(queryData: NewQuery): Promise<string> {
    try {
      console.log('createQuery called with data:', JSON.stringify(queryData, null, 2));

      // First create the query without attachments
      const newQuery = {
        ...queryData,
        attachments: [], // Start with empty attachments
        comments: [], // Start with empty comments
        status: "Open" as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      console.log('New query object being created');
      const docRef = await addDoc(this.queriesCollection, newQuery);
      const queryId = docRef.id;
      console.log('Query created with ID:', queryId);

      // Now handle attachments with the real query ID
      const processedAttachments: QueryAttachment[] = [];
      if (queryData.attachments && queryData.attachments.length > 0) {
        console.log('Processing attachments for query:', queryId);
        
        for (const attachment of queryData.attachments) {
          const attachmentWithFile = attachment as QueryAttachment & { file?: File };
          
          if (attachmentWithFile.file) {
            console.log('Uploading file to storage:', attachmentWithFile.name);
            // Upload the file to Firebase Storage with the actual query ID
            const uploadedAttachment = await fileStorageService.uploadQueryAttachment(
              queryId,
              attachmentWithFile.file,
              attachment.uploadedBy,
              attachment.uploadedByName
            );
            processedAttachments.push(uploadedAttachment);
          } else if (attachment.url && attachment.url.length > 0 && !attachment.url.startsWith('blob:')) {
            // Already uploaded attachment with valid URL
            processedAttachments.push(attachment);
          }
        }
        
        // Update the query with the uploaded attachments
        if (processedAttachments.length > 0) {
          console.log('Updating query with', processedAttachments.length, 'uploaded attachments');
          const queryRef = doc(this.queriesCollection, queryId);
          await updateDoc(queryRef, {
            attachments: processedAttachments,
            updatedAt: serverTimestamp()
          });
        }
      }

      return queryId;
    } catch (error) {
      console.error("Error creating query:", error);
      throw error;
    }
  }

  async updateQuery(queryId: string, queryData: Partial<Query>): Promise<void> {
    try {
      console.log('QueryService updateQuery called with:', { queryId, queryData });
      const queryRef = doc(this.queriesCollection, queryId);
      const updates = {
        ...queryData,
        updatedAt: serverTimestamp()
      };

      // Get current query to log before/after state
      const queryDoc = await getDoc(queryRef);
      if (queryDoc.exists()) {
        const currentQuery = { id: queryDoc.id, ...queryDoc.data() } as Query;

        // Handle status change timestamps
        if (queryData.status && queryData.status !== currentQuery.status) {
          if (queryData.status === 'Resolved' && currentQuery.status !== 'Resolved') {
            // Query is being resolved
            updates.resolvedAt = serverTimestamp() as unknown as Timestamp;
            console.log('Query resolved - setting resolvedAt timestamp');
          }
        }
      }

      console.log('Final updates being applied:', updates);
      await updateDoc(queryRef, updates);
    } catch (error) {
      console.error("Error updating query:", error);
      throw error;
    }
  }

  async addSolution(
    queryId: string,
    solutionText: string,
    providedBy: string,
    providedByName: string
  ): Promise<void> {
    try {
      const solution: QuerySolution = {
        id: `sol_${Date.now()}`,
        text: solutionText,
        providedBy,
        providedByName,
        createdAt: Timestamp.now()
      };

      const queryRef = doc(this.queriesCollection, queryId);
      await updateDoc(queryRef, {
        solution,
        status: "Resolved",
        resolvedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('Solution added to query:', queryId);
    } catch (error) {
      console.error("Error adding solution:", error);
      throw error;
    }
  }

  async getQueryById(queryId: string): Promise<Query | null> {
    try {
      console.log(`getQueryById called for query: ${queryId}`);
      const queryRef = doc(this.queriesCollection, queryId);
      const queryDoc = await getDoc(queryRef);

      if (!queryDoc.exists()) {
        console.log(`Query with ID ${queryId} not found`);
        return null;
      }

      const queryData = {
        id: queryDoc.id,
        ...queryDoc.data()
      } as Query;

      console.log(`Query ${queryId} retrieved`);
      return queryData;
    } catch (error) {
      console.error("Error fetching query:", error);
      throw error;
    }
  }

  async getUserQueries(userId: string): Promise<Query[]> {
    try {
      const q = query(
        this.queriesCollection,
        where("submittedBy", "==", userId),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Query[];
    } catch (error) {
      console.error("Error fetching user queries:", error);
      throw error;
    }
  }

  async getAssignedQueries(userId: string): Promise<Query[]> {
    try {
      const q = query(
        this.queriesCollection,
        where("assignedTo", "==", userId),
        where("status", "!=", "Closed"),
        orderBy("status", "asc"),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Query[];
    } catch (error) {
      console.error("Error fetching assigned queries:", error);
      throw error;
    }
  }

  // Comment methods
  async addComment(queryId: string, commentData: {
    id: string;
    text: string;
    userId: string;
    userName: string;
    createdAt: Timestamp;
  }): Promise<void> {
    try {
      const queryRef = doc(this.queriesCollection, queryId);
      
      // Ensure all required fields are present and not undefined
      const validatedCommentData = {
        id: commentData.id,
        text: commentData.text || '',
        userId: commentData.userId || '',
        userName: commentData.userName || '',
        createdAt: commentData.createdAt || Timestamp.now(),
      };

      await updateDoc(queryRef, {
        comments: arrayUnion(validatedCommentData),
        updatedAt: serverTimestamp()
      });

      console.log('Comment added to query:', queryId);
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  async deleteComment(queryId: string, commentId: string): Promise<void> {
    try {
      const queryRef = doc(this.queriesCollection, queryId);
      const queryDoc = await getDoc(queryRef);
      const queryData = queryDoc.data();

      if (!queryData?.comments) return;

      const updatedComments = queryData.comments.filter(
        (comment: QueryComment) => comment.id !== commentId
      );

      await updateDoc(queryRef, {
        comments: updatedComments,
        updatedAt: serverTimestamp()
      });

      console.log('Comment deleted from query:', queryId);
    } catch (error) {
      console.error("Error deleting comment:", error);
      throw error;
    }
  }

  // Attachment methods
  async addAttachmentToQuery(queryId: string, file: File, uploadedBy: string, uploadedByName: string): Promise<QueryAttachment> {
    try {
      // Upload file to storage
      const attachment = await fileStorageService.uploadQueryAttachment(queryId, file, uploadedBy, uploadedByName);
      
      // Add attachment to query document
      const queryRef = doc(this.queriesCollection, queryId);
      await updateDoc(queryRef, {
        attachments: arrayUnion(attachment),
        updatedAt: serverTimestamp()
      });

      console.log('Attachment added to query:', queryId);
      return attachment;
    } catch (error) {
      console.error("Error adding attachment to query:", error);
      throw error;
    }
  }

  async removeAttachmentFromQuery(queryId: string, attachmentId: string): Promise<void> {
    try {
      // Get current query to find the attachment
      const queryRef = doc(this.queriesCollection, queryId);
      const queryDoc = await getDoc(queryRef);
      const queryData = queryDoc.data();

      if (!queryData?.attachments) return;

      // Find the attachment to remove
      const attachmentToRemove = queryData.attachments.find(
        (attachment: QueryAttachment) => attachment.id === attachmentId
      );

      if (!attachmentToRemove) return;

      // Remove file from storage
      await fileStorageService.deleteQueryAttachment(queryId, attachmentId);

      // Remove attachment from query document
      const updatedAttachments = queryData.attachments.filter(
        (attachment: QueryAttachment) => attachment.id !== attachmentId
      );

      await updateDoc(queryRef, {
        attachments: updatedAttachments,
        updatedAt: serverTimestamp()
      });

      console.log('Attachment removed from query:', queryId);
    } catch (error) {
      console.error("Error removing attachment from query:", error);
      throw error;
    }
  }
}

export const queryService = new QueryService();

