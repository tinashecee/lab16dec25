import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc,
  doc,
  query, 
  where, 
  orderBy,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { ApprovalRule } from '../types/approvalRules';

const COLLECTION_NAME = 'approvalRules';

export const approvalRulesService = {
  async addRule(rule: Omit<ApprovalRule, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<string> {
    try {
      const ruleData = {
        ...rule,
        status: 'active' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), ruleData);
      console.log('Rule added successfully:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error adding approval rule:', error);
      throw new Error('Failed to add approval rule');
    }
  },

  async getRules(): Promise<ApprovalRule[]> {
    try {
      const rulesRef = collection(db, COLLECTION_NAME);
      
      // First, try without the orderBy to see if collection exists
      const q = query(
        rulesRef,
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('No approval rules found');
        return [];
      }
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as ApprovalRule[];
    } catch (error) {
      if (error instanceof Error && error.message.includes('index')) {
        // If index error, try without ordering
        console.warn('Index not found, fetching without order');
        const simpleQuery = query(collection(db, COLLECTION_NAME));
        const snapshot = await getDocs(simpleQuery);
        
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        })) as ApprovalRule[];
      }
      
      console.error('Error fetching approval rules:', error);
      throw new Error('Failed to fetch approval rules');
    }
  },

  async updateRule(id: string, rule: Partial<ApprovalRule>): Promise<void> {
    try {
      const ruleRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(ruleRef, {
        ...rule,
        updatedAt: serverTimestamp()
      });
      console.log('Rule updated successfully:', id);
    } catch (error) {
      console.error('Error updating approval rule:', error);
      throw new Error('Failed to update approval rule');
    }
  }
}; 