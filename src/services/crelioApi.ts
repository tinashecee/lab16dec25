import {
  collection,
  getDocs,
  setDoc,
  doc,
  getDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../lib/firebase";

// Common Interfaces
interface CrelioBaseResponse {
  code: number;
  message?: string;
}

// Centers/Referrals Interfaces
interface CrelioDoctor {
  docId: number;
  docFullName: string;
  visitTimings: string; // JSON string of timing array
  orgId: number;
  docContact: string;
  docCity: string;
  docAddress: string;
  docEmail: string;
  docSpeciality: string;
  docdateOfBirth: string;
  labForId: number;
  designation: string;
  docRegNo: string;
  countryCode: string;
}

interface CrelioReferralResponse extends CrelioBaseResponse {
  referralList: CrelioDoctor[];
}

// Organizations Interfaces
interface CrelioOrgResponse extends CrelioBaseResponse {
  orgList: CrelioOrganization[];
}

interface CrelioOrganization {
  orgId: number;
  orgFullName: string;
  currentDue: number;
  orgPaymentType: number;
  orgCode: string | null;
  paymentMode: string;
  orgCity: string;
  orgType: string;
  orgContact: string;
  orgAddress: string;
  orgEmail: string;
  labForId: number;
}

// Tests Interfaces
interface CrelioTest {
  testID: number;
  testName: string;
  testAmount: string;
  isProfile: boolean;
}

interface CrelioTestResponse extends CrelioBaseResponse {
  testList: CrelioTest[];
  profileTestList: CrelioTest[];
}

// Add these interfaces back
interface CrelioCenter {
  docId: number;
  docFullName: string;
  visitTimings: Array<{
    to: string;
    from: string;
    day: string;
  }>;
  orgId: number;
  docContact: string;
  docCity: string;
  docAddress: string;
  docEmail: string;
  docSpeciality: string;
  docdateOfBirth: string;
  labForId: number;
  designation: string;
  docRegNo: string;
  countryCode: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  source: "crelio" | "local";
  lastSynced?: string;
}

// Add this interface back
interface Organization {
  id: string;
  orgCode: string | null;
  name: string;
  type: string;
  contact: string;
  address: string;
  email: string;
  paymentMode: string;
  creditLimit: number;
  currentDue: number;
  city: string;
  area: string;
  countryCode: string;
  source: "crelio" | "local";
  lastSynced?: string;
}

// Add these interfaces
interface BillPatientRequest {
  patientInfo: {
    dateOfBirth: any;
    dob: any;
    name: string;
    age: string;
    gender: string;
    contact: string;
    email?: string;
    address?: string;
  };
  testDetails: Array<{
    testId: string;
    testName: string;
    icdCode: string;
    price: number;
    concession: number;
  }>;
  paymentInfo: {
    totalAmount: number;
    concessionAmount: number;
    payableAmount: number;
    payments: Array<{
      type: string;
      amount: number;
    }>;
  };
  organizationId?: string;
  referralId?: string;
  comments?: string;
}

// Base URLs - Use production URL directly
const BASE_URL = "https://livehealth.solutions";

// API_ENDPOINTS
const API_ENDPOINTS = {
  CENTERS: `${BASE_URL}/androidReferralListForCC/`,
  ORGANIZATIONS: `${BASE_URL}/androidOrganizationListForCC/`,
  TESTS: `${BASE_URL}/getAllTestsAndProfiles/`,
  PATIENT: `${BASE_URL}/LHRegisterBillAPI/`, // Updated to use correct endpoint path
} as const;

// Helper function to get token from settings
async function getApiToken(): Promise<string> {
  try {
    const settingsDoc = await getDoc(doc(db, "settings", "integrations"));
    if (!settingsDoc.exists()) {
      throw new Error("Integration settings not found");
    }

    const data = settingsDoc.data();
    if (!data?.crelioToken) {
      throw new Error("Crelio token not found in settings");
    }

    return data.crelioToken;
  } catch (error) {
    console.error("Error getting API token:", error);
    throw new Error("Failed to get API token from settings");
  }
}

// Add this helper function for common fetch options
const createFetchOptions = (
  method: "GET" | "POST",
  body?: FormData
): RequestInit => ({
  method,
  body,
  headers: {
    Accept: "application/json",
  },
  mode: "cors",
  credentials: "omit",
});

// API Functions
export async function fetchCrelioCenters(): Promise<CrelioDoctor[]> {
  try {
    const token = await getApiToken();
    if (!token) {
      throw new Error(
        "API token not configured. Please set up your Crelio token in Integration Settings."
      );
    }

    // Format the request exactly as specified
    const formData = new FormData();
    formData.append(
      "tokenObj",
      JSON.stringify({
        token: token,
        lastUpdatedTime: "2020-02-12T12:00:00Z", // Use the specified format
      })
    );

    console.log("Sending request to:", API_ENDPOINTS.CENTERS);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", API_ENDPOINTS.CENTERS, true);

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          console.log("Response Headers:", xhr.getAllResponseHeaders());
          console.log("Response Status:", xhr.status);
          console.log("Response Text:", xhr.responseText);

          if (xhr.status === 200) {
            try {
              const response = JSON.parse(
                xhr.responseText
              ) as CrelioReferralResponse;
              console.log("Parsed Response:", response);

              if (response.code === 200 || response.referralList) {
                resolve(response.referralList);
              } else {
                reject(
                  new Error(response.message || `API Error: ${response.code}`)
                );
              }
            } catch (error) {
              console.error("Parse error:", error);
              reject(new Error("Failed to parse API response"));
            }
          } else {
            reject(new Error(`HTTP error! status: ${xhr.status}`));
          }
        }
      };

      xhr.onerror = function () {
        console.error("XHR Error:", xhr.statusText);
        reject(new Error("Network request failed"));
      };

      // Log the exact data being sent
      console.log("Sending FormData:", {
        tokenObj: JSON.parse(formData.get("tokenObj") as string),
      });

      xhr.send(formData);
    });
  } catch (error) {
    console.error("Error details:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch centers: ${error.message}`);
    }
    throw new Error("Failed to fetch centers: Unknown error");
  }
}

