import { db } from '../config/firebase';
import { collection, getDocs, query, where, orderBy, updateDoc } from 'firebase/firestore';
import { calculateTAT } from '../utils/tatCalculations';
import { leaveService } from '../services/leaveService';

// Add a local type for TATRecord to avoid 'any' usage
export interface TATRecord {
  [key: string]: unknown;
  id: string;
  sample_id: string;
  patient_name?: string;
  center_name?: string;
  requested_at?: string;
  delivered_at?: string;
  totalTAT: string;
  dispatchTime: string;
  collectionTime: string;
  registrationTime: string;
  processingTime: string;
  deliveryTime: string;
  rawMinutes: {
    dispatch: number;
    collection: number;
    registration: number;
    processing: number;
    delivery: number;
    total: number;
  };
  accessionNumber: string;
}

// Helper to normalize Firestore Timestamp, number, or string to JS Date
function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'object' && val !== null && 'seconds' in val) {
    // @ts-expect-error Firestore Timestamp objects are not typed here, but have a 'seconds' property
    return new Date(val.seconds * 1000);
  }
  return null;
}

export const getDriverHandoverSummary = async (startDate?: Date, endDate?: Date) => {
  try {
    const handoverQuery = collection(db, 'driver_handover');
    let handoverQuerySnapshot;

    // Apply date filtering if provided
    if (startDate && endDate) {
      // Convert dates to timestamps for Firestore filtering
      const startTimestamp = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0);
      const endTimestamp = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59);
      
      const q = query(
        handoverQuery,
        where('handedoverAt', '>=', startTimestamp.toISOString()),
        where('handedoverAt', '<=', endTimestamp.toISOString()),
        orderBy('handedoverAt', 'desc')
      );
      handoverQuerySnapshot = await getDocs(q);
    } else {
      // Fetch all records if no date range specified
      handoverQuerySnapshot = await getDocs(handoverQuery);
    }

    const handoverRecords = handoverQuerySnapshot.docs.map(doc => ({
      id: doc.id,
      handedoverAt: doc.data().handedoverAt,
      sample_id: doc.data().sample_id,
      handedOverBy: doc.data().handedOverBy,
      handedOverTo: doc.data().HandedOverTo
    }));

    // If no handover records found, return empty array
    if (handoverRecords.length === 0) {
      return [];
    }

    // Step 2: Fetch all collection requests
    const collectionRequestsSnapshot = await getDocs(collection(db, 'collectionRequests'));
    
    // Create a map of collection requests by sample_id for quick lookup
    type CollectionRequestMap = Record<string, { center_name?: string; patient_name?: string; status?: string; accessionNumber?: string }>;
    const collectionRequestsMap: CollectionRequestMap = {};
    collectionRequestsSnapshot.docs.forEach(doc => {
      const data: { sample_id?: string; center_name?: string; patient_name?: string; status?: string; accessionNumber?: string; accession_number?: string } = doc.data();
      if (data.sample_id) {
        collectionRequestsMap[data.sample_id] = {
          center_name: data.center_name,
          patient_name: data.patient_name,
          status: data.status,
          accessionNumber: data.accessionNumber || data.accession_number || ''
        };
      }
    });
    
    // Step 3: Combine data from both collections
    const combinedData = handoverRecords.map(record => {
      // Look up matching collection request data by sample_id
      const requestData = collectionRequestsMap[record.sample_id] || {};
      
      // Return combined record
      return {
        id: record.id,
        handedoverAt: record.handedoverAt,
        handedOverBy: record.handedOverBy,
        handedOverTo: record.handedOverTo,
        center_name: requestData.center_name,
        patient_name: requestData.patient_name,
        status: requestData.status,
        accessionNumber: requestData.accessionNumber || ''
      };
    });
    
    return combinedData;
  } catch (error) {
    console.error('Error fetching driver handover summary:', error);
    throw error;
  }
};

