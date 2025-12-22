import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where, orderBy, startAfter, limit, Timestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { SampleCollection } from '../../../services/sampleCollectionService';
import { calculateTAT } from '../../../utils/tatCalculations';
import { startOfDay, startOfWeek, startOfMonth, startOfQuarter, startOfYear, endOfDay, endOfWeek, endOfMonth, endOfQuarter, endOfYear, isAfter, isWithinInterval, parseISO } from 'date-fns';

export interface FilterState {
  period: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom-month' | 'all';
  selectedMonth?: Date;
}

export interface TestModalData {
  testID: string;
  testName: string;
  normalTAT: number;
  urgentTAT: number;
  normalTests: number;
  urgentTests: number;
  averageNormalTAT: string;
  averageUrgentTAT: string;
  normalTatxScore: string;
  urgentTatxScore: string;
  overallTatxScore: string;
}

export interface TATxAnalysisData {
  totalTests: number;
  testsMonth: number | null;
  testsWeek: number | null;
  testsToday: number | null;
  uniqueCenters: number;
  centersMonth: number;
  centersWeek: number;
  centersToday: number;
  tatxScore: string | null;
  testsModalData: TestModalData[];
}

// Helper to parse TAT string (DD:HH:MM:SS or HH:MM:SS) to hours
function parseTATString(tatString: string | undefined | null): number | null {
  if (!tatString) return null;
  const parts = tatString.split(':').map(Number);
  if (parts.length === 4) {
    // DD:HH:MM:SS format
    const [days, hours, minutes, seconds] = parts;
    return days * 24 + hours + minutes / 60 + seconds / 3600;
  } else if (parts.length === 3) {
    // HH:MM:SS format
    const [hours, minutes, seconds] = parts;
    return hours + minutes / 60 + seconds / 3600;
  }
  return null;
}

// Helper function to get date range based on filter
function getDateRange(filterState: FilterState): { start: Date; end: Date } | null {
  const now = new Date();
  
  switch (filterState.period) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'quarter':
      return { start: startOfQuarter(now), end: endOfQuarter(now) };
    case 'year':
      return { start: startOfYear(now), end: endOfYear(now) };
    case 'custom-month':
      if (filterState.selectedMonth) {
        return { 
          start: startOfMonth(filterState.selectedMonth), 
          end: endOfMonth(filterState.selectedMonth) 
        };
      }
      return null;
    case 'all':
    default:
      return null;
  }
}

// Helper function to check if a sample falls within the filter range
function isInFilterRange(sampleDate: Date, filterState: FilterState): boolean {
  const range = getDateRange(filterState);
  if (!range) return true;
  return isWithinInterval(sampleDate, range);
}

// Calculate TATx Score
// TATx Score = (Target TAT ÷ Actual TAT) × 100%
// Scores > 100% indicate excellent performance (faster than target)
// Scores < 100% indicate poor performance (slower than target)
function calculateTatxScore(targetTAT: number, actualTAT: number): number {
  if (isNaN(targetTAT) || isNaN(actualTAT) || targetTAT <= 0 || actualTAT <= 0) {
    return 0;
  }
  const score = (targetTAT / actualTAT) * 100;
  return isNaN(score) ? 0 : score; // ✅ No cap - allow scores > 100% for excellent performance
}

// Format TATx Score with % symbol
function formatTatxScore(score: number | null): string {
  if (score === null || isNaN(score)) return 'N/A';
  return `${score.toFixed(1)}%`;
}

/**
 * Optimized hook to fetch and calculate TATx Analysis data
 * Uses TanStack Query for caching and optimized data fetching
 */
