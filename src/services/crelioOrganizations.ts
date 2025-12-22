import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface CrelioOrganization {
  orgId: number;
  orgFullName: string;
  currentDue: number;
  orgPaymentType: number;
  orgCode: string | null;
  paymentMode: string;
  orgCity: string;
  remark: string;
  notes: string;
  stopPrepaidCreditBilling: number;
  creditLimit: number;
  orgType: string;
  orgContact: string;
  orgAddress: string;
  orgEmail: string;
  labForId: number;
  isCollectionCenter: number;
  countryCode: string;
  alternateContact: string;
  pinCode: string;
  orgArea: string;
  restrictPaymentMode: boolean;
  patient_contact_mandatory: boolean;
}

interface CrelioApiResponse {
  orgList: CrelioOrganization[];
  code: number;
}

interface Organization {
  id: string;
  orgCode: string | null;
  name: string;
  orgType: string;
  orgContact: string;
  address: string;
  email: string;
  paymentMode: string;
  creditLimit: number;
  currentDue: number;
  city: string;
  area: string;
  countryCode: string;
  source: 'crelio' | 'local';
  lastSynced?: string;
}

const CRELIO_API_URL = 'https://livehealth.solutions/androidOrganizationListForCC/';
const CRELIO_TOKEN = 'afb8b18a-7dc5-11ee-8ae9-f76d980f46c9';

export async function fetchOrganizations(): Promise<Organization[]> {
  const formData = new FormData();
  formData.append('tokenObj', JSON.stringify({
    token: CRELIO_TOKEN,
    lastUpdatedTime: ''
  }));

  try {
    console.log('Fetching organizations from Crelio...');
    const response = await fetch(CRELIO_API_URL, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch organizations from Crelio: ${response.status} ${response.statusText}`);
    }

    const rawResponse = await response.text();
    console.log('Raw API Response:', rawResponse);

    const data: CrelioApiResponse = JSON.parse(rawResponse);
    console.log('Parsed API Response:', data);

    if (!data || !data.orgList) {
      throw new Error('Invalid API response format');
    }

    return data.orgList.map(org => ({
      id: org.orgId.toString(),
      orgCode: org.orgCode,
      name: org.orgFullName,
      orgType: org.orgType !== '-' ? org.orgType : '',
      orgContact: org.orgContact !== '-' && org.orgContact !== '""' ? org.orgContact.replace(/"/g, '') : '',
      address: org.orgAddress !== '-' ? org.orgAddress : '',
      email: org.orgEmail !== '-' ? org.orgEmail : '',
      paymentMode: org.paymentMode,
      creditLimit: org.creditLimit,
      currentDue: org.currentDue,
      city: org.orgCity !== '-' ? org.orgCity : '',
      area: org.orgArea !== '-' ? org.orgArea : '',
      countryCode: org.countryCode,
      source: 'crelio' as const,
      lastSynced: new Date().toISOString()
    }));

  } catch (error) {
    console.error('Error fetching organizations:', error);
    throw error;
  }
}

export async function syncOrganizationsWithFirebase() {
  try {
    const organizations = await fetchOrganizations();
    
    if (!organizations || organizations.length === 0) {
      console.warn('No organizations received from Crelio API');
      return [];
    }

    const orgsRef = collection(db, 'organizations');
    const snapshot = await getDocs(orgsRef);
    const existingOrgs = new Map(
      snapshot.docs.map(doc => [doc.id, doc.data() as Organization])
    );

    const updatePromises = organizations.map(async org => {
      const existingOrg = existingOrgs.get(org.id);
      
      if (!existingOrg || existingOrg.source === 'crelio') {
        const cleanOrg = Object.fromEntries(
          Object.entries(org).filter(([_, value]) => value !== undefined)
        );

        return setDoc(doc(orgsRef, org.id), cleanOrg);
      }
      return Promise.resolve();
    });

    await Promise.all(updatePromises);
    return organizations;
  } catch (error) {
    console.error('Error syncing organizations with Firebase:', error);
    throw error;
  }
} 