export async function fetchCrelioOrganizations(): Promise<
  CrelioOrganization[]
> {
  try {
    const token = await getApiToken();
    if (!token) {
      throw new Error(
        "API token not configured. Please set up your Crelio token in Integration Settings."
      );
    }

    // Format the request exactly as specified
    const formData = new FormData();
    formData.append(
      "tokenObj",
      JSON.stringify({
        token: token,
        lastUpdatedTime: "2020-02-12T12:00:00Z", // Use the specified format
      })
    );

    console.log("Sending request to:", API_ENDPOINTS.ORGANIZATIONS);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", API_ENDPOINTS.ORGANIZATIONS, true);

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          console.log("Response Headers:", xhr.getAllResponseHeaders());
          console.log("Response Status:", xhr.status);
          console.log("Response Text:", xhr.responseText);

          if (xhr.status === 200) {
            try {
              const response = JSON.parse(
                xhr.responseText
              ) as CrelioOrgResponse;
              console.log("Parsed Response:", response);

              if (response.code === 200 || response.orgList) {
                resolve(response.orgList);
              } else {
                reject(
                  new Error(response.message || `API Error: ${response.code}`)
                );
              }
            } catch (error) {
              console.error("Parse error:", error);
              reject(new Error("Failed to parse API response"));
            }
          } else {
            reject(new Error(`HTTP error! status: ${xhr.status}`));
          }
        }
      };

      xhr.onerror = function () {
        console.error("XHR Error:", xhr.statusText);
        reject(new Error("Network request failed"));
      };

      // Log the exact data being sent
      console.log("Sending FormData:", {
        tokenObj: JSON.parse(formData.get("tokenObj") as string),
      });

      xhr.send(formData);
    });
  } catch (error) {
    console.error("Error details:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch organizations: ${error.message}`);
    }
    throw new Error("Failed to fetch organizations: Unknown error");
  }
}