export function useTATxAnalysis(filter: FilterState) {
  return useQuery({
    queryKey: ['tatxAnalysis', filter],
    queryFn: async (): Promise<TATxAnalysisData> => {
      const dateRange = getDateRange(filter);
      
      // Fetch delivered samples with optimized queries
      let allSamples: SampleCollection[] = [];
      let lastDoc = undefined;
      let hasMore = true;
      
      // Fetch test map first (can be cached separately)
      const testsSnapshot = await getDocs(collection(db, 'tests'));
      const testMap: Record<string, { normalTAT: number | null, urgentTAT: number | null, name: string }> = {};
      testsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const normalTAT = data.normalTAT ? parseTATString(data.normalTAT) : 4;
        const urgentTAT = data.urgentTAT ? parseTATString(data.urgentTAT) : 2;
        testMap[doc.id] = {
          normalTAT: normalTAT,
          urgentTAT: urgentTAT,
          name: data.testName || data.name || 'Unknown Test'
        };
      });
      
      // Fetch samples with pagination
      while (hasMore) {
        let q = query(
          collection(db, 'collectionRequests'),
          where('status', '==', 'delivered'),
          orderBy('created_at', 'desc'),
          limit(100)
        );
        
        // Add date filtering at database level when not "all"
        if (dateRange && filter.period !== 'all') {
          const startTimestamp = Timestamp.fromDate(dateRange.start);
          const endTimestamp = Timestamp.fromDate(dateRange.end);
          
          q = query(
            collection(db, 'collectionRequests'),
            where('status', '==', 'delivered'),
            where('created_at', '>=', startTimestamp),
            where('created_at', '<=', endTimestamp),
            orderBy('created_at', 'desc'),
            limit(100)
          );
        }
        
        if (lastDoc) {
          q = query(q, startAfter(lastDoc));
        }
        
        const snapshot = await getDocs(q);
        const samples = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as SampleCollection[];
        
        allSamples = allSamples.concat(samples);
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
        hasMore = snapshot.docs.length === 100;
      }
      
      // Process samples
      const routineTATs: number[] = [];
      const urgentTATs: number[] = [];
      
      const testStatsByName: Record<string, { 
        testIDs: string[];
        normalTAT: number;
        urgentTAT: number;
        normalTests: number;
        urgentTests: number;
        normalTotalTAT: number;
        urgentTotalTAT: number;
        normalTargetTAT: number;
        urgentTargetTAT: number;
      }> = {};
      
      const centerSet = new Set<string>();
      const centerSetMonth = new Set<string>();
      const centerSetWeek = new Set<string>();
      const centerSetToday = new Set<string>();
      const now = new Date();
      const monthStart = startOfMonth(now);
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const todayStart = startOfDay(now);
      let countMonth = 0, countWeek = 0, countToday = 0;
      let filteredSamplesCount = 0;
      
      allSamples.forEach((sample: SampleCollection) => {
        const dateStr = sample.requested_at || sample.created_at;
        if (!dateStr) return;
        const date = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr.seconds * 1000);
        
        if (!isInFilterRange(date, filter)) {
          return;
        }
        
        filteredSamplesCount++;
        
        // Process centers and date-based stats
        if (sample.center_name) {
          centerSet.add(sample.center_name);
          if (isAfter(date, monthStart) || date.getTime() === monthStart.getTime()) centerSetMonth.add(sample.center_name);
          if (isAfter(date, weekStart) || date.getTime() === weekStart.getTime()) centerSetWeek.add(sample.center_name);
          if (isAfter(date, todayStart) || date.getTime() === todayStart.getTime()) centerSetToday.add(sample.center_name);
        }
        if (isAfter(date, monthStart) || date.getTime() === monthStart.getTime()) countMonth++;
        if (isAfter(date, weekStart) || date.getTime() === weekStart.getTime()) countWeek++;
        if (isAfter(date, todayStart) || date.getTime() === todayStart.getTime()) countToday++;
        
        // Get TAT for completed samples
        if (sample.requested_at && sample.delivered_at) {
          const tat = calculateTAT(sample);
          if (typeof tat.rawMinutes.total === 'number' && tat.rawMinutes.total > 0) {
            const tatHours = tat.rawMinutes.total / 60;
            
            const testID = (sample as SampleCollection & { testID?: string | string[] }).testID || 'unknown';
            const testIDs = Array.isArray(testID) ? testID : [testID];
            const testName = (sample as SampleCollection & { testName?: string | string[] }).testName || 
              (Array.isArray(testID) ? testID.map(id => testMap[id]?.name || 'Unknown').join(', ') : 'Unknown Test');
            const testNames = Array.isArray(testName) ? testName : [testName];
            
            const isUrgent = (sample.priority === 'urgent' || 
                             (sample.priority as string) === 'STAT' ||
                             (sample as SampleCollection & { urgencyLevel?: string }).urgencyLevel === 'urgent');
            
            if (isUrgent) {
              urgentTATs.push(tat.rawMinutes.total);
            } else {
              routineTATs.push(tat.rawMinutes.total);
            }
            
            let normalTAT = 4;
            let urgentTAT = 2;
            
            for (const id of testIDs) {
              if (testMap[id]) {
                normalTAT = testMap[id].normalTAT || 4;
                urgentTAT = testMap[id].urgentTAT || 2;
                break;
              }
            }
            
            testNames.forEach((name, index) => {
              if (!testStatsByName[name]) {
                testStatsByName[name] = {
                  testIDs: [],
                  normalTAT: normalTAT,
                  urgentTAT: urgentTAT,
                  normalTests: 0,
                  urgentTests: 0,
                  normalTotalTAT: 0,
                  urgentTotalTAT: 0,
                  normalTargetTAT: 0,
                  urgentTargetTAT: 0
                };
              }
              
              const currentTestID = testIDs[index] || testIDs[0];
              if (!testStatsByName[name].testIDs.includes(currentTestID)) {
                testStatsByName[name].testIDs.push(currentTestID);
              }
              
              if (isUrgent) {
                testStatsByName[name].urgentTests++;
                testStatsByName[name].urgentTotalTAT += tatHours;
                testStatsByName[name].urgentTargetTAT += urgentTAT;
              } else {
                testStatsByName[name].normalTests++;
                testStatsByName[name].normalTotalTAT += tatHours;
                testStatsByName[name].normalTargetTAT += normalTAT;
              }
            });
          }
        }
      });
      
      // Calculate overall TATx score
      let totalTargetTAT = 0;
      let totalActualTAT = 0;
      let testsWithTAT = 0;
      
      Object.values(testStatsByName).forEach(test => {
        totalTargetTAT += test.normalTargetTAT + test.urgentTargetTAT;
        totalActualTAT += test.normalTotalTAT + test.urgentTotalTAT;
        testsWithTAT += test.normalTests + test.urgentTests;
      });
      
      const overallTatxScore = testsWithTAT > 0 && totalActualTAT > 0 
        ? calculateTatxScore(totalTargetTAT, totalActualTAT)
        : null;
      
      // Prepare modal test data
      const modalTestData = Object.entries(testStatsByName).map(([testName, test]) => {
        const normalAvgTAT = test.normalTests > 0 ? test.normalTotalTAT / test.normalTests : 0;
        const urgentAvgTAT = test.urgentTests > 0 ? test.urgentTotalTAT / test.urgentTests : 0;
        
        const normalTatxScore = test.normalTests > 0 && normalAvgTAT > 0 ? 
          calculateTatxScore(test.normalTAT, normalAvgTAT) : 0;
        const urgentTatxScore = test.urgentTests > 0 && urgentAvgTAT > 0 ? 
          calculateTatxScore(test.urgentTAT, urgentAvgTAT) : null;
        
        const totalTests = test.normalTests + test.urgentTests;
        const overallTatxScore = totalTests > 0 ? 
          ((normalTatxScore * test.normalTests) + ((urgentTatxScore || 0) * test.urgentTests)) / totalTests : 0;
        
        return {
          testID: test.testIDs.join(','),
          testName: testName,
          normalTAT: test.normalTAT,
          urgentTAT: test.urgentTAT,
          normalTests: test.normalTests,
          urgentTests: test.urgentTests,
          averageNormalTAT: normalAvgTAT.toFixed(1),
          averageUrgentTAT: test.urgentTests > 0 ? urgentAvgTAT.toFixed(1) : 'N/A',
          normalTatxScore: formatTatxScore(normalTatxScore),
          urgentTatxScore: urgentTatxScore !== null ? formatTatxScore(urgentTatxScore) : 'N/A',
          overallTatxScore: formatTatxScore(overallTatxScore)
        };
      });
      
      modalTestData.sort((a, b) => (b.normalTests + b.urgentTests) - (a.normalTests + a.urgentTests));
      
      return {
        totalTests: filteredSamplesCount,
        testsMonth: filter.period === 'all' ? countMonth : null,
        testsWeek: filter.period === 'all' ? countWeek : null,
        testsToday: filter.period === 'all' ? countToday : null,
        uniqueCenters: centerSet.size,
        centersMonth: centerSetMonth.size,
        centersWeek: centerSetWeek.size,
        centersToday: centerSetToday.size,
        tatxScore: formatTatxScore(overallTatxScore),
        testsModalData: modalTestData
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - TAT analysis doesn't need to be super fresh
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache longer
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch if data is still fresh
  });
}