// Optional: More efficient implementation for large datasets
export const getDriverHandoverSummaryOptimized = async () => {
  try {
    // Step 1: Fetch all driver handover records
    const handoverQuerySnapshot = await getDocs(collection(db, 'driver_handover'));
    const handoverRecords = handoverQuerySnapshot.docs.map(doc => ({
      id: doc.id,
      handedoverAt: doc.data().handedoverAt,
      sample_id: doc.data().sample_id,
      handedOverBy: doc.data().handedOverBy,
      handedOverTo: doc.data().HandedOverTo
    }));
    
    // Extract unique sample IDs from handover records
    const sampleIds = [...new Set(handoverRecords.map(record => record.sample_id))];
    
    // If no sample IDs found, return handover records as is
    if (sampleIds.length === 0) {
      return handoverRecords;
    }
    
    // For large datasets, we need to batch our queries (Firestore limits 'in' queries to 30 items)
    const batchSize = 30;
    type CollectionRequestMap = Record<string, { center_name?: string; patient_name?: string; status?: string; accessionNumber?: string }>;
    const collectionRequestsMap: CollectionRequestMap = {};
    
    // Process in batches
    for (let i = 0; i < sampleIds.length; i += batchSize) {
      const batchIds = sampleIds.slice(i, i + batchSize);
      
      // Query collection requests for this batch of sample IDs
      const q = query(
        collection(db, 'collectionRequests'),
        where('sample_id', 'in', batchIds)
      );
      
      const requestsSnapshot = await getDocs(q);
      
      // Add results to our map
      requestsSnapshot.docs.forEach(doc => {
        const data: { sample_id?: string; center_name?: string; patient_name?: string; status?: string; accessionNumber?: string; accession_number?: string } = doc.data();
        if (data.sample_id) {
          collectionRequestsMap[data.sample_id] = {
            center_name: data.center_name,
            patient_name: data.patient_name,
            status: data.status,
            accessionNumber: data.accessionNumber || data.accession_number || ''
          };
        }
      });
    }
    
    // Merge the data
    const combinedData = handoverRecords.map(record => {
      const requestData = collectionRequestsMap[record.sample_id] || {};
      
      return {
        id: record.id,
        handedoverAt: record.handedoverAt,
        handedOverBy: record.handedOverBy,
        handedOverTo: record.handedOverTo,
        center_name: requestData.center_name,
        patient_name: requestData.patient_name,
        status: requestData.status,
        accessionNumber: requestData.accessionNumber || ''
      };
    });
    
    return combinedData;
  } catch (error) {
    console.error('Error fetching driver handover summary:', error);
    throw error;
  }
};

// Aggregates collections and deliveries by driver from collectionRequests
export const getDriverCollectionSummary = async (startDate?: Date, endDate?: Date) => {
  try {
    console.log('🔍 Starting getDriverCollectionSummary with date filter:', { startDate, endDate });
    
    // Always fetch all records and filter by actual collection/delivery timestamps
    const collectionRequestsSnapshot = await getDocs(collection(db, 'collectionRequests'));
    console.log(`📊 Total records found: ${collectionRequestsSnapshot.docs.length}`);

    const driverStats: Record<string, { name: string; collections: number; deliveries: number }> = {};

         // Helper function to convert timestamp to Date
     const parseDate = (timestamp: unknown): Date | null => {
       if (!timestamp) return null;
       
       // Handle Firestore Timestamp
       if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
         return new Date((timestamp as { seconds: number }).seconds * 1000);
       }
      
      // Handle ISO string
      if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? null : date;
      }
      
      return null;
    };

    // Set up date range for filtering (if provided)
    let filterStart: Date | null = null;
    let filterEnd: Date | null = null;
    
    if (startDate && endDate) {
      filterStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0);
      filterEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59);
      console.log(`📅 Filtering by date range: ${filterStart.toISOString()} to ${filterEnd.toISOString()}`);
    }

    let collectionsProcessed = 0;
    let deliveriesProcessed = 0;

    collectionRequestsSnapshot.docs.forEach(doc => {
      const data = doc.data() as { 
        collected_by?: string; 
        delivered_by?: string; 
        collected_at?: unknown;
        delivered_at?: unknown;
        [key: string]: unknown;
      };
      
      const collectedBy = data.collected_by;
      const deliveredBy = data.delivered_by;

      // Process collections - filter by collected_at timestamp
      if (collectedBy && data.collected_at) {
        const collectedDate = parseDate(data.collected_at);
        
        if (collectedDate) {
          let includeCollection = true;
          
          // Apply date filter if provided
          if (filterStart && filterEnd) {
            includeCollection = collectedDate >= filterStart && collectedDate <= filterEnd;
            
            if (includeCollection) {
              console.log(`✅ Collection included: ${collectedBy} collected on ${collectedDate.toISOString()}`);
            } else {
              console.log(`❌ Collection excluded: ${collectedBy} collected on ${collectedDate.toISOString()} (outside range)`);
            }
          }
          
          if (includeCollection) {
            if (!driverStats[collectedBy]) {
              driverStats[collectedBy] = { name: collectedBy, collections: 0, deliveries: 0 };
            }
            driverStats[collectedBy].collections += 1;
            collectionsProcessed++;
          }
        }
      }

      // Process deliveries - filter by delivered_at timestamp
      if (deliveredBy && data.delivered_at) {
        const deliveredDate = parseDate(data.delivered_at);
        
        if (deliveredDate) {
          let includeDelivery = true;
          
          // Apply date filter if provided
          if (filterStart && filterEnd) {
            includeDelivery = deliveredDate >= filterStart && deliveredDate <= filterEnd;
            
            if (includeDelivery) {
              console.log(`✅ Delivery included: ${deliveredBy} delivered on ${deliveredDate.toISOString()}`);
            } else {
              console.log(`❌ Delivery excluded: ${deliveredBy} delivered on ${deliveredDate.toISOString()} (outside range)`);
            }
          }
          
          if (includeDelivery) {
            if (!driverStats[deliveredBy]) {
              driverStats[deliveredBy] = { name: deliveredBy, collections: 0, deliveries: 0 };
            }
            driverStats[deliveredBy].deliveries += 1;
            deliveriesProcessed++;
          }
        }
      }
    });

    console.log(`✅ FILTERING COMPLETE!`);
    console.log(`📊 Collections processed: ${collectionsProcessed}`);
    console.log(`📊 Deliveries processed: ${deliveriesProcessed}`);
    console.log(`👥 Drivers found: ${Object.keys(driverStats).length}`);

    // Convert to array and sort by driver name
    return Object.values(driverStats).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching driver collection summary:', error);
    throw error;
  }
};

