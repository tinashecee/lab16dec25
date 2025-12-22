import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "Active" | "Idle" | "Offline";
  location: string;
  lastUpdate: string;
  lastUpdateDate: string;
  lastUpdateTime: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  role: string;
  messageToken: string;
}

export interface DriverStats {
  samplesCollected: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  resultsDelivered: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
}

const DRIVERS_COLLECTION = "users";
const DRIVER_ROLE = "Driver"; // Note: using 'Driver' as it's used in DriversManagement.tsx

const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  try {
    if (typeof dateValue.toDate === "function") return dateValue.toDate();
    if (typeof dateValue === "string" || typeof dateValue === "number") {
      const d = new Date(dateValue);
      if (!isNaN(d.getTime())) return d;
    }
    if (dateValue instanceof Date && !isNaN(dateValue.getTime())) return dateValue;
  } catch {}
  return null;
};

// Helper: Reverse geocode coordinates to address
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "YOUR_GOOGLE_MAPS_API_KEY";
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.status === "OK" && data.results.length > 0) {
      return data.results[0].formatted_address;
    }
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (error) {
    console.error("Reverse geocoding failed:", error);
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

const transformDriverData = (doc: any): Driver & { last_updated?: any } => {
  const data = doc.data();
  console.log('Driver document data:', data); // DEBUG: log the Firestore user document
  // Construct name from various possible fields
  let name = "Unknown Driver";
  if (data.displayName) {
    name = data.displayName;
  } else if (data.firstName && data.lastName) {
    name = `${data.firstName} ${data.lastName}`;
  } else if (data.name) {
    name = data.name;
  }

  // Use last_updated Firestore Timestamp for all last update fields if present
  let lastUpdate = "Unknown";
  let lastUpdateDate = "Unknown";
  let lastUpdateTime = "Unknown";
  if (data.last_updated && typeof data.last_updated.toDate === 'function') {
    const lastUpdatedDateObj = data.last_updated.toDate();
    lastUpdate = lastUpdatedDateObj.toLocaleString();
    lastUpdateDate = lastUpdatedDateObj.toISOString().split('T')[0];
    lastUpdateTime = lastUpdatedDateObj.toTimeString().split(' ')[0];
  } else if (data.last_updated_date && data.last_updated_time) {
    // fallback for legacy data
    lastUpdate = `${data.last_updated_date} ${data.last_updated_time}`;
    lastUpdateDate = data.last_updated_date;
    lastUpdateTime = data.last_updated_time;
  }

  // Use address if available, otherwise fallback to coordinates
  let location = "No address available";
  if (data.address) {
    location = data.address;
  } else if (data.location) {
    location = data.location;
  } else if (data.position && data.position.lat && data.position.lng) {
    location = `${data.position.lat.toFixed(4)}, ${data.position.lng.toFixed(4)}`;
  }

  return {
    id: doc.id,
    name,
    email: data.email || "",
    phone: data.phoneNumber || data.phone || "",
    status: data.status || "Offline",
    location,
    lastUpdate,
    lastUpdateDate,
    lastUpdateTime,
    coordinates: {
      lat: data.position?.lat || -17.8292,
      lng: data.position?.lng || 31.0522,
    },
    role: data.role,
    messageToken: data.messageToken || "",
    last_updated: data.last_updated, // include raw Firestore Timestamp for filtering
  };
};

export const subscribeToDrivers = (
  onUpdate: (drivers: Driver[]) => void,
  onError?: (error: Error) => void
) => {
  const driversQuery = query(
    collection(db, DRIVERS_COLLECTION),
    where("role", "==", DRIVER_ROLE)
  );

  return onSnapshot(
    driversQuery,
    async (snapshot) => {
      // Get today's date in YYYY-MM-DD format
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      let driversData = snapshot.docs
        .map(transformDriverData)
        .filter(driver => {
          // Parse last_updated as Date
          const raw = driver as any;
          let lastUpdated: Date | null = null;
          if (raw.last_updated) {
            if (typeof raw.last_updated.toDate === 'function') {
              lastUpdated = raw.last_updated.toDate();
            } else if (typeof raw.last_updated === 'number' || typeof raw.last_updated === 'string') {
              lastUpdated = new Date(raw.last_updated);
            } else if (raw.last_updated instanceof Date) {
              lastUpdated = raw.last_updated;
            }
          } else if (raw.lastUpdate) {
            lastUpdated = new Date(raw.lastUpdate);
          }
          // DEBUG LOG
          console.log('Driver:', raw.name, 'last_updated:', raw.last_updated, 'parsed:', lastUpdated);

          if (!lastUpdated || isNaN(lastUpdated.getTime())) return false;
          // Check if lastUpdated is today
          return lastUpdated >= today && lastUpdated < tomorrow;
        });
      // For drivers with no address, resolve it asynchronously
      driversData = await Promise.all(
        driversData.map(async (driver) => {
          if (
            (driver.location === "No address available" || /\d+\.\d+, \d+\.\d+/.test(driver.location)) &&
            driver.coordinates.lat &&
            driver.coordinates.lng
          ) {
            const address = await reverseGeocode(driver.coordinates.lat, driver.coordinates.lng);
            return { ...driver, location: address };
          }
          return driver;
        })
      );
      onUpdate(driversData);
    },
    (error) => {
      console.error("Error fetching drivers:", error);
      onError?.(error);
    }
  );
};

export const fetchDrivers = async (): Promise<Driver[]> => {
  try {
    const driversQuery = query(
      collection(db, DRIVERS_COLLECTION),
      where("role", "==", DRIVER_ROLE)
    );

    const snapshot = await getDocs(driversQuery);
    return snapshot.docs.map(transformDriverData);
  } catch (error) {
    console.error("Error fetching drivers:", error);
    throw error;
  }
};

// Generate random statistics for a driver (for demonstration purposes)
export const getDriverStats = async (driverId: string): Promise<DriverStats> => {
  try {
    console.log("Fetching stats for driver ID:", driverId);
    
    // Set up time periods
    const now = new Date();
    
    // Today (midnight to now)
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const todayStart = Timestamp.fromDate(startOfToday);
    
    // This week (last 7 days)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const weekStart = Timestamp.fromDate(startOfWeek);
    
    // This month (last 30 days)
    const startOfMonth = new Date(now);
    startOfMonth.setDate(now.getDate() - 30);
    
    // Helper function to safely convert various date formats to Date objects
    const safeToDate = (dateField: any): Date | null => {
      if (!dateField) return null;
      
      try {
        // If it's a Firestore Timestamp with toDate() method
        if (typeof dateField.toDate === 'function') {
          return dateField.toDate();
        }
        
        // If it's a string, try to parse it
        if (typeof dateField === 'string') {
          return new Date(dateField);
        }
        
        // If it's a number (Unix timestamp), convert it
        if (typeof dateField === 'number') {
          return new Date(dateField);
        }
        
        // If it's already a Date object
        if (dateField instanceof Date) {
          return dateField;
        }
      } catch (error) {
        console.log("Date conversion error:", error);
      }
      
      return null;
    };
    
    const collectionRequestsRef = collection(db, "collectionRequests");
    
    // Query all collection requests
    const q = query(collectionRequestsRef);
    const snapshot = await getDocs(q);
    
    console.log(`Found ${snapshot.docs.length} total collection requests in database`);
    
    // Initialize counters
    const stats: DriverStats = {
      samplesCollected: {
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
      },
      resultsDelivered: {
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
      }
    };
    
    // Print first 3 documents for structure analysis
    if (snapshot.docs.length > 0) {
      console.log("Sample document structure:", JSON.stringify(snapshot.docs[0].data(), null, 2));
    }
    
    // Process each document
    let collectionsFound = 0;
    let deliveriesFound = 0;
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // Check various ways the driver ID might be stored
      const assignedDriverId = data.assigned_driver?.id || 
                              (typeof data.assigned_driver === 'string' ? data.assigned_driver : null);
      
      const collectedById = data.collected_by?.id || 
                          (typeof data.collected_by === 'string' ? data.collected_by : null);
      
      const deliveredById = data.delivered_by?.id || 
                          (typeof data.delivered_by === 'string' ? data.delivered_by : null);
      
      // Debug driver IDs
      if (assignedDriverId === driverId || 
          collectedById === driverId || 
          deliveredById === driverId) {
        console.log("Found matching document:", doc.id);
      }
      
      // Safely convert dates
      const timestamp = 
        safeToDate(data.collected_at) || 
        safeToDate(data.updated_at) || 
        safeToDate(data.created_at);
      
      if (!timestamp) {
        console.log(`Document ${doc.id} has no usable timestamp`);
        return;
      }
      
      // More flexible matching: check if any field could contain the driver ID
      const isCollectedByThisDriver = 
        (assignedDriverId === driverId && 
          (data.status === 'collected' || data.status === 'completed')) ||
        collectedById === driverId ||
        (data.collector_name && data.collector_name.includes(driverId)) ||
        (data.collected_by_name && data.collected_by_name.includes(driverId));
      
      const isDeliveredByThisDriver = 
        (assignedDriverId === driverId && 
          (data.status === 'delivered' || data.status === 'completed')) ||
        deliveredById === driverId ||
        (data.delivery_name && data.delivery_name.includes(driverId)) ||
        (data.delivered_by_name && data.delivered_by_name.includes(driverId));
      
      // Count samples collected
      if (isCollectedByThisDriver) {
        collectionsFound++;
        stats.samplesCollected.thisMonth++;
        
        if (timestamp >= weekStart.toDate()) {
          stats.samplesCollected.thisWeek++;
          
          if (timestamp >= todayStart.toDate()) {
            stats.samplesCollected.today++;
          }
        }
      }
      
      // Count results delivered
      if (isDeliveredByThisDriver) {
        deliveriesFound++;
        stats.resultsDelivered.thisMonth++;
        
        if (timestamp >= weekStart.toDate()) {
          stats.resultsDelivered.thisWeek++;
          
          if (timestamp >= todayStart.toDate()) {
            stats.resultsDelivered.today++;
          }
        }
      }
    });
    
    console.log(`Found ${collectionsFound} collections and ${deliveriesFound} deliveries for driver ${driverId}`);
    console.log("Final stats:", stats);
    
    return stats;
  } catch (error) {
    console.error('Error fetching driver stats:', error);
    // Return empty stats on error
    return {
      samplesCollected: { today: 0, thisWeek: 0, thisMonth: 0 },
      resultsDelivered: { today: 0, thisWeek: 0, thisMonth: 0 }
    };
  }
};