export async function fetchCrelioTests(): Promise<CrelioTest[]> {
  try {
    const token = await getApiToken();
    if (!token) {
      throw new Error("API token not configured");
    }

    console.log("Sending request to:", API_ENDPOINTS.TESTS);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", `${API_ENDPOINTS.TESTS}?token=${token}`, true);

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          console.log("Response Headers:", xhr.getAllResponseHeaders());
          console.log("Response Status:", xhr.status);
          console.log("Response Text:", xhr.responseText);

          if (xhr.status === 200) {
            try {
              const response = JSON.parse(
                xhr.responseText
              ) as CrelioTestResponse;
              console.log("Parsed Response:", response);

              if (response.code === 200) {
                // Combine both test lists with a flag to identify profiles
                const allTests = [
                  ...response.testList,
                  ...response.profileTestList,
                ];
                resolve(allTests);
              } else {
                reject(
                  new Error(response.message || `API Error: ${response.code}`)
                );
              }
            } catch (error) {
              console.error("Parse error:", error);
              reject(new Error("Failed to parse API response"));
            }
          } else {
            reject(new Error(`HTTP error! status: ${xhr.status}`));
          }
        }
      };

      xhr.onerror = function () {
        console.error("XHR Error:", xhr.statusText);
        reject(new Error("Network request failed"));
      };

      // Set Accept header
      xhr.setRequestHeader("Accept", "application/json");

      // Send without FormData since it's a GET request
      xhr.send();
    });
  } catch (error) {
    console.error("Error details:", error);
    throw new Error(
      `Failed to fetch tests: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Sync functions for Firestore
export const syncCentersWithFirebase = async (
  onProgress: (progress: number) => void
): Promise<{ total: number; updated: number; new: number }> => {
  try {
    const centers = await fetchCrelioCenters();
    const total = centers.length;
    let processed = 0;
    let updated = 0;
    let newRecords = 0;

    // Fetch all existing centers once
    const centersSnapshot = await getDocs(collection(db, "centers"));
    const existingCentersMap = new Map();
    centersSnapshot.forEach(docSnap => {
      existingCentersMap.set(docSnap.id, docSnap.data());
    });

    // Firestore batch limit
    const BATCH_SIZE = 500;
    let batch = writeBatch(db);
    let batchCount = 0;

    for (let i = 0; i < centers.length; i++) {
      const center = centers[i];
      // Parse visitTimings from string to array
      let visitTimings = [];
      try {
        visitTimings = JSON.parse(center.visitTimings.replace(/\\/g, ""));
      } catch (error) {
        console.error("Error parsing visitTimings:", error);
      }

      const centerDoc: CrelioCenter = {
        docId: center.docId,
        docFullName: center.docFullName,
        visitTimings,
        orgId: center.orgId,
        docContact: center.docContact,
        docCity: center.docCity,
        docAddress: center.docAddress,
        docEmail: center.docEmail,
        docSpeciality: center.docSpeciality,
        docdateOfBirth: center.docdateOfBirth,
        labForId: center.labForId,
        designation: center.designation,
        docRegNo: center.docRegNo,
        countryCode: center.countryCode,
        source: "crelio",
        lastSynced: new Date().toISOString(),
      };

      const centerId = center.docId.toString();
      const centerRef = doc(collection(db, "centers"), centerId);
      const existingData = existingCentersMap.get(centerId);

      if (existingData) {
        // Preserve existing coordinates if they exist
        if (existingData.coordinates) {
          centerDoc.coordinates = existingData.coordinates;
        }
        batch.update(centerRef, centerDoc);
        updated++;
      } else {
        batch.set(centerRef, centerDoc);
        newRecords++;
      }

      batchCount++;
      processed++;

      // Commit batch if limit reached or last item
      if (batchCount === BATCH_SIZE || i === centers.length - 1) {
        await batch.commit();
        batch = writeBatch(db);
        batchCount = 0;
        onProgress((processed / total) * 100);
      }
    }

    return { total, updated, new: newRecords };
  } catch (error) {
    console.error("Centers sync failed:", error);
    throw error;
  }
};

// Add organization sync functions
export const syncOrganizationsWithFirebase = async (
  onProgress: (progress: number) => void
): Promise<{ total: number; updated: number; new: number }> => {
  try {
    const organizations = await fetchCrelioOrganizations();
    let processed = 0;
    let updated = 0;
    let newRecords = 0;
    const total = organizations.length;

    // Fetch all existing organizations once and build a map
    const orgsSnapshot = await getDocs(collection(db, "organizations"));
    const existingOrgsMap = new Map();
    orgsSnapshot.forEach(docSnap => {
      existingOrgsMap.set(docSnap.id, docSnap.data());
    });

    // Firestore batch limit
    const BATCH_SIZE = 500;
    let batch = writeBatch(db);
    let batchCount = 0;

    for (let i = 0; i < organizations.length; i++) {
      const org = organizations[i];
      const orgDoc: Organization = {
        id: org.orgId.toString(),
        orgCode: org.orgCode,
        name: org.orgFullName,
        type: org.orgType,
        contact: org.orgContact,
        address: org.orgAddress,
        email: org.orgEmail,
        paymentMode: org.paymentMode,
        creditLimit: 0, // Set default or get from org if available
        currentDue: org.currentDue,
        city: org.orgCity,
        area: "", // Set if available in API response
        countryCode: "", // Set if available in API response
        source: "crelio",
        lastSynced: new Date().toISOString(),
      };

      const orgId = orgDoc.id;
      const orgRef = doc(collection(db, "organizations"), orgId);
      const existingData = existingOrgsMap.get(orgId);

      if (existingData) {
        batch.update(orgRef, orgDoc);
        updated++;
      } else {
        batch.set(orgRef, orgDoc);
        newRecords++;
      }

      batchCount++;
      processed++;

      // Commit batch if limit reached or last item
      if (batchCount === BATCH_SIZE || i === organizations.length - 1) {
        await batch.commit();
        batch = writeBatch(db);
        batchCount = 0;
        onProgress((processed / total) * 100);
      }
    }

    return {
      total,
      updated,
      new: newRecords,
    };
  } catch (error) {
    console.error("Organization sync failed:", error);
    throw error;
  }
};

export async function saveCenter(centerData: Omit<CrelioCenter, "source">) {
  try {
    const centersRef = collection(db, "centers");
    const cleanData = Object.fromEntries(
      Object.entries(centerData).filter(([_, value]) => value !== undefined)
    );

    await setDoc(doc(centersRef, centerData.docId.toString()), {
      ...cleanData,
      source: "local",
      lastSynced: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error saving center:", error);
    throw error;
  }
}

export async function getCenter(
  centerId: string
): Promise<CrelioCenter | null> {
  try {
    const centerRef = doc(collection(db, "centers"), centerId);
    const centerDoc = await getDoc(centerRef);

    if (!centerDoc.exists()) {
      return null;
    }

    return centerDoc.data() as CrelioCenter;
  } catch (error) {
    console.error("Error fetching center:", error);
    throw error;
  }
}

export async function updateCenterCoordinates(
  centerId: string,
  coordinates: { lat: number; lng: number }
) {
  try {
    const centerRef = doc(collection(db, "centers"), centerId);
    await updateDoc(centerRef, { coordinates });
  } catch (error) {
    console.error("Error updating center coordinates:", error);
    throw error;
  }
}

export async function saveOrganization(orgData: Omit<Organization, "source">) {
  try {
    const orgsRef = collection(db, "organizations");
    const cleanData = Object.fromEntries(
      Object.entries(orgData).filter(([_, value]) => value !== undefined)
    );

    await setDoc(doc(orgsRef, orgData.id), {
      ...cleanData,
      source: "local",
      lastSynced: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error saving organization:", error);
    throw error;
  }
}

export async function getOrganization(
  orgId: string
): Promise<Organization | null> {
  try {
    const orgRef = doc(collection(db, "organizations"), orgId);
    const orgDoc = await getDoc(orgRef);

    if (!orgDoc.exists()) {
      return null;
    }

    return orgDoc.data() as Organization;
  } catch (error) {
    console.error("Error fetching organization:", error);
    throw error;
  }
}

export async function syncTestsWithFirebase(
  onProgress?: (progress: number) => void
): Promise<{ total: number; updated: number; new: number }> {
  try {
    // Fetch tests from Crelio API
    const crelioTests = await fetchCrelioTests();

    // Get existing tests from Firestore
    const existingTests = new Map();
    const testsSnapshot = await getDocs(collection(db, "tests"));
    testsSnapshot.forEach((doc) => {
      existingTests.set(doc.data().testID, doc.id);
    });

    let updated = 0;
    let newTests = 0;
    let processed = 0;

    // Process each test
    for (const test of crelioTests) {
      processed++;
      if (onProgress) {
        onProgress((processed / crelioTests.length) * 100);
      }

      const testData = {
        ...test,
        lastSynced: new Date().toISOString(),
        source: "crelio" as const,
      };

      // Use testID as document ID
      const docId = test.testID.toString();
      const testRef = doc(db, "tests", docId);

      if (existingTests.has(test.testID)) {
        // Update existing test
        await updateDoc(testRef, testData);
        updated++;
      } else {
        // Add new test
        await setDoc(testRef, testData);
        newTests++;
      }
    }

    return {
      total: crelioTests.length,
      updated,
      new: newTests,
    };
  } catch (error) {
    console.error("Error syncing tests:", error);
    throw error;
  }
}

export async function registerAndBillPatient(data: any): Promise<any> {
  try {
    const token = await getApiToken(); // Replace with your method to retrieve the token
    if (!token) {
      throw new Error("API token not found");
    }

    const payload = {
      "fullName": data.patientInfo.name,
      "age": data.patientInfo.age,
      "gender": data.patientInfo.gender,
      "mobile": data.patientInfo.contact,
      "email": data.patientInfo.email || "",
      "address": data.patientInfo.address || "",
      "dob": formatDateOfBirth(data.patientInfo.dateOfBirth),
      "billDetails": {
        "organizationIdLH": parseInt(data.organizationId),
        "referralIdLH": parseInt(data.referralId),
        "totalAmount": data.paymentInfo.totalAmount,
        "advance": 0,
        "paymentList": data.paymentInfo.payments.map((payment: { type: any; amount: any }) => ({
          "paymentType": payment.type,
          "paymentAmount": payment.amount,
        })),
        "comments": data.comments || "",
        "testList": data.testDetails.map(
          (test: { testId: any; testName: any; icdCode: any; price: any; concession: any }) => ({
            "testID": test.testId,
            "testName": test.testName,
            "icdCode": test.icdCode,
            "amount": test.price,
            "concession": test.concession,
          })
        ),
      },
    };
    

    const response = await fetch("http://localhost:3001/api/register-and-bill", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, payload }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error in registerAndBillPatient:", error);
    throw error;
  }
}

function formatDateOfBirth(dateObj: {
  day: string;
  month: string;
  year: string;
}): string {
  const monthMap: { [key: string]: string } = {
    January: "01",
    February: "02",
    March: "03",
    April: "04",
    May: "05",
    June: "06",
    July: "07",
    August: "08",
    September: "09",
    October: "10",
    November: "11",
    December: "12",
  };

  const month = monthMap[dateObj.month]; // Convert month name to number
  if (!month) {
    throw new Error(`Invalid month: ${dateObj.month}`);
  }

  return `${dateObj.year}-${month}-${dateObj.day}`;
}