// Aggregates total number of samples collected per center within date range
export const getCenterCollectionSummary = async (startDate?: Date, endDate?: Date) => {
  try {
    console.log('🔍 Starting getCenterCollectionSummary with date filter:', { startDate, endDate });
    
    // Always fetch all records and filter by actual collection timestamps
    const collectionRequestsSnapshot = await getDocs(collection(db, 'collectionRequests'));
    console.log(`📊 Total records found: ${collectionRequestsSnapshot.docs.length}`);

    const centerStats: Record<string, { center_name: string; total_samples: number }> = {};

    // Helper function to convert timestamp to Date
    const parseDate = (timestamp: unknown): Date | null => {
      if (!timestamp) return null;
      
      // Handle Firestore Timestamp
      if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
        return new Date((timestamp as { seconds: number }).seconds * 1000);
      }
      
      // Handle ISO string
      if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? null : date;
      }
      
      return null;
    };

    // Set up date range for filtering (if provided)
    let filterStart: Date | null = null;
    let filterEnd: Date | null = null;
    
    if (startDate && endDate) {
      filterStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0);
      filterEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59);
      console.log(`📅 Filtering by date range: ${filterStart.toISOString()} to ${filterEnd.toISOString()}`);
    }

    let samplesProcessed = 0;

    collectionRequestsSnapshot.docs.forEach(doc => {
      const data = doc.data() as { 
        center_name?: string; 
        sample_id?: string; 
        collected_at?: unknown;
        status?: string;
        [key: string]: unknown;
      };
      
      const centerName = data.center_name;
      const sampleId = data.sample_id;

      // Only count samples that have been collected (have collected_at timestamp and collected status)
      if (centerName && sampleId && data.collected_at) {
        const collectedDate = parseDate(data.collected_at);
        
        if (collectedDate) {
          let includeSample = true;
          
          // Apply date filter if provided
          if (filterStart && filterEnd) {
            includeSample = collectedDate >= filterStart && collectedDate <= filterEnd;
            
            if (includeSample) {
              console.log(`✅ Sample included: ${centerName} - ${sampleId} collected on ${collectedDate.toISOString()}`);
            } else {
              console.log(`❌ Sample excluded: ${centerName} - ${sampleId} collected on ${collectedDate.toISOString()} (outside range)`);
            }
          }
          
          if (includeSample) {
            if (!centerStats[centerName]) {
              centerStats[centerName] = { center_name: centerName, total_samples: 0 };
            }
            centerStats[centerName].total_samples += 1;
            samplesProcessed++;
          }
        }
      } else if (centerName && sampleId && !data.collected_at) {
        // Log samples that haven't been collected yet
        console.log(`⏳ Sample not yet collected: ${centerName} - ${sampleId} (status: ${data.status || 'unknown'})`);
      }
    });

    console.log(`✅ FILTERING COMPLETE!`);
    console.log(`📊 Samples processed: ${samplesProcessed}`);
    console.log(`🏥 Centers found: ${Object.keys(centerStats).length}`);

    // Convert to array and sort by center_name
    return Object.values(centerStats).sort((a, b) => a.center_name.localeCompare(b.center_name));
  } catch (error) {
    console.error('Error fetching center collection summary:', error);
    throw error;
  }
};

