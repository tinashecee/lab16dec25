import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getApiToken } from '../lib/settings';

interface CrelioTest {
  testID: number;
  testName: string;
  testAmount: string;
  isProfile: boolean;
}

interface CrelioApiResponse {
  testList: CrelioTest[];
  profileTestList: CrelioTest[];
  code: number;
  message?: string;
}

interface Test {
  id: string;
  testID: number;
  testName: string;
  testAmount: string;
  isProfile: boolean;
  source: 'crelio' | 'local';
  lastSynced?: string;
}

// Update to use the proxy path instead of full URL
const API_ENDPOINT = '/api/getAllTestsAndProfiles';

// Add a fallback token (you should replace this with your actual fallback token)
const FALLBACK_TOKEN = 'afb8b18a-7dc5-11ee-8ae9-f76d980f46c9';

export async function fetchTests(): Promise<Test[]> {
  try {
    console.log('Fetching tests from Crelio...');
    
    // Try to get token from settings, fall back to constant if not available
    let token: string;
    try {
      token = await getApiToken();
    } catch (error) {
      console.warn('Failed to get token from settings, using fallback token:', error);
      token = FALLBACK_TOKEN;
    }
    
    const url = `${API_ENDPOINT}/?token=${token}`;
    console.log('Request URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'omit' // Important for CORS
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`Failed to fetch tests from Crelio: ${response.status} ${response.statusText}`);
    }

    const data: CrelioApiResponse = await response.json();
    console.log('API Response:', data);

    if (!data || (!data.testList && !data.profileTestList)) {
      throw new Error('Invalid API response format');
    }

    // Combine both regular tests and profile tests
    const allTests = [
      ...(data.testList || []).map(test => ({ ...test, isProfile: false })),
      ...(data.profileTestList || []).map(test => ({ ...test, isProfile: true }))
    ];

    return allTests.map(test => ({
      id: test.testID.toString(),
      testID: test.testID,
      testName: test.testName,
      testAmount: test.testAmount,
      isProfile: test.isProfile,
      source: 'crelio' as const,
      lastSynced: new Date().toISOString()
    }));

  } catch (error) {
    console.error('Error fetching tests:', error);
    throw error;
  }
}

export async function syncTestsWithFirebase() {
  try {
    const tests = await fetchTests();
    
    if (!tests || tests.length === 0) {
      console.warn('No tests received from Crelio API');
      return [];
    }

    const testsRef = collection(db, 'tests');
    const snapshot = await getDocs(testsRef);
    const existingTests = new Map(
      snapshot.docs.map(doc => [doc.id, doc.data() as Test])
    );

    const updatePromises = tests.map(async test => {
      const existingTest = existingTests.get(test.id);
      
      // Only update if test doesn't exist or is from Crelio
      if (!existingTest || existingTest.source === 'crelio') {
        const cleanTest = Object.fromEntries(
          Object.entries(test).filter(([_, value]) => value !== undefined)
        );

        return setDoc(doc(testsRef, test.id), cleanTest);
      }
      return Promise.resolve();
    });

    await Promise.all(updatePromises);
    return tests;
  } catch (error) {
    console.error('Error syncing tests with Firebase:', error);
    throw error;
  }
} 