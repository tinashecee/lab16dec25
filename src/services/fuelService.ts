import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  Vehicle,
  FuelRequest,
  FuelRequestStatus,
  FuelEconomyAudit,
  FuelAlert,
  AlertType,
  FuelManagementSettings,
} from '../types/fuel';

const VEHICLES_COLLECTION = 'vehicles';
const FUEL_REQUESTS_COLLECTION = 'fuelRequests';
const FUEL_ECONOMY_AUDIT_COLLECTION = 'fuelEconomyAudit';
const FUEL_ALERTS_COLLECTION = 'fuelAlerts';
const FUEL_SETTINGS_COLLECTION = 'fuelSettings';

// Default variance threshold (15%)
const DEFAULT_VARIANCE_THRESHOLD = 15;

/**
 * Get or create default fuel management settings
 */
async function getSettings(): Promise<FuelManagementSettings> {
  const settingsRef = collection(db, FUEL_SETTINGS_COLLECTION);
  const q = query(settingsRef, limit(1));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as FuelManagementSettings;
  }

  // Create default settings
  const defaultSettings = {
    variance_threshold_percentage: DEFAULT_VARIANCE_THRESHOLD,
    updated_at: serverTimestamp(),
    updated_by: 'system',
  };

  const docRef = await addDoc(settingsRef, defaultSettings);
  return {
    id: docRef.id,
    ...defaultSettings,
    updated_at: Timestamp.now(),
  } as FuelManagementSettings;
}

/**
 * Get the last approved fuel request for a vehicle
 */