// Registration summary by staff member with date range filter for actual registration dates
export const getRegistrationSummary = async (startDate?: Date, endDate?: Date) => {
  try {
    console.log('🔍 Starting getRegistrationSummary with date filter:', { startDate, endDate });
    
    // Always fetch all records and filter by actual registration timestamps
    const collectionRequestsSnapshot = await getDocs(collection(db, 'collectionRequests'));
    console.log(`📊 Total records found: ${collectionRequestsSnapshot.docs.length}`);

    const staffStats: Record<string, { registered_by: string; total_registrations: number }> = {};

    // Helper function to convert timestamp to Date
    const parseDate = (timestamp: unknown): Date | null => {
      if (!timestamp) return null;
      
      // Handle Firestore Timestamp
      if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
        return new Date((timestamp as { seconds: number }).seconds * 1000);
      }
      
      // Handle ISO string
      if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? null : date;
      }
      
      return null;
    };

    // Set up date range for filtering (if provided)
    let filterStart: Date | null = null;
    let filterEnd: Date | null = null;
    
    if (startDate && endDate) {
      filterStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0);
      filterEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59);
      console.log(`📅 Filtering by date range: ${filterStart.toISOString()} to ${filterEnd.toISOString()}`);
    }

    let registrationsProcessed = 0;

    collectionRequestsSnapshot.docs.forEach(doc => {
      const data = doc.data() as { 
        registered_by?: string; 
        time_registered?: unknown;
        registered_at?: unknown;
        sample_id?: string;
        status?: string;
        [key: string]: unknown;
      };
      
      const registeredBy = data.registered_by;
      const sampleId = data.sample_id;

      // Only count samples that have been registered (have registration timestamp and registered_by field)
      if (registeredBy && (data.time_registered || data.registered_at)) {
        const registrationDate = parseDate(data.time_registered || data.registered_at);
        
        if (registrationDate) {
          let includeRegistration = true;
          
          // Apply date filter if provided
          if (filterStart && filterEnd) {
            includeRegistration = registrationDate >= filterStart && registrationDate <= filterEnd;
            
            if (includeRegistration) {
              console.log(`✅ Registration included: ${registeredBy} registered ${sampleId || 'sample'} on ${registrationDate.toISOString()}`);
            } else {
              console.log(`❌ Registration excluded: ${registeredBy} registered ${sampleId || 'sample'} on ${registrationDate.toISOString()} (outside range)`);
            }
          }
          
          if (includeRegistration) {
            if (!staffStats[registeredBy]) {
              staffStats[registeredBy] = { registered_by: registeredBy, total_registrations: 0 };
            }
            staffStats[registeredBy].total_registrations += 1;
            registrationsProcessed++;
          }
        }
      } else if (registeredBy && !data.time_registered && !data.registered_at) {
        // Log samples that have been assigned to staff but not yet registered
        console.log(`⏳ Sample assigned but not yet registered: ${registeredBy} - ${sampleId || 'unknown'} (status: ${data.status || 'unknown'})`);
      }
    });

    console.log(`✅ FILTERING COMPLETE!`);
    console.log(`📊 Registrations processed: ${registrationsProcessed}`);
    console.log(`👥 Staff members found: ${Object.keys(staffStats).length}`);

    // Convert to array and sort by total registrations (highest first)
    return Object.values(staffStats).sort((a, b) => b.total_registrations - a.total_registrations);
  } catch (error) {
    console.error('Error fetching registration summary:', error);
    throw error;
  }
};

