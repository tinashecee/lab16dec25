import { collection, query, where, getDocs, Timestamp, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface DuplicatePatientSample {
  patientName: string;
  patientPhone?: string;
  samples: Array<{
    id: string;
    sampleId?: string;
    accession_number?: string;
    status: string;
    requested_at: string;
    collected_at?: string;
    center_name: string;
    priority: string;
    tests?: string[];
  }>;
}

export interface DuplicatePatientDetection {
  duplicatePatients: DuplicatePatientSample[];
  totalDuplicates: number;
}

export interface AcknowledgedDuplicate {
  id?: string;
  patientName: string;
  patientPhone?: string;
  sampleIds: string[];
  acknowledgedAt: string;
  acknowledgedBy?: string;
  duplicateKey: string; // Unique identifier for this duplicate group
}

class DuplicatePatientService {
  /**
   * Generates a unique key for a duplicate patient group
   */
  private generateDuplicateKey(patientName: string, patientPhone: string, sampleIds: string[]): string {
    const sortedIds = [...sampleIds].sort();
    return `${patientName.toLowerCase().trim()}_${sortedIds.join('_')}`;
  }

  /**
   * Records that a duplicate has been acknowledged
   */
  async acknowledgeDuplicate(duplicate: DuplicatePatientSample, acknowledgedBy?: string): Promise<void> {
    try {
      const sampleIds = duplicate.samples.map(s => s.id);
      const duplicateKey = this.generateDuplicateKey(
        duplicate.patientName, 
        duplicate.patientPhone || '', 
        sampleIds
      );

      const acknowledgedDuplicate: Partial<AcknowledgedDuplicate> = {
        patientName: duplicate.patientName,
        patientPhone: duplicate.patientPhone,
        sampleIds,
        acknowledgedAt: new Date().toISOString(),
        duplicateKey
      };

      // Only add acknowledgedBy field if it's provided
      if (acknowledgedBy) {
        acknowledgedDuplicate.acknowledgedBy = acknowledgedBy;
      }

      const acknowledgedDuplicatesRef = collection(db, 'acknowledgedDuplicates');
      await addDoc(acknowledgedDuplicatesRef, {
        ...acknowledgedDuplicate,
        created_at: serverTimestamp()
      });

      console.log(`Acknowledged duplicate for patient: ${duplicate.patientName}`);
    } catch (error) {
      console.error('Error acknowledging duplicate:', error);
      throw error;
    }
  }

  /**
   * Gets list of acknowledged duplicates (sorted by most recent first)
   */
  async getAcknowledgedDuplicates(): Promise<AcknowledgedDuplicate[]> {
    try {
      const acknowledgedDuplicatesRef = collection(db, 'acknowledgedDuplicates');
      const querySnapshot = await getDocs(acknowledgedDuplicatesRef);
      
      const acknowledged = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AcknowledgedDuplicate[];

      // Sort by acknowledged date (most recent first)
      return acknowledged.sort((a, b) => 
        new Date(b.acknowledgedAt).getTime() - new Date(a.acknowledgedAt).getTime()
      );
    } catch (error) {
      console.error('Error fetching acknowledged duplicates:', error);
      return [];
    }
  }

  /**
   * Checks if a duplicate has already been acknowledged
   */
  private isDuplicateAcknowledged(
    duplicate: DuplicatePatientSample, 
    acknowledgedDuplicates: AcknowledgedDuplicate[]
  ): boolean {
    const sampleIds = duplicate.samples.map(s => s.id);
    const duplicateKey = this.generateDuplicateKey(
      duplicate.patientName, 
      duplicate.patientPhone || '', 
      sampleIds
    );

    return acknowledgedDuplicates.some(ack => ack.duplicateKey === duplicateKey);
  }

  /**
   * Detects duplicate patient samples for a specific date
   * Only considers active samples (excludes cancelled samples)
   * Excludes already acknowledged duplicates
   * @param date - Date to check for duplicates (defaults to today)
   * @returns Promise with duplicate patient detection results
   */
  async detectDuplicatePatients(date: Date = new Date()): Promise<DuplicatePatientDetection> {
    try {
      // Get start and end of the specified date
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const startTimestamp = Timestamp.fromDate(startOfDay);
      const endTimestamp = Timestamp.fromDate(endOfDay);

      console.log('Checking for duplicate patients between:', startOfDay, 'and', endOfDay);

      // Get acknowledged duplicates to exclude them
      const acknowledgedDuplicates = await this.getAcknowledgedDuplicates();

      // Query all samples for the specified date (we'll filter cancelled samples in code)
      const collectionRequestsRef = collection(db, 'collectionRequests');
      const samplesQuery = query(
        collectionRequestsRef,
        where('created_at', '>=', startTimestamp),
        where('created_at', '<=', endTimestamp)
      );

      const samplesSnapshot = await getDocs(samplesQuery);
      
      console.log(`Found ${samplesSnapshot.size} total samples for the date range`);
      
      if (samplesSnapshot.empty) {
        console.log('No samples found for the specified date');
        return { duplicatePatients: [], totalDuplicates: 0 };
      }

      // Group samples by patient identifier (name + phone combination for better accuracy)
      const patientGroups = new Map<string, DuplicatePatientSample>();
      let processedSamples = 0;
      let cancelledSamples = 0;
      let skippedSamples = 0;

      samplesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // Skip cancelled samples
        if (data.status === 'cancelled') {
          cancelledSamples++;
          return;
        }
        
        // Create patient identifier - use only name to catch duplicates across different centers/contact info
        const patientName = data.patient_name || data.caller_name || data.patientName || 'Unknown Patient';
        const patientPhone = data.caller_number || data.patient_phone || '';
        const patientKey = patientName.toLowerCase().trim();

        // Skip if patient name is too generic or empty
        if (!patientName || patientName.toLowerCase().trim() === 'unknown patient' || patientName.trim().length < 2) {
          skippedSamples++;
          return;
        }

        processedSamples++;
        console.log(`Processing sample for patient: "${patientName}" (${patientPhone || 'no phone'}) - Status: ${data.status} - Key: ${patientKey}`);

        const sampleInfo = {
          id: doc.id,
          sampleId: data.sample_id || data.sampleId,
          accession_number: data.accession_number,
          status: data.status || 'unknown',
          requested_at: data.requested_at || data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
          collected_at: data.collected_at ? (data.collected_at.toDate ? data.collected_at.toDate().toISOString() : data.collected_at) : undefined,
          center_name: data.center_name || data.center || 'Unknown Center',
          priority: data.priority || 'routine',
          tests: data.testName ? (Array.isArray(data.testName) ? data.testName : [data.testName]) : []
        };

        if (patientGroups.has(patientKey)) {
          // Add to existing patient group
          patientGroups.get(patientKey)!.samples.push(sampleInfo);
        } else {
          // Create new patient group
          patientGroups.set(patientKey, {
            patientName,
            patientPhone,
            samples: [sampleInfo]
          });
        }
      });

      // Filter to only include patients with multiple samples that haven't been acknowledged
      const duplicatePatients: DuplicatePatientSample[] = [];
      patientGroups.forEach(patientGroup => {
        if (patientGroup.samples.length > 1) {
          // Check if this duplicate has already been acknowledged
          if (!this.isDuplicateAcknowledged(patientGroup, acknowledgedDuplicates)) {
            // Sort samples by requested time (most recent first)
            patientGroup.samples.sort((a, b) => 
              new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime()
            );
            duplicatePatients.push(patientGroup);
          }
        }
      });

      console.log(`Sample processing summary:
        - Total samples found: ${samplesSnapshot.size}
        - Processed samples: ${processedSamples}
        - Cancelled samples: ${cancelledSamples}
        - Skipped samples: ${skippedSamples}
        - Patients with duplicates: ${duplicatePatients.length}`);

      return {
        duplicatePatients,
        totalDuplicates: duplicatePatients.reduce((total, patient) => total + patient.samples.length, 0)
      };

    } catch (error) {
      console.error('Error detecting duplicate patients:', error);
      throw new Error('Failed to detect duplicate patients');
    }
  }

  /**
   * Gets a human-readable description of sample status
   */
  getStatusDescription(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Pending Collection';
      case 'collected':
        return 'Collected - Awaiting Registration';
      case 'registered':
        return 'Registered - Awaiting Lab Receipt';
      case 'received':
        return 'Received - Processing in Lab';
      case 'completed':
      case 'consolidated all report submit':
        return 'Completed - Results Available';
      case 'delivered':
        return 'Delivered to Patient';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  }

  /**
   * Gets status color class for UI display
   */
  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'collected':
        return 'text-blue-600 bg-blue-100';
      case 'registered':
        return 'text-purple-600 bg-purple-100';
      case 'received':
        return 'text-orange-600 bg-orange-100';
      case 'completed':
      case 'consolidated all report submit':
        return 'text-green-600 bg-green-100';
      case 'delivered':
        return 'text-emerald-600 bg-emerald-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  /**
   * Formats date and time for display
   */
  formatDateTime(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-ZA', {
        timeZone: 'Africa/Johannesburg',
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).replace(',', ' at');
         } catch {
       return 'Invalid date';
     }
  }
}

export const duplicatePatientService = new DuplicatePatientService(); 