async function getLastApprovedFuelRequest(
  vehicleId: string
): Promise<FuelRequest | null> {
  const fuelRequestsRef = collection(db, FUEL_REQUESTS_COLLECTION);
  const q = query(
    fuelRequestsRef,
    where('vehicle_id', '==', vehicleId),
    where('status', '==', 'APPROVED'),
    orderBy('request_date', 'desc'),
    limit(1)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as FuelRequest;
}

/**
 * Get vehicle by ID
 */
async function getVehicle(vehicleId: string): Promise<Vehicle | null> {
  const vehicleRef = doc(db, VEHICLES_COLLECTION, vehicleId);
  const vehicleSnap = await getDoc(vehicleRef);

  if (!vehicleSnap.exists()) {
    return null;
  }

  return {
    id: vehicleSnap.id,
    ...vehicleSnap.data(),
  } as Vehicle;
}

/**
 * Create an alert for flagged fuel requests
 */
async function createAlert(
  fuelRequestId: string,
  alertType: AlertType,
  message: string
): Promise<void> {
  const alertsRef = collection(db, FUEL_ALERTS_COLLECTION);
  await addDoc(alertsRef, {
    fuel_request_id: fuelRequestId,
    alert_type: alertType,
    message,
    acknowledged: false,
    created_at: serverTimestamp(),
  });
}

/**
 * Submit a fuel request with validation and calculations
 */
export async function submitFuelRequest(
  driverId: string,
  driverName: string,
  vehicleId: string,
  currentMileage: number,
  requestedFuel: number
): Promise<FuelRequest> {
  // Get data before transaction (queries can't be done inside transactions)
  const vehicle = await getVehicle(vehicleId);
  if (!vehicle) {
    throw new Error('Vehicle not found');
  }

  const lastRequest = await getLastApprovedFuelRequest(vehicleId);
  const settings = await getSettings();

  // Validate mileage
  if (lastRequest) {
    if (currentMileage <= lastRequest.odometer_reading) {
      throw new Error(
        `Mileage must be greater than last recorded value (${lastRequest.odometer_reading} km)`
      );
    }
  }

  // Calculate distance travelled
  let distanceTravelled: number | undefined;
  let lastOdometerReading: number | undefined;

  if (lastRequest) {
    lastOdometerReading = lastRequest.odometer_reading;
    distanceTravelled = currentMileage - lastRequest.odometer_reading;
  }

  // Get fuel economy and calculate expected fuel
  const fuelEconomy = vehicle.fuel_economy_km_per_litre;
  let expectedFuel: number | undefined;
  let variancePercentage: number | undefined;
  let status: FuelRequestStatus = 'PENDING';

  if (distanceTravelled !== undefined && fuelEconomy && fuelEconomy > 0) {
    expectedFuel = distanceTravelled / fuelEconomy;

    // Calculate variance
    variancePercentage =
      ((requestedFuel - expectedFuel) / expectedFuel) * 100;

    // Check variance threshold
    const threshold = settings.variance_threshold_percentage;

    if (Math.abs(variancePercentage) > threshold) {
      status = 'FLAGGED';
    }
  }

  // Create fuel request and alert atomically
  return runTransaction(db, async (transaction) => {
    // Create fuel request - build data object conditionally to avoid undefined values
    const fuelRequestData: any = {
      vehicle_id: vehicleId,
      vehicle_registration: vehicle.registration_number,
      driver_id: driverId,
      driver_name: driverName,
      request_date: serverTimestamp(),
      odometer_reading: currentMileage,
      fuel_requested_litres: requestedFuel,
      status,
      created_at: serverTimestamp(),
    };

    // Only add optional fields if they're defined
    if (lastOdometerReading !== undefined) {
      fuelRequestData.last_odometer_reading = lastOdometerReading;
    }
    if (distanceTravelled !== undefined) {
      fuelRequestData.distance_travelled = distanceTravelled;
    }
    if (expectedFuel !== undefined) {
      fuelRequestData.expected_fuel_litres = expectedFuel;
    }
    if (variancePercentage !== undefined) {
      fuelRequestData.variance_percentage = variancePercentage;
    }

    const fuelRequestsRef = collection(db, FUEL_REQUESTS_COLLECTION);
    const docRef = doc(fuelRequestsRef);
    transaction.set(docRef, fuelRequestData);

    // Create alert if flagged
    if (status === 'FLAGGED') {
      const alertMessage = `Fuel request exceeds variance threshold. Expected: ${expectedFuel?.toFixed(2)}L, Requested: ${requestedFuel}L (${variancePercentage?.toFixed(1)}% variance)`;
      const alertsRef = collection(db, FUEL_ALERTS_COLLECTION);
      const alertRef = doc(alertsRef);
      transaction.set(alertRef, {
        fuel_request_id: docRef.id,
        alert_type: 'OVER_REQUEST' as AlertType,
        message: alertMessage,
        acknowledged: false,
        created_at: serverTimestamp(),
      });
    }

    return {
      id: docRef.id,
      ...fuelRequestData,
      request_date: Timestamp.now(),
      created_at: Timestamp.now(),
    } as FuelRequest;
  });
}

/**
 * Get all fuel requests with optional filters
 */
export async function getFuelRequests(
  filters?: {
    vehicleId?: string;
    driverId?: string;
    status?: FuelRequestStatus;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<FuelRequest[]> {
  const fuelRequestsRef = collection(db, FUEL_REQUESTS_COLLECTION);
  let q = query(fuelRequestsRef, orderBy('request_date', 'desc'));

  if (filters?.vehicleId) {
    q = query(q, where('vehicle_id', '==', filters.vehicleId));
  }

  if (filters?.driverId) {
    q = query(q, where('driver_id', '==', filters.driverId));
  }

  if (filters?.status) {
    q = query(q, where('status', '==', filters.status));
  }

  if (filters?.startDate) {
    q = query(
      q,
      where('request_date', '>=', Timestamp.fromDate(filters.startDate))
    );
  }

  if (filters?.endDate) {
    q = query(
      q,
      where('request_date', '<=', Timestamp.fromDate(filters.endDate))
    );
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as FuelRequest[];
}

/**
 * Approve a fuel request
 */
export async function approveFuelRequest(
  requestId: string,
  approverId: string,
  approverName: string,
  notes?: string
): Promise<void> {
  const requestRef = doc(db, FUEL_REQUESTS_COLLECTION, requestId);
  await updateDoc(requestRef, {
    status: 'APPROVED',
    approved_by: approverId,
    approved_by_name: approverName,
    approved_at: serverTimestamp(),
    admin_notes: notes ?? '',
    updated_at: serverTimestamp(),
  });

  // Mark related alerts as acknowledged
  const alertsRef = collection(db, FUEL_ALERTS_COLLECTION);
  const q = query(
    alertsRef,
    where('fuel_request_id', '==', requestId),
    where('acknowledged', '==', false)
  );
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach((alertDoc) => {
    batch.update(alertDoc.ref, {
      acknowledged: true,
      acknowledged_by: approverId,
      acknowledged_at: serverTimestamp(),
    });
  });
  await batch.commit();
}

/**
 * Reject a fuel request
 */
export async function rejectFuelRequest(
  requestId: string,
  rejectorId: string,
  rejectorName: string,
  reason: string
): Promise<void> {
  const requestRef = doc(db, FUEL_REQUESTS_COLLECTION, requestId);
  await updateDoc(requestRef, {
    status: 'REJECTED',
    rejected_by: rejectorId,
    rejected_by_name: rejectorName,
    rejected_at: serverTimestamp(),
    rejection_reason: reason,
    updated_at: serverTimestamp(),
  });

  // Mark related alerts as acknowledged
  const alertsRef = collection(db, FUEL_ALERTS_COLLECTION);
  const q = query(
    alertsRef,
    where('fuel_request_id', '==', requestId),
    where('acknowledged', '==', false)
  );
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach((alertDoc) => {
    batch.update(alertDoc.ref, {
      acknowledged: true,
      acknowledged_by: rejectorId,
      acknowledged_at: serverTimestamp(),
    });
  });
  await batch.commit();
}

/**
 * Get all vehicles
 */
export async function getVehicles(): Promise<Vehicle[]> {
  const vehiclesRef = collection(db, VEHICLES_COLLECTION);
  const q = query(vehiclesRef, orderBy('registration_number', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Vehicle[];
}

/**
 * Add a new vehicle
 */
export async function addVehicle(
  registrationNumber: string,
  fuelEconomy?: number,
  userId?: string,
  userName?: string
): Promise<string> {
  const vehiclesRef = collection(db, VEHICLES_COLLECTION);
  
  // Check if vehicle already exists
  const q = query(vehiclesRef, where('registration_number', '==', registrationNumber));
  const existingVehicles = await getDocs(q);
  
  if (!existingVehicles.empty) {
    throw new Error(`Vehicle with registration number ${registrationNumber} already exists`);
  }

  const vehicleData = {
    registration_number: registrationNumber,
    fuel_economy_km_per_litre: fuelEconomy,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  const docRef = await addDoc(vehiclesRef, vehicleData);

  // If fuel economy is provided, create audit record
  if (fuelEconomy && userId && userName) {
    const auditRef = collection(db, FUEL_ECONOMY_AUDIT_COLLECTION);
    await addDoc(auditRef, {
      vehicle_id: docRef.id,
      vehicle_registration: registrationNumber,
      old_value: undefined,
      new_value: fuelEconomy,
      changed_by: userId,
      changed_by_name: userName,
      changed_at: serverTimestamp(),
    });
  }

  return docRef.id;
}

/**
 * Create or update vehicle fuel economy
 */
export async function updateVehicleFuelEconomy(
  vehicleId: string,
  fuelEconomy: number,
  userId: string,
  userName: string
): Promise<void> {
  if (fuelEconomy <= 0) {
    throw new Error('Fuel economy must be a positive number');
  }

  return runTransaction(db, async (transaction) => {
    const vehicleRef = doc(db, VEHICLES_COLLECTION, vehicleId);
    const vehicleSnap = await transaction.get(vehicleRef);

    if (!vehicleSnap.exists()) {
      throw new Error('Vehicle not found');
    }

    const vehicle = vehicleSnap.data() as Vehicle;
    const oldValue = vehicle.fuel_economy_km_per_litre;

    // Update vehicle
    transaction.update(vehicleRef, {
      fuel_economy_km_per_litre: fuelEconomy,
      updated_at: serverTimestamp(),
    });

    // Create audit record
    const auditRef = doc(collection(db, FUEL_ECONOMY_AUDIT_COLLECTION));
    transaction.set(auditRef, {
      vehicle_id: vehicleId,
      vehicle_registration: vehicle.registration_number,
      old_value: oldValue,
      new_value: fuelEconomy,
      changed_by: userId,
      changed_by_name: userName,
      changed_at: serverTimestamp(),
    });
  });
}

/**
 * Get fuel economy audit history for a vehicle
 */
export async function getFuelEconomyAuditHistory(
  vehicleId: string
): Promise<FuelEconomyAudit[]> {
  const auditRef = collection(db, FUEL_ECONOMY_AUDIT_COLLECTION);
  const q = query(
    auditRef,
    where('vehicle_id', '==', vehicleId),
    orderBy('changed_at', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as FuelEconomyAudit[];
}

/**
 * Get unacknowledged alerts
 */
export async function getUnacknowledgedAlerts(): Promise<FuelAlert[]> {
  const alertsRef = collection(db, FUEL_ALERTS_COLLECTION);
  const q = query(
    alertsRef,
    where('acknowledged', '==', false),
    orderBy('created_at', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as FuelAlert[];
}

/**
 * Update variance threshold setting
 */
export async function updateVarianceThreshold(
  threshold: number,
  userId: string
): Promise<void> {
  if (threshold < 0 || threshold > 100) {
    throw new Error('Variance threshold must be between 0 and 100');
  }

  const settingsRef = collection(db, FUEL_SETTINGS_COLLECTION);
  const q = query(settingsRef, limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    await addDoc(settingsRef, {
      variance_threshold_percentage: threshold,
      updated_at: serverTimestamp(),
      updated_by: userId,
    });
  } else {
    const docRef = snapshot.docs[0].ref;
    await updateDoc(docRef, {
      variance_threshold_percentage: threshold,
      updated_at: serverTimestamp(),
      updated_by: userId,
    });
  }
}

/**
 * Get fuel management statistics
 */
export async function getFuelStats(): Promise<{
  fuelDisbursed: {
    today: number;
    week: number;
    month: number;
    year: number;
  };
  totalVehicles: number;
  pendingRequests: number;
  distanceCovered: {
    today: number;
    week: number;
    month: number;
    year: number;
  };
}> {
  try {
    const now = new Date();
    
    // Calculate date boundaries
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date(now);
    startOfMonth.setDate(now.getDate() - 30);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const startOfYear = new Date(now);
    startOfYear.setFullYear(now.getFullYear() - 1);
    startOfYear.setHours(0, 0, 0, 0);

    // Get all approved fuel requests
    const fuelRequestsRef = collection(db, FUEL_REQUESTS_COLLECTION);
    const approvedQuery = query(
      fuelRequestsRef,
      where('status', '==', 'APPROVED'),
      orderBy('request_date', 'desc')
    );
    const approvedSnapshot = await getDocs(approvedQuery);
    
    // Get pending requests count
    const pendingQuery = query(
      fuelRequestsRef,
      where('status', 'in', ['PENDING', 'FLAGGED'])
    );
    const pendingSnapshot = await getDocs(pendingQuery);
    
    // Get total vehicles count
    const vehiclesRef = collection(db, VEHICLES_COLLECTION);
    const vehiclesSnapshot = await getDocs(vehiclesRef);

    // Calculate stats
    let fuelToday = 0, fuelWeek = 0, fuelMonth = 0, fuelYear = 0;
    let distanceToday = 0, distanceWeek = 0, distanceMonth = 0, distanceYear = 0;

    approvedSnapshot.docs.forEach((doc) => {
      const request = doc.data();
      const requestDate = request.request_date?.toDate();
      
      if (!requestDate) return;

      const fuelAmount = request.fuel_requested_litres || 0;
      const distance = request.distance_travelled || 0;

      // Today
      if (requestDate >= startOfToday) {
        fuelToday += fuelAmount;
        distanceToday += distance;
      }

      // Week
      if (requestDate >= startOfWeek) {
        fuelWeek += fuelAmount;
        distanceWeek += distance;
      }

      // Month
      if (requestDate >= startOfMonth) {
        fuelMonth += fuelAmount;
        distanceMonth += distance;
      }

      // Year
      if (requestDate >= startOfYear) {
        fuelYear += fuelAmount;
        distanceYear += distance;
      }
    });

    return {
      fuelDisbursed: {
        today: fuelToday,
        week: fuelWeek,
        month: fuelMonth,
        year: fuelYear,
      },
      totalVehicles: vehiclesSnapshot.size,
      pendingRequests: pendingSnapshot.size,
      distanceCovered: {
        today: distanceToday,
        week: distanceWeek,
        month: distanceMonth,
        year: distanceYear,
      },
    };
  } catch (error) {
    console.error('Error fetching fuel stats:', error);
    return {
      fuelDisbursed: { today: 0, week: 0, month: 0, year: 0 },
      totalVehicles: 0,
      pendingRequests: 0,
      distanceCovered: { today: 0, week: 0, month: 0, year: 0 },
    };
  }
}

export const fuelService = {
  submitFuelRequest,
  getFuelRequests,
  approveFuelRequest,
  rejectFuelRequest,
  getVehicles,
  addVehicle,
  updateVehicleFuelEconomy,
  getFuelEconomyAuditHistory,
  getUnacknowledgedAlerts,
  getSettings,
  updateVarianceThreshold,
  getVehicle,
  getFuelStats,
};

