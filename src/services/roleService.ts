import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  departmentId: string;
  createdAt: string;
  updatedAt: string;
}

const rolesCollection = collection(db, 'roles');

export const roleService = {
  async getRoles(): Promise<Role[]> {
    const snapshot = await getDocs(rolesCollection);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Role));
  },

  async createRole(data: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = new Date().toISOString();
    const docRef = await addDoc(rolesCollection, {
      ...data,
      createdAt: now,
      updatedAt: now
    });
    return docRef.id;
  },

  async updateRole(id: string, data: Partial<Role>): Promise<void> {
    const docRef = doc(rolesCollection, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  },

  async deleteRole(id: string): Promise<void> {
    const docRef = doc(rolesCollection, id);
    await deleteDoc(docRef);
  },

  async getRolesByDepartment(departmentId: string): Promise<Role[]> {
    const q = query(
      rolesCollection, 
      where('departmentId', '==', departmentId),
      orderBy('name')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Role));
  }
}; 