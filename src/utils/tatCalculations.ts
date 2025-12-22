interface TATMetrics {
  dispatchTime: string;
  collectionTime: string;
  registrationTime: string;
  processingTime: string;
  deliveryTime: string;
  totalTAT: string;
  rawMinutes: {
    dispatch: number;
    collection: number;
    registration: number;
    processing: number;
    delivery: number;
    total: number;
  };
}

interface Test {
  testID: string;
  targetTAT?: {
    routine: number;  // in minutes
    urgent: number;   // in minutes
  };
  normalTAT?: string; // Format like "HH:MM:SS" or "DD:HH:MM:SS"
  urgentTAT?: string; // Format like "HH:MM:SS" or "DD:HH:MM:SS"
}

export const calculateTAT = (sample: SampleCollection | TimelineSamples): TATMetrics => {
  console.log('calculateTAT called with sample:', {
    id: sample.id,
    // Check both possible field names for each timestamp
    requested_at: 'requested_at' in sample ? sample.requested_at : ('time_requested' in sample ? (sample as any).time_requested : undefined),
    accepted_collection_at: 'accepted_collection_at' in sample ? (sample as any).accepted_collection_at : undefined,
    driver_assigned_at: 'driver_assigned_at' in sample ? (sample as any).driver_assigned_at : undefined,
    collected_at: 'collected_at' in sample ? (sample as any).collected_at : ('time_collected' in sample ? (sample as any).time_collected : undefined),
    time_registered: 'time_registered' in sample ? sample.time_registered : undefined,
    registered_at: 'registered_at' in sample ? (sample as any).registered_at : undefined,
    received_at: 'received_at' in sample ? sample.received_at : undefined,
    completed_at: 'completed_at' in sample ? sample.completed_at : undefined,
    delivered_at: 'delivered_at' in sample ? sample.delivered_at : undefined,
    created_at: 'created_at' in sample ? sample.created_at : undefined
  });

  const calculateDuration = (startTime: string | null | any, endTime: string | null | any): number => {
    if (!startTime || !endTime) {
      console.log('Missing time values:', { startTime, endTime });
      return 0;
    }
    
    // Handle Firebase Timestamp objects
    const getTimestamp = (time: any): number => {
      console.log('Processing timestamp:', time, typeof time);
      if (time instanceof Object && 'seconds' in time) {
        // Handle Firebase Timestamp object
        console.log('Firebase Timestamp detected');
        return time.seconds * 1000;
      } else if (time instanceof Date) {
        console.log('Date object detected');
        return time.getTime();
      } else if (typeof time === 'string') {
        // Handle ISO string or other string format
        console.log('String timestamp detected');
        const parsed = new Date(time);
        if (isNaN(parsed.getTime())) {
          console.warn('Invalid date string:', time);
          return 0;
        }
        return parsed.getTime();
      } else {
        console.warn('Unknown timestamp format:', time, typeof time);
        return 0;
      }
    };
    
    const start = getTimestamp(startTime);
    const end = getTimestamp(endTime);
    
    if (start === 0 || end === 0) {
      console.log('Invalid timestamps, returning 0 duration');
      return 0;
    }
    
    const duration = Math.floor((end - start) / (1000 * 60)); // Duration in minutes
    console.log('Calculated duration:', { startTime, endTime, start, end, duration });
    return Math.max(0, duration); // Ensure non-negative duration
  };

  const formatDuration = (minutes: number): string => {
    if (minutes === 0) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Helper to get the right field name for each timestamp
  const getRequestedAt = () => {
    if ('requested_at' in sample) return sample.requested_at;
    if ('time_requested' in sample) return (sample as any).time_requested;
    if ('created_at' in sample) return sample.created_at;
    return undefined;
  };
  
  const getCollectedAt = () => {
    if ('collected_at' in sample) return (sample as any).collected_at;
    if ('time_collected' in sample) return (sample as any).time_collected;
    return undefined;
  };
  
  const getRegisteredAt = () => {
    if ('time_registered' in sample) return sample.time_registered;
    if ('registered_at' in sample) return (sample as any).registered_at;
    return undefined;
  };
  
  const getReceivedAt = () => 'received_at' in sample ? sample.received_at : undefined;
  const getCompletedAt = () => 'completed_at' in sample ? sample.completed_at : undefined;
  const getDeliveredAt = () => 'delivered_at' in sample ? sample.delivered_at : undefined;
  const getAcceptedCollectionAt = () => 'accepted_collection_at' in sample ? (sample as any).accepted_collection_at : undefined;
  const getDriverAssignedAt = () => 'driver_assigned_at' in sample ? (sample as any).driver_assigned_at : undefined;

  // 1. Dispatch time: Time from request to driver acceptance
  const dispatchMinutes = calculateDuration(
    getRequestedAt(),
    getAcceptedCollectionAt() || getDriverAssignedAt()
  );

  // 2. Collection time: Time from driver acceptance to sample collection
  const collectionMinutes = calculateDuration(
    getAcceptedCollectionAt() || getDriverAssignedAt(),
    getCollectedAt()
  );

  // 3. Registration time: Time from request to sample registration
  const registrationMinutes = calculateDuration(
    getRequestedAt(),
    getRegisteredAt()
  );

  // 4. Processing time: Time from sample received to completion
  const processingMinutes = calculateDuration(
    getReceivedAt(),
    getCompletedAt()
  );

  // 5. Delivery time: Time from completion to delivery confirmation
  const deliveryMinutes = calculateDuration(
    getCompletedAt(),
    getDeliveredAt()
  );

  // Calculate total TAT from received to completion/delivery
  const totalMinutes = 
    calculateDuration(getReceivedAt(), getDeliveredAt() || getCompletedAt()) ||
    (processingMinutes + deliveryMinutes);

  console.log('Final TAT calculations:', {
    dispatchMinutes,
    collectionMinutes,
    registrationMinutes,
    processingMinutes,
    deliveryMinutes,
    totalMinutes
  });

  return {
    dispatchTime: formatDuration(dispatchMinutes),
    collectionTime: formatDuration(collectionMinutes),
    registrationTime: formatDuration(registrationMinutes),
    processingTime: formatDuration(processingMinutes),
    deliveryTime: formatDuration(deliveryMinutes),
    totalTAT: formatDuration(totalMinutes),
    rawMinutes: {
      dispatch: dispatchMinutes,
      collection: collectionMinutes,
      registration: registrationMinutes,
      processing: processingMinutes,
      delivery: deliveryMinutes,
      total: totalMinutes
    }
  };
};

export const getLongestTargetTAT = (tests: Test[], priority: 'routine' | 'urgent'): number => {
  if (!tests || tests.length === 0) return 0;
  
  return Math.max(...tests
    .filter(test => test && (test.normalTAT || test.urgentTAT)) // Filter out tests without TAT values
    .map(test => {
      // Convert TAT string to minutes
      const tatValue = priority === 'routine' ? test.normalTAT : test.urgentTAT;
      if (!tatValue) return 0;
      
      // Parse TAT format (assuming format is like "HH:MM:SS" or "DD:HH:MM:SS")
      const parts = tatValue.split(':').map(Number);
      let minutes = 0;
      if (parts.length === 4) { // DD:HH:MM:SS
        minutes = (parts[0] * 24 * 60) + (parts[1] * 60) + parts[2];
      } else if (parts.length === 3) { // HH:MM:SS
        minutes = (parts[0] * 60) + parts[1];
      }
      return minutes;
    })
  );
};

export const getTATStatus = (actualMinutes: number, targetMinutes: number): 'success' | 'warning' | 'danger' => {
  if (actualMinutes <= targetMinutes) return 'success';
  
  const overagePercentage = ((actualMinutes - targetMinutes) / targetMinutes) * 100;
  
  if (overagePercentage <= 20) return 'warning';
  return 'danger';
};

import { startOfDay, startOfWeek, startOfMonth, isAfter, isWithinInterval, endOfDay, endOfWeek, endOfMonth, parseISO } from 'date-fns';
import { TimelineSamples } from '../services/sampleService';
import { SampleCollection } from '../services/sampleCollectionService';
import { Timestamp } from 'firebase/firestore';

export interface TATStatistics {
  daily: {
    dispatch: { current: string; rawMinutes: number; count: number; };
    collection: { current: string; rawMinutes: number; count: number; };
    registration: { current: string; rawMinutes: number; count: number; };
    processing: { current: string; rawMinutes: number; count: number; };
    delivery: { current: string; rawMinutes: number; count: number; };
  };
  weekly: {
    dispatch: { current: string; rawMinutes: number; count: number; };
    collection: { current: string; rawMinutes: number; count: number; };
    registration: { current: string; rawMinutes: number; count: number; };
    processing: { current: string; rawMinutes: number; count: number; };
    delivery: { current: string; rawMinutes: number; count: number; };
  };
  monthly: {
    dispatch: { current: string; rawMinutes: number; count: number; };
    collection: { current: string; rawMinutes: number; count: number; };
    registration: { current: string; rawMinutes: number; count: number; };
    processing: { current: string; rawMinutes: number; count: number; };
    delivery: { current: string; rawMinutes: number; count: number; };
  };
}

// Helper function to convert any timestamp format to a Date object
const parseTimestamp = (timestamp: string | Date | Timestamp | any): Date | null => {
  if (!timestamp) return null;
  
  try {
    // Handle Firebase Timestamp objects
    if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
      return new Date(timestamp.seconds * 1000);
    }
    
    // Handle Date objects
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    // Handle string timestamps
    if (typeof timestamp === 'string') {
      const parsed = new Date(timestamp);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    
    console.warn('Unable to parse timestamp:', timestamp);
    return null;
  } catch (error) {
    console.error('Error parsing timestamp:', timestamp, error);
    return null;
  }
};

// Helper function to determine if a timestamp is within a time range
const isInTimeRange = (timestamp: string | Date | Timestamp | any, startDate: Date, endDate: Date): boolean => {
  const parsedTimestamp = parseTimestamp(timestamp);
  if (!parsedTimestamp) return false;
  
  return parsedTimestamp >= startDate && parsedTimestamp <= endDate;
};

// Create an empty stats object with default values
const createEmptyStats = (): TATStatistics => ({
  daily: {
    dispatch: { current: 'N/A', rawMinutes: 0, count: 0 },
    collection: { current: 'N/A', rawMinutes: 0, count: 0 },
    registration: { current: 'N/A', rawMinutes: 0, count: 0 },
    processing: { current: 'N/A', rawMinutes: 0, count: 0 },
    delivery: { current: 'N/A', rawMinutes: 0, count: 0 }
  },
  weekly: {
    dispatch: { current: 'N/A', rawMinutes: 0, count: 0 },
    collection: { current: 'N/A', rawMinutes: 0, count: 0 },
    registration: { current: 'N/A', rawMinutes: 0, count: 0 },
    processing: { current: 'N/A', rawMinutes: 0, count: 0 },
    delivery: { current: 'N/A', rawMinutes: 0, count: 0 }
  },
  monthly: {
    dispatch: { current: 'N/A', rawMinutes: 0, count: 0 },
    collection: { current: 'N/A', rawMinutes: 0, count: 0 },
    registration: { current: 'N/A', rawMinutes: 0, count: 0 },
    processing: { current: 'N/A', rawMinutes: 0, count: 0 },
    delivery: { current: 'N/A', rawMinutes: 0, count: 0 }
  }
});

// Format minutes to hours and minutes
const formatMinutes = (minutes: number): string => {
  if (minutes === 0) return 'N/A';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

// Calculate TAT statistics from samples
export const calculateTATStatistics = (samples: (TimelineSamples | SampleCollection)[], dateRange?: [Date | null, Date | null]): TATStatistics => {
  console.log('Running calculateTATStatistics with', samples.length, 'samples and dateRange:', dateRange);
  const stats = createEmptyStats();
  
  // Set up time periods based on the date range or current date
  let todayStart: Date, todayEnd: Date, weekStart: Date, weekEnd: Date, monthStart: Date, monthEnd: Date;
  
  if (dateRange && dateRange[0] && dateRange[1]) {
    // Use the provided date range to define periods
    const [rangeStart, rangeEnd] = dateRange;
    
    // For daily: use the range start/end dates
    todayStart = startOfDay(rangeStart);
    todayEnd = endOfDay(rangeEnd);
    
    // For weekly: use the week containing the range
    weekStart = startOfWeek(rangeStart, { weekStartsOn: 1 }); // Monday
    weekEnd = endOfWeek(rangeEnd, { weekStartsOn: 1 });
    
    // For monthly: use the month containing the range
    monthStart = startOfMonth(rangeStart);
    monthEnd = endOfMonth(rangeEnd);
  } else {
    // Use current date periods
    const now = new Date();
    todayStart = startOfDay(now);
    todayEnd = endOfDay(now);
    weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    monthStart = startOfMonth(now);
    monthEnd = endOfMonth(now);
  }
  
  console.log('Time periods:', {
    today: { start: todayStart.toISOString(), end: todayEnd.toISOString() },
    week: { start: weekStart.toISOString(), end: weekEnd.toISOString() },
    month: { start: monthStart.toISOString(), end: monthEnd.toISOString() }
  });
  
  let dailyCount = 0, weeklyCount = 0, monthlyCount = 0;
  
  // First, filter samples to only include those with valid data
  const validSamples = samples.filter(sample => {
    // Get the sample's timestamp - try multiple fields with proper type checking
    const timestamp = sample.requested_at || 
                     ('time_requested' in sample ? (sample as any).time_requested : undefined) ||
                     (sample.created_at && typeof sample.created_at === 'object' && 'seconds' in sample.created_at 
                      ? new Date((sample.created_at as any).seconds * 1000).toISOString() 
                      : sample.created_at);
    
    // Check if we have a timestamp and at least one event time with proper type checking
    const hasTimestamp = !!timestamp;
    const hasEvents = !!(
      ('accepted_collection_at' in sample ? (sample as any).accepted_collection_at : undefined) || 
      ('driver_assigned_at' in sample ? (sample as any).driver_assigned_at : undefined) ||
      ('collected_at' in sample ? (sample as any).collected_at : undefined) || 
      ('time_collected' in sample ? (sample as any).time_collected : undefined) ||
      sample.time_registered || 
      ('registered_at' in sample ? (sample as any).registered_at : undefined) ||
      ('received_at' in sample ? (sample as any).received_at : undefined) || 
      ('completed_at' in sample ? (sample as any).completed_at : undefined) || 
      sample.delivered_at
    );
    
    const isValid = hasTimestamp && hasEvents;
    if (!isValid) {
      console.log(`Sample ${sample.id} filtered out - timestamp: ${!!hasTimestamp}, events: ${!!hasEvents}`);
    }
    
    return isValid;
  });
  
  console.log(`Filtered ${samples.length} samples down to ${validSamples.length} valid samples`);
  
  // Process each sample
  validSamples.forEach((sample, index) => {
    // Get timestamp to determine time period - try multiple fields with proper type checking
    let sampleTimestamp = sample.requested_at || 
                         ('time_requested' in sample ? (sample as any).time_requested : undefined) || 
                         sample.created_at;
    if (!sampleTimestamp) {
      console.log(`Sample ${index} has no timestamp:`, sample);
      return;
    }
    
    // Calculate TAT metrics for this sample
    try {
      const tatMetrics = calculateTAT(sample as SampleCollection | TimelineSamples);
      
      // Parse the timestamp properly
      const parsedTimestamp = parseTimestamp(sampleTimestamp);
      if (!parsedTimestamp) {
        console.log(`Sample ${sample.id} has invalid timestamp:`, sampleTimestamp);
        return;
      }
      
      // Add to daily stats if sample is within daily period
      if (isInTimeRange(parsedTimestamp, todayStart, todayEnd)) {
        console.log(`Sample ${sample.id} is within daily period`);
        dailyCount++;
        
        // Update all metrics for daily stats
        updatePeriodStats(stats.daily, tatMetrics);
      }
      
      // Add to weekly stats if sample is within weekly period
      if (isInTimeRange(parsedTimestamp, weekStart, weekEnd)) {
        console.log(`Sample ${sample.id} is within weekly period`);
        weeklyCount++;
        
        // Update all metrics for weekly stats
        updatePeriodStats(stats.weekly, tatMetrics);
      }
      
      // Add to monthly stats if sample is within monthly period
      if (isInTimeRange(parsedTimestamp, monthStart, monthEnd)) {
        console.log(`Sample ${sample.id} is within monthly period`);
        monthlyCount++;
        
        // Update all metrics for monthly stats
        updatePeriodStats(stats.monthly, tatMetrics);
      }
    } catch (error) {
      console.error(`Error calculating TAT for sample ${index}:`, error, sample);
    }
  });
  
  console.log('Sample counts by period:', {
    daily: dailyCount,
    weekly: weeklyCount,
    monthly: monthlyCount
  });
  
  // If we don't have data for certain periods, don't use fallback data
  // Let the UI handle empty states properly
  console.log('Raw stats before formatting:', JSON.stringify(stats, null, 2));
  
  // Calculate averages and format for display
  const periods = ['daily', 'weekly', 'monthly'] as const;
  const metrics = ['dispatch', 'collection', 'registration', 'processing', 'delivery'] as const;
  
  periods.forEach(period => {
    metrics.forEach(metric => {
      const { rawMinutes, count } = stats[period][metric];
      if (count > 0) {
        const avgMinutes = Math.round(rawMinutes / count);
        stats[period][metric].current = formatMinutes(avgMinutes);
      } else {
        // Set to "No Data" instead of fallback values
        stats[period][metric].current = "No Data";
      }
    });
  });
  
  console.log('Final stats after formatting:', JSON.stringify(stats, null, 2));
  
  return stats;
};

// Helper function to update period stats with TAT metrics
const updatePeriodStats = (periodStats: any, tatMetrics: any) => {
  // Update dispatch time stats
  if (tatMetrics.rawMinutes.dispatch > 0) {
    periodStats.dispatch.rawMinutes += tatMetrics.rawMinutes.dispatch;
    periodStats.dispatch.count++;
  }
  
  // Update collection time stats
  if (tatMetrics.rawMinutes.collection > 0) {
    periodStats.collection.rawMinutes += tatMetrics.rawMinutes.collection;
    periodStats.collection.count++;
  }
  
  // Update registration time stats
  if (tatMetrics.rawMinutes.registration > 0) {
    periodStats.registration.rawMinutes += tatMetrics.rawMinutes.registration;
    periodStats.registration.count++;
  }
  
  // Update processing time stats
  if (tatMetrics.rawMinutes.processing > 0) {
    periodStats.processing.rawMinutes += tatMetrics.rawMinutes.processing;
    periodStats.processing.count++;
  }
  
  // Update delivery time stats
  if (tatMetrics.rawMinutes.delivery > 0) {
    periodStats.delivery.rawMinutes += tatMetrics.rawMinutes.delivery;
    periodStats.delivery.count++;
  }
};

export const calculateTATxScore = (targetTAT: number, actualTAT: number): number => {
  if (actualTAT <= 0) return 0;
  // Cap TATx score at 100%
  return Math.min(100, (targetTAT / actualTAT) * 100);
}; 