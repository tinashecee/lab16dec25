import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  serverTimestamp,
  query,
  orderBy,
  getDoc,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Department {
  id?: string;
  departmentId: string;
  name: string;
  head: string;
  roles: string[];
  createdAt?: any;
  updatedAt?: any;
}

const departmentsCollection = collection(db, 'departments');

export const departmentService = {
  async getAllDepartments(): Promise<Department[]> {
    try {
      const q = query(departmentsCollection, orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Department));
    } catch (error) {
      console.error('Error fetching departments:', error);
      throw new Error('Failed to fetch departments. Please try again later.');
    }
  },

  async getDepartmentById(id: string): Promise<Department | null> {
    try {
      const docRef = doc(departmentsCollection, id);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) {
        return null;
      }
      return {
        id: snapshot.id,
        ...snapshot.data()
      } as Department;
    } catch (error) {
      console.error('Error fetching department:', error);
      throw new Error('Failed to fetch department. Please try again later.');
    }
  },

  async getDepartmentByName(name: string): Promise<Department | null> {
    try {
      const q = query(departmentsCollection, where('name', '==', name));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return null;
      }
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as Department;
    } catch (error) {
      console.error('Error fetching department by name:', error);
      throw new Error('Failed to fetch department. Please try again later.');
    }
  },

  async addDepartment(data: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const departmentId = `DEP${Math.floor(Math.random() * 900) + 100}`; // Generate a random department ID
      const docRef = await addDoc(departmentsCollection, {
        ...data,
        departmentId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding department:', error);
      throw new Error('Failed to add department. Please try again later.');
    }
  },

  async updateDepartment(id: string, data: Partial<Department>): Promise<void> {
    try {
      const docRef = doc(departmentsCollection, id);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) {
        throw new Error('Department not found');
      }
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating department:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update department. Please try again later.');
    }
  },

  async getRolesByDepartment(departmentId: string): Promise<string[]> {
    try {
      const department = await this.getDepartmentById(departmentId);
      if (!department) {
        throw new Error('Department not found');
      }
      return department.roles || [];
    } catch (error) {
      console.error('Error fetching roles:', error);
      throw new Error('Failed to fetch roles. Please try again later.');
    }
  },

  async addRoleToDepartment(departmentId: string, role: string): Promise<void> {
    try {
      const department = await this.getDepartmentById(departmentId);
      if (!department) {
        throw new Error('Department not found');
      }
      if (!department.roles.includes(role)) {
        await this.updateDepartment(departmentId, {
          roles: [...department.roles, role]
        });
      }
    } catch (error) {
      console.error('Error adding role to department:', error);
      throw new Error('Failed to add role to department. Please try again later.');
    }
  },

  async removeRoleFromDepartment(departmentId: string, role: string): Promise<void> {
    try {
      const department = await this.getDepartmentById(departmentId);
      if (!department) {
        throw new Error('Department not found');
      }
      await this.updateDepartment(departmentId, {
        roles: department.roles.filter(r => r !== role)
      });
    } catch (error) {
      console.error('Error removing role from department:', error);
      throw new Error('Failed to remove role from department. Please try again later.');
    }
  }
};