// Staff leave summary with optional date range filter for staff joined dates
export const getStaffLeaveSummary = async (startDate?: Date, endDate?: Date) => {
  try {
    // List of users to exclude from leave accrual (all lowercase for case-insensitive comparison)
    const excludedUsers = [
      
      'faith mberi',
      'morton mabumbo',
      'roselyn magaramombe',
      'night driver',
      'thabani mabumbo',
      'test driver',
      'test mctesting',
      'cole mudyiwa',
      'rudorwashe timire',
      'elson mberi',
      'tapiwanashe fallon chinyanga',
    
      'tinashe cheuka'
    ].map(name => name.toLowerCase());

    // Fetch users for accrued leave and taken leave
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users: Record<string, { name: string; dateJoined: string; accrued: number; taken: number }> = {};
    
    for (const doc of usersSnapshot.docs) {
      const data = doc.data();
      if (data.name && !excludedUsers.includes(data.name.toLowerCase())) {  // Case-insensitive comparison
        
        // Apply date filtering if provided (filter by dateJoined)
        if (startDate && endDate && data.dateJoined) {
          const joinedDate = new Date(data.dateJoined);
          const filterStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
          const filterEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
          
          if (joinedDate < filterStart || joinedDate > filterEnd) {
            continue; // Skip this user if their join date is outside the filter range
          }
        }
        // If leave_accrued is not present, calculate it
        let accrued = data.leave_accrued;
        if (accrued === undefined && data.dateJoined) {
          const today = new Date().toISOString().split('T')[0];
          accrued = leaveService.calculateLeaveDays(data.dateJoined, today);
          
          // Update the user's document with the calculated accrual
          await updateDoc(doc.ref, {
            leave_accrued: accrued,
            leave_last_calculated: today
          });
        }

        // Format the date as dd/mm/yyyy
        const dateJoined = data.dateJoined ? new Date(data.dateJoined) : new Date();
        const formattedDate = dateJoined.toLocaleDateString('en-ZA', { timeZone: 'Africa/Johannesburg' }); // This will format as dd/mm/yyyy in GMT+2
        
        users[data.name] = { 
          name: data.name,
          dateJoined: formattedDate,
          accrued: accrued ?? 0,
          taken: data.leaveDaysTaken ?? 0
        };
      }
    }

    // Combine data and add sequential numbering
    const summary = Object.values(users)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((user, index) => ({
        no: index + 1,
        name: user.name,
        dateJoined: user.dateJoined,
        accrued: Number(user.accrued.toFixed(2)),
        taken: Number(user.taken.toFixed(2)),
        balance: Number((user.accrued - user.taken).toFixed(2))
      }));
    
    return summary;
  } catch (error) {
    console.error('Error fetching staff leave summary:', error);
    throw error;
  }
};

// Helper to format a Date object as 'YYYY-MM-DD' in UTC
function formatDateUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}



