import { db } from "../config/firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  query,
  orderBy,
  where,
  limit,
  startAfter,
  DocumentSnapshot,
  getDoc,
} from "firebase/firestore";
import { activityLogService, formatActivityDetails } from './activityLogService';

export interface User {
  id?: string;
  name: string;
  email: string;
  phoneNumber: string;
  department: string;
  role: string;
  dateJoined: string;
  status: "Active" | "Inactive";
  avatar?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface UsersQueryResult {
  users: User[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

class UserService {
  private usersCollection = collection(db, "users");
  private readonly pageSize = 10;

  async getUsers(
    lastDoc?: DocumentSnapshot | null,
    filters: {
      status?: "Active" | "Inactive";
      department?: string;
      role?: string;
      searchTerm?: string;
      limit?: number;
    } = {}
  ): Promise<UsersQueryResult> {
    try {
      // Start with base query
      const queryConstraints: any[] = [orderBy("createdAt", "desc")];

      // Add filters if they exist
      if (filters.status) {
        queryConstraints.push(where("status", "==", filters.status));
      }
      if (filters.department && filters.department !== "All") {
        queryConstraints.push(where("department", "==", filters.department));
      }
      if (filters.role && filters.role !== "All") {
        queryConstraints.push(where("role", "==", filters.role));
      }

      // Add pagination only if lastDoc exists and is valid
      if (lastDoc && lastDoc.exists()) {
        queryConstraints.push(startAfter(lastDoc));
      }
      
      // Use custom limit if provided, otherwise use default pageSize
      const pageLimit = filters.limit || this.pageSize;
      queryConstraints.push(limit(pageLimit));

      // Create the query
      const q = query(this.usersCollection, ...queryConstraints);

      // Get the documents
      const snapshot = await getDocs(q);
      const users = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];

      // Apply search term filter in memory (if exists)
      let filteredUsers = users;
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        filteredUsers = users.filter(
          (user) =>
            user.name?.toLowerCase().includes(searchLower) ||
            user.email?.toLowerCase().includes(searchLower) ||
            user.department?.toLowerCase().includes(searchLower) ||
            user.role?.toLowerCase().includes(searchLower)
        );
      }

      // Get the last document for pagination
      const lastVisible = snapshot.docs[snapshot.docs.length - 1];

      // Check if there are more results
      const hasMore = snapshot.docs.length === pageLimit;

      return {
        users: filteredUsers,
        lastDoc: lastVisible || null,
        hasMore,
      };
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(this.usersCollection, userId));
      if (!userDoc.exists()) {
        return null;
      }
      return {
        id: userDoc.id,
        ...userDoc.data(),
        dateJoined: userDoc.data().dateJoined,
        createdAt: userDoc.data().createdAt,
        updatedAt: userDoc.data().updatedAt,
      } as User;
    } catch (error) {
      console.error("Error getting user:", error);
      throw new Error("Failed to fetch user. Please try again later.");
    }
  }

  async addUser(
    userData: Omit<User, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    try {
      const docRef = await addDoc(this.usersCollection, {
        ...userData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Error adding user:", error);
      throw new Error("Failed to add user. Please try again later.");
    }
  }

  async updateUser(userId: string, userData: Partial<User>): Promise<void> {
    try {
      const userRef = doc(this.usersCollection, userId);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        throw new Error("User not found");
      }
      await updateDoc(userRef, {
        ...userData,
        updatedAt: Timestamp.now(),
      });
      // Log PROFILE_UPDATE activity
      const updatedUser = { ...userDoc.data(), ...userData };
      await activityLogService.logActivity({
        userId: userId || '',
        userName: updatedUser.name || '',
        action: 'PROFILE_UPDATE',
        details: formatActivityDetails('PROFILE_UPDATE', userData),
        metadata: userData,
      });
    } catch (error) {
      console.error("Error updating user:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to update user. Please try again later.");
    }
  }

  async initializeUsers(
    users: Omit<User, "id" | "createdAt" | "updatedAt">[]
  ): Promise<void> {
    try {
      await Promise.all(users.map((user) => this.addUser(user)));
    } catch (error) {
      console.error("Error initializing users:", error);
      throw new Error("Failed to initialize users. Please try again later.");
    }
  }

  async createUser(userData: Omit<User, "id">): Promise<void> {
    try {
      if (!userData.name || !userData.email || !userData.department || !userData.role) {
        throw new Error("Missing required fields");
      }
      const data = {
        ...userData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        status: userData.status || "Active",
      };
      const docRef = await addDoc(this.usersCollection, data);
      // Log ACCOUNT_CREATED activity
      await activityLogService.logActivity({
        userId: docRef.id || '',
        userName: userData.name || '',
        action: 'ACCOUNT_CREATED',
        details: formatActivityDetails('ACCOUNT_CREATED'),
        metadata: userData,
      });
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async getUsersByDepartment(department: string): Promise<User[]> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('department', '==', department));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
    } catch (error) {
      console.error('Error fetching users by department:', error);
      throw error;
    }
  }

  async searchUsers(searchTerm: string): Promise<User[]> {
    try {
      const usersRef = collection(db, 'users');
      // Note: This is a simple implementation. For production, you might want to use
      // a more sophisticated search solution like Algolia or Elasticsearch
      const q = query(usersRef, 
        where('name', '>=', searchTerm),
        where('name', '<=', searchTerm + '\uf8ff'),
        limit(10)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }
}

export const userService = new UserService();
