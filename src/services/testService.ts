import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CrelioTest } from './crelioApi';

export interface Test extends CrelioTest {
  id: string;
  lastSynced?: string;
  source: 'crelio' | 'local';
}

export async function getStoredTests(): Promise<Test[]> {
  try {
    const testsRef = collection(db, 'tests');
    const q = query(
      testsRef,
      orderBy('testName', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Test[];
  } catch (error) {
    console.error('Error fetching tests:', error);
    throw new Error('Failed to fetch tests');
  }
}

export async function searchTests(searchTerm: string): Promise<Test[]> {
  try {
    const testsRef = collection(db, 'tests');
    const q = query(
      testsRef,
      where('testName', '>=', searchTerm),
      where('testName', '<=', searchTerm + '\uf8ff'),
      orderBy('testName'),
      // Limit the results
      // limit(10)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Test[];
  } catch (error) {
    console.error('Error searching tests:', error);
    throw new Error('Failed to search tests');
  }
}

export async function getTestById(testId: string): Promise<Test | null> {
  try {
    const testsRef = collection(db, 'tests');
    const q = query(testsRef, where('testID', '==', parseInt(testId)));
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    } as Test;
  } catch (error) {
    console.error('Error fetching test:', error);
    throw new Error('Failed to fetch test');
  }
}

export function formatTestForSelect(test: Test) {
  return {
    value: test.testID.toString(),
    label: test.testName,
    price: test.testAmount,
    isProfile: test.isProfile
  };
}

export async function loadTestOptions(inputValue: string) {
  try {
    const tests = await searchTests(inputValue);
    return tests.map(formatTestForSelect);
  } catch (error) {
    console.error('Error loading test options:', error);
    return [];
  }
} 