export const getLeaveRequestsSummary = async (startDate?: Date, endDate?: Date) => {
  try {
    const leaveRequestsRef = collection(db, "leave-requests");
    const leaveSnapshot = await getDocs(leaveRequestsRef);
    
    interface LeaveRequest {
      id: string;
      name: string;
      type: string;
      from: string; // 'YYYY-MM-DD'
      to: string;   // 'YYYY-MM-DD'
      days: number;
      date_requested: string;
      status: string;
      approvedAt?: { seconds: number; nanoseconds: number };
      [key: string]: unknown;
    }
    
    const leaveRequests = leaveSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as LeaveRequest[];
    
    console.log(`Total leave requests found: ${leaveRequests.length}`);
    
    const approvedRequests = leaveRequests.filter(req => req.status === 'APPROVED');
    console.log(`Approved leave requests: ${approvedRequests.length}`);
    
    // If no date range, just return all approved
    if (!startDate && !endDate) {
      console.log('No date filter applied, returning all approved requests');
      return approvedRequests.map((req, index) => formatLeaveRequestSummary(req, index));
    }

    // Convert filter dates to 'YYYY-MM-DD' strings in UTC
    const filterStart = startDate ? formatDateUTC(startDate) : null;
    const filterEnd = endDate ? formatDateUTC(endDate) : null;
    
    console.log(`Filtering leave requests between ${filterStart} and ${filterEnd}`);

    // Filter by overlap of leave period and filter period (all as 'YYYY-MM-DD' strings)
    const filteredRequests = approvedRequests.filter(req => {
      if (!req.from || !req.to) {
        console.log(`❌ Skipping request ${req.id} (${req.name || 'Unknown'}) - missing from/to dates`);
        return false;
      }
      
      // Ensure dates are in YYYY-MM-DD format 
      const leaveStart = String(req.from).trim();
      const leaveEnd = String(req.to).trim();
      
      console.log(`🔍 Checking request ${req.id} (${req.name || 'Unknown'}): Leave period ${leaveStart} to ${leaveEnd}`);
      
      // Validate date format (should be YYYY-MM-DD)
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(leaveStart) || !datePattern.test(leaveEnd)) {
        console.log(`❌ Invalid date format for request ${req.id}: from="${leaveStart}", to="${leaveEnd}"`);
        return false;
      }
      
      // Overlap logic: (leaveStart <= filterEnd) && (leaveEnd >= filterStart)
      let includeRequest = false;
      
      if (filterStart && filterEnd) {
        includeRequest = leaveStart <= filterEnd && leaveEnd >= filterStart;
        
        console.log(`🎯 Request ${req.id} (${req.name}): 
          Leave: ${leaveStart} to ${leaveEnd}
          Filter: ${filterStart} to ${filterEnd}
          Overlap check: (${leaveStart} <= ${filterEnd}) && (${leaveEnd} >= ${filterStart})
          Result: ${leaveStart <= filterEnd} && ${leaveEnd >= filterStart} = ${includeRequest}
          ${includeRequest ? '✅ INCLUDED' : '❌ EXCLUDED'}`);
      } else if (filterStart) {
        includeRequest = leaveEnd >= filterStart;
        console.log(`🎯 Request ${req.id} (${req.name}): Leave ${leaveStart} to ${leaveEnd}, Filter start ${filterStart}, Include: ${includeRequest}`);
      } else if (filterEnd) {
        includeRequest = leaveStart <= filterEnd;
        console.log(`🎯 Request ${req.id} (${req.name}): Leave ${leaveStart} to ${leaveEnd}, Filter end ${filterEnd}, Include: ${includeRequest}`);
      } else {
        includeRequest = true;
        console.log(`✅ No date filter applied, including request ${req.id}`);
      }
      
      return includeRequest;
    });

    console.log(`✅ FILTERING COMPLETE!`);
    console.log(`📊 Results: ${filteredRequests.length} out of ${approvedRequests.length} approved requests match the date filter`);
    if (startDate && endDate) {
      console.log(`🗓️ Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    }
    return filteredRequests.map((req, index) => formatLeaveRequestSummary(req, index));
  } catch (error) {
    console.error('Error fetching leave requests summary:', error);
    throw error;
  }
};

function formatLeaveRequestSummary(req: any, index: number) {
  const fromDateDisplay = req.from ? new Date(req.from + "T00:00:00Z") : null;
  const toDateDisplay = req.to ? new Date(req.to + "T00:00:00Z") : null;
  const period = (fromDateDisplay && toDateDisplay && !isNaN(fromDateDisplay.getTime()) && !isNaN(toDateDisplay.getTime()))
    ? `${fromDateDisplay.toLocaleDateString('en-ZA', { timeZone: 'Africa/Johannesburg' })} - ${toDateDisplay.toLocaleDateString('en-ZA', { timeZone: 'Africa/Johannesburg' })}` 
    : 'N/A';
  const requestDate = req.date_requested 
    ? new Date(req.date_requested + "T00:00:00Z").toLocaleDateString('en-ZA', { timeZone: 'Africa/Johannesburg' }) 
    : 'N/A';
  const approvalTimestamp = req.approvedAt;
  let approvalDate = 'N/A';
  if (req.status === 'APPROVED') {
    if (approvalTimestamp && typeof approvalTimestamp.seconds === 'number') {
      approvalDate = new Date(approvalTimestamp.seconds * 1000).toLocaleDateString('en-ZA', { timeZone: 'Africa/Johannesburg' });
    } else {
      approvalDate = 'Approved (no date)';
    }
  }
  return {
    no: index + 1,
    name: req.name || 'Unknown',
    leaveType: req.type || 'N/A',
    requestDate,
    approvalDate,
    period,
    days: req.days || 0,
    status: req.status || 'N/A'
  };
}

// TAT Analysis Report: Fetch delivered samples and calculate TAT for each, filtered by requested date
export const getTATAnalysisReport = async (startDate?: Date, endDate?: Date) => {
  try {
    console.log('🔍 Starting getTATAnalysisReport with date filter:', { startDate, endDate });
    
    // Always fetch all records and filter by requested_at timestamps
    const collectionRequestsSnapshot = await getDocs(collection(db, 'collectionRequests'));
    console.log(`📊 Total records found: ${collectionRequestsSnapshot.docs.length}`);
    
    const tatRecords: TATRecord[] = [];

    // Set up date range for filtering (if provided)
    let filterStart: Date | null = null;
    let filterEnd: Date | null = null;
    
    if (startDate && endDate) {
      filterStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0);
      filterEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59);
      console.log(`📅 Filtering by requested date range: ${filterStart.toISOString()} to ${filterEnd.toISOString()}`);
    }

    let deliveredSamplesFound = 0;
    let samplesProcessed = 0;

    collectionRequestsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const sampleId = data.sample_id || doc.id;
      
      // Prefer delivered_at from the document, fallback to data.delivered_at
      const deliveredAtRaw = doc.get('delivered_at') || data.delivered_at;
      const deliveredAtDate = toDate(deliveredAtRaw);
      const requestedAtDate = toDate(data.requested_at);
      
      // Only include delivered samples
      if (data.status === 'delivered' && requestedAtDate && deliveredAtDate) {
        deliveredSamplesFound++;
        
        let includeSample = true;
        
        // Apply date filter if provided - filter by requested date
        if (filterStart && filterEnd) {
          includeSample = requestedAtDate >= filterStart && requestedAtDate <= filterEnd;
          
          if (includeSample) {
            console.log(`✅ Sample included: ${sampleId} requested on ${requestedAtDate.toISOString()}, delivered on ${deliveredAtDate.toISOString()}`);
          } else {
            console.log(`❌ Sample excluded: ${sampleId} requested on ${requestedAtDate.toISOString()} (outside requested date range)`);
          }
        }
        
        if (includeSample) {
          // Calculate TAT
          const tat = calculateTAT({ ...data, delivered_at: deliveredAtRaw });
          tatRecords.push({
            id: doc.id,
            accessionNumber: data.accessionNumber || data.accession_number || '',
            sample_id: data.sample_id,
            patient_name: data.patient_name,
            center_name: data.center_name,
            requested_at: data.requested_at,
            delivered_at: deliveredAtDate.toISOString(),
            totalTAT: tat.totalTAT,
            dispatchTime: tat.dispatchTime,
            collectionTime: tat.collectionTime,
            registrationTime: tat.registrationTime,
            processingTime: tat.processingTime,
            deliveryTime: tat.deliveryTime,
            rawMinutes: tat.rawMinutes
          });
          samplesProcessed++;
        }
      } else if (data.status !== 'delivered') {
        // Log samples that aren't delivered yet
        if (data.status) {
          console.log(`⏳ Sample not delivered: ${sampleId} (status: ${data.status})`);
        }
      }
    });

    console.log(`✅ FILTERING COMPLETE!`);
    console.log(`📊 Delivered samples found: ${deliveredSamplesFound}`);
    console.log(`📊 TAT records processed: ${samplesProcessed}`);
    if (startDate && endDate) {
      console.log(`🗓️ Filtered by request date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    }

    return tatRecords;
  } catch (error) {
    console.error('Error fetching TAT analysis report:', error);
    throw error;
  }
};

// Test Summary Report: Aggregates test data for completed and delivered samples, filtered by completion/delivery date
export const getTestSummaryReport = async (startDate?: Date, endDate?: Date) => {
  try {
    console.log('🔍 Starting getTestSummaryReport with date filter:', { startDate, endDate });
    
    // Always fetch all records and filter by actual completion/delivery timestamps
    const collectionRequestsSnapshot = await getDocs(collection(db, 'collectionRequests'));
    console.log(`📊 Total records found: ${collectionRequestsSnapshot.docs.length}`);

    // We'll use a map to aggregate by testID and testName
    const testMap: Record<string, { testName: string; count: number }> = {};

    // Helper function to convert timestamp to Date
    const parseDate = (timestamp: unknown): Date | null => {
      if (!timestamp) return null;
      
      // Handle Firestore Timestamp
      if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
        return new Date((timestamp as { seconds: number }).seconds * 1000);
      }
      
      // Handle ISO string
      if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? null : date;
      }
      
      return null;
    };

    // Set up date range for filtering (if provided)
    let filterStart: Date | null = null;
    let filterEnd: Date | null = null;
    
    if (startDate && endDate) {
      filterStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0);
      filterEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59);
      console.log(`📅 Filtering by completion/delivery date range: ${filterStart.toISOString()} to ${filterEnd.toISOString()}`);
    }

    let completedSamplesFound = 0;
    let testsProcessed = 0;

    collectionRequestsSnapshot.docs.forEach(doc => {
      const data = doc.data() as {
        status?: string;
        testID?: string | string[];
        testName?: string | string[];
        completed_at?: unknown;
        delivered_at?: unknown;
        sample_id?: string;
        [key: string]: unknown;
      };
      
      const sampleId = data.sample_id || doc.id;
      
      // Only include samples marked as completed or delivered
      if ((data.status === 'completed' || data.status === 'delivered') && data.testID && data.testName) {
        completedSamplesFound++;
        
        // Get completion/delivery date for filtering
        const completionDate = parseDate(data.completed_at) || parseDate(data.delivered_at);
        
        if (completionDate) {
          let includeSample = true;
          
          // Apply date filter if provided - filter by completion/delivery date
          if (filterStart && filterEnd) {
            includeSample = completionDate >= filterStart && completionDate <= filterEnd;
            
            if (includeSample) {
              console.log(`✅ Sample included: ${sampleId} completed/delivered on ${completionDate.toISOString()}`);
            } else {
              console.log(`❌ Sample excluded: ${sampleId} completed/delivered on ${completionDate.toISOString()} (outside date range)`);
            }
          }
          
          if (includeSample) {
            // Handle if testID/testName are arrays (multiple tests per sample)
            const testIDs = Array.isArray(data.testID) ? data.testID : [data.testID];
            const testNames = Array.isArray(data.testName) ? data.testName : [data.testName];
            
            // If both are arrays and same length, pair them; otherwise, pair each testID with the same testName
            if (testIDs.length === testNames.length) {
              for (let i = 0; i < testIDs.length; i++) {
                const id = testIDs[i];
                const name = testNames[i];
                if (!testMap[id]) {
                  testMap[id] = { testName: name, count: 0 };
                }
                testMap[id].count += 1;
                testsProcessed++;
              }
            } else {
              // Fallback: pair each testID with the first testName
              testIDs.forEach(id => {
                const name = testNames[0];
                if (!testMap[id]) {
                  testMap[id] = { testName: name, count: 0 };
                }
                testMap[id].count += 1;
                testsProcessed++;
              });
            }
          }
        } else {
          console.log(`⚠️ Sample ${sampleId} marked as ${data.status} but missing completion/delivery timestamp`);
        }
      } else if (data.status && data.status !== 'completed' && data.status !== 'delivered') {
        // Log samples that aren't completed yet
        console.log(`⏳ Sample not completed: ${sampleId} (status: ${data.status})`);
      }
    });

    console.log(`✅ FILTERING COMPLETE!`);
    console.log(`📊 Completed/delivered samples found: ${completedSamplesFound}`);
    console.log(`📊 Individual tests processed: ${testsProcessed}`);
    console.log(`🧪 Unique test types found: ${Object.keys(testMap).length}`);
    if (startDate && endDate) {
      console.log(`🗓️ Filtered by completion/delivery date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    }

    // Convert to array: one row per testID, sorted by count (highest first)
    const result: { testID: string; testName: string; count: number }[] = [];
    Object.entries(testMap).forEach(([testID, { testName, count }]) => {
      result.push({ testID, testName, count });
    });
    
    return result.sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error('Error fetching test summary report:', error);
    throw error;
  }
};

export const getUserActivityLog = async (startDate?: Date, endDate?: Date) => {
  try {
    let q;
    
    // Apply date filtering if provided
    if (startDate && endDate) {
      // Convert dates to Firestore Timestamps for filtering
      const startTimestamp = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0);
      const endTimestamp = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59);
      
      q = query(
        collection(db, 'activityLogs'),
        where('timestamp', '>=', startTimestamp),
        where('timestamp', '<=', endTimestamp),
        orderBy('timestamp', 'desc')
      );
    } else {
      // Fetch all records if no date range specified
      q = query(collection(db, 'activityLogs'), orderBy('timestamp', 'desc'));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        user: data.userName || data.userId || '',
        action: data.action,
        details: data.details,
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toLocaleString() : '',
        ip: data.ipAddress || '',
      };
    });
  } catch (error) {
    console.error('Error fetching user activity log:', error);
    return [];
  }
};