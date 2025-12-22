import { db } from "../config/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  getDoc,
  writeBatch,
  runTransaction,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import {
  TestMaterialMapping,
  MaterialUsage,
  UsageAnalysis,
  UsageMetrics,
  UsageTrackingFilters,
  UsageAlert,
  UsageTrackingConfig,
  WastageAnalysis,
  TestEfficiency,
} from "../types/usageTracking";

// Collection References
const testMappingsRef = collection(db, "testMaterialMappings");
const materialUsageRef = collection(db, "materialUsage");
const usageAlertsRef = collection(db, "usageAlerts");
const usageConfigRef = collection(db, "usageTrackingConfig");

// Test-Material Mapping Functions
export const addTestMaterialMapping = async (
  mapping: Omit<TestMaterialMapping, "id" | "createdAt" | "updatedAt">
) => {
  const timestamp = Timestamp.now();
  const newMapping = {
    ...mapping,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return await addDoc(testMappingsRef, newMapping);
};

export const updateTestMaterialMapping = async (
  id: string,
  updates: Partial<TestMaterialMapping>
) => {
  const mappingRef = doc(db, "testMaterialMappings", id);
  await updateDoc(mappingRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
};

export const deleteTestMaterialMapping = async (id: string) => {
  const mappingRef = doc(db, "testMaterialMappings", id);
  await deleteDoc(mappingRef);
};

export const getTestMaterialMappings = async (): Promise<TestMaterialMapping[]> => {
  const q = query(testMappingsRef, where("isActive", "==", true));
  const snapshot = await getDocs(q);
  const mappings = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as TestMaterialMapping[];
  
  // Sort by testName in memory to avoid composite index requirement
  return mappings.sort((a, b) => a.testName.localeCompare(b.testName));
};

export const getTestMaterialMapping = async (
  testId: string
): Promise<TestMaterialMapping | null> => {
  const q = query(
    testMappingsRef,
    where("testId", "==", testId),
    where("isActive", "==", true)
  );
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return null;
  }
  
  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as TestMaterialMapping;
};

// Material Usage Tracking Functions
export const recordMaterialUsage = async (
  usage: Omit<MaterialUsage, "id" | "usedAt">
) => {
  const timestamp = Timestamp.now();
  const newUsage = {
    ...usage,
    usedAt: timestamp,
  };

  return await addDoc(materialUsageRef, newUsage);
};

export const getMaterialUsage = async (
  filters?: UsageTrackingFilters,
  lastDoc?: QueryDocumentSnapshot<DocumentData>
): Promise<{
  usage: MaterialUsage[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}> => {
  let q = query(materialUsageRef, orderBy("usedAt", "desc"), limit(50));

  if (filters) {
    const conditions = [];
    
    if (filters.dateRange) {
      conditions.push(where("usedAt", ">=", Timestamp.fromDate(filters.dateRange.startDate)));
      conditions.push(where("usedAt", "<=", Timestamp.fromDate(filters.dateRange.endDate)));
    }
    
    if (filters.testId) {
      conditions.push(where("testId", "==", filters.testId));
    }
    
    if (filters.productId) {
      conditions.push(where("productId", "==", filters.productId));
    }
    
    if (filters.technician) {
      conditions.push(where("usedBy", "==", filters.technician));
    }

    if (conditions.length > 0) {
      q = query(materialUsageRef, ...conditions, orderBy("usedAt", "desc"), limit(50));
    }
  }

  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }

  const snapshot = await getDocs(q);
  const usage = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as MaterialUsage[];

  return {
    usage,
    lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
    hasMore: snapshot.docs.length === 50,
  };
};

// Usage Analysis Functions
export const getUsageAnalysis = async (
  startDate: Date,
  endDate: Date,
  filters?: Partial<UsageTrackingFilters>
): Promise<UsageAnalysis> => {
  const startTimestamp = Timestamp.fromDate(startDate);
  const endTimestamp = Timestamp.fromDate(endDate);

  let q = query(
    materialUsageRef,
    where("usedAt", ">=", startTimestamp),
    where("usedAt", "<=", endTimestamp)
  );

  if (filters?.testId) {
    q = query(q, where("testId", "==", filters.testId));
  }

  if (filters?.productId) {
    q = query(q, where("productId", "==", filters.productId));
  }

  const snapshot = await getDocs(q);
  const usageData = snapshot.docs.map((doc) => doc.data()) as MaterialUsage[];

  // Calculate analysis
  const totalTests = new Set(usageData.map(u => u.sampleId)).size;
  const totalMaterialsUsed = usageData.length;
  const totalCost = usageData.reduce((sum, u) => sum + u.totalCost, 0);
  
  const wastageData = usageData.map(u => ({
    wastage: u.actualQuantity - u.expectedQuantity,
    wastagePercentage: ((u.actualQuantity - u.expectedQuantity) / u.expectedQuantity) * 100,
  }));
  
  const averageWastage = wastageData.reduce((sum, w) => sum + w.wastagePercentage, 0) / wastageData.length || 0;

  // Top wastage products
  const productWastage = new Map<string, WastageAnalysis>();
  usageData.forEach(u => {
    const key = u.productId;
    if (!productWastage.has(key)) {
      productWastage.set(key, {
        productId: u.productId,
        productName: u.productName,
        productCode: u.productCode,
        category: u.testCategory, // Using test category as fallback
        expectedQuantity: 0,
        actualQuantity: 0,
        wastage: 0,
        wastagePercentage: 0,
        totalCost: 0,
        wastageCost: 0,
        testCount: 0,
      });
    }
    
    const existing = productWastage.get(key)!;
    existing.expectedQuantity += u.expectedQuantity;
    existing.actualQuantity += u.actualQuantity;
    existing.wastage += (u.actualQuantity - u.expectedQuantity);
    existing.totalCost += u.totalCost;
    existing.wastageCost += (u.actualQuantity - u.expectedQuantity) * u.unitPrice;
    existing.testCount += 1;
  });

  const topWastageProducts = Array.from(productWastage.values())
    .map(p => ({
      ...p,
      wastagePercentage: (p.wastage / p.expectedQuantity) * 100,
    }))
    .sort((a, b) => b.wastagePercentage - a.wastagePercentage)
    .slice(0, 10);

  // Test efficiency
  const testEfficiency = new Map<string, TestEfficiency>();
  usageData.forEach(u => {
    const key = u.testId;
    if (!testEfficiency.has(key)) {
      testEfficiency.set(key, {
        testId: u.testId,
        testName: u.testName,
        testCategory: u.testCategory,
        totalTests: 0,
        averageWastage: 0,
        efficiencyScore: 0,
        materials: [],
      });
    }
    
    const existing = testEfficiency.get(key)!;
    existing.totalTests += 1;
  });

  const testEfficiencyArray = Array.from(testEfficiency.values())
    .map(t => {
      const testUsage = usageData.filter(u => u.testId === t.testId);
      const totalWastage = testUsage.reduce((sum, u) => sum + (u.actualQuantity - u.expectedQuantity), 0);
      const totalExpected = testUsage.reduce((sum, u) => sum + u.expectedQuantity, 0);
      t.averageWastage = totalExpected > 0 ? (totalWastage / totalExpected) * 100 : 0;
      t.efficiencyScore = Math.max(0, 100 - t.averageWastage);
      
      // Material efficiency for this test
      const materialMap = new Map<string, any>();
      testUsage.forEach(u => {
        if (!materialMap.has(u.productId)) {
          materialMap.set(u.productId, {
            productId: u.productId,
            productName: u.productName,
            expectedQuantity: 0,
            actualQuantity: 0,
            wastage: 0,
            wastagePercentage: 0,
          });
        }
        const mat = materialMap.get(u.productId);
        mat.expectedQuantity += u.expectedQuantity;
        mat.actualQuantity += u.actualQuantity;
        mat.wastage += (u.actualQuantity - u.expectedQuantity);
      });
      
      t.materials = Array.from(materialMap.values()).map(m => ({
        ...m,
        wastagePercentage: m.expectedQuantity > 0 ? (m.wastage / m.expectedQuantity) * 100 : 0,
      }));
      
      return t;
    })
    .sort((a, b) => a.efficiencyScore - b.efficiencyScore);

  // Cost analysis
  const totalExpectedCost = usageData.reduce((sum, u) => sum + (u.expectedQuantity * u.unitPrice), 0);
  const totalActualCost = usageData.reduce((sum, u) => sum + u.totalCost, 0);
  const totalWastageCost = usageData.reduce((sum, u) => sum + ((u.actualQuantity - u.expectedQuantity) * u.unitPrice), 0);
  const costVariance = totalActualCost - totalExpectedCost;
  const costVariancePercentage = totalExpectedCost > 0 ? (costVariance / totalExpectedCost) * 100 : 0;

  // Category cost analysis
  const categoryCosts = new Map<string, any>();
  usageData.forEach(u => {
    if (!categoryCosts.has(u.testCategory)) {
      categoryCosts.set(u.testCategory, {
        category: u.testCategory,
        expectedCost: 0,
        actualCost: 0,
        wastageCost: 0,
        testCount: 0,
      });
    }
    const cat = categoryCosts.get(u.testCategory);
    cat.expectedCost += u.expectedQuantity * u.unitPrice;
    cat.actualCost += u.totalCost;
    cat.wastageCost += (u.actualQuantity - u.expectedQuantity) * u.unitPrice;
    cat.testCount += 1;
  });

  // Test cost analysis
  const testCosts = new Map<string, any>();
  usageData.forEach(u => {
    if (!testCosts.has(u.testId)) {
      testCosts.set(u.testId, {
        testId: u.testId,
        testName: u.testName,
        expectedCost: 0,
        actualCost: 0,
        wastageCost: 0,
        testCount: 0,
      });
    }
    const test = testCosts.get(u.testId);
    test.expectedCost += u.expectedQuantity * u.unitPrice;
    test.actualCost += u.totalCost;
    test.wastageCost += (u.actualQuantity - u.expectedQuantity) * u.unitPrice;
    test.testCount += 1;
  });

  // Usage trends (daily aggregation)
  const dailyTrends = new Map<string, any>();
  usageData.forEach(u => {
    const dateKey = u.usedAt.toDate().toISOString().split('T')[0];
    if (!dailyTrends.has(dateKey)) {
      dailyTrends.set(dateKey, {
        date: u.usedAt.toDate(),
        testsPerformed: new Set(),
        materialsUsed: 0,
        totalCost: 0,
        totalWastage: 0,
        totalExpected: 0,
      });
    }
    const day = dailyTrends.get(dateKey);
    day.testsPerformed.add(u.sampleId);
    day.materialsUsed += 1;
    day.totalCost += u.totalCost;
    day.totalWastage += (u.actualQuantity - u.expectedQuantity);
    day.totalExpected += u.expectedQuantity;
  });

  const trends = Array.from(dailyTrends.values())
    .map(t => ({
      date: t.date,
      testsPerformed: t.testsPerformed.size,
      materialsUsed: t.materialsUsed,
      totalCost: t.totalCost,
      averageWastage: t.totalExpected > 0 ? (t.totalWastage / t.totalExpected) * 100 : 0,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return {
    period: { startDate, endDate },
    totalTests,
    totalMaterialsUsed,
    totalCost,
    averageWastage,
    topWastageProducts,
    testEfficiency: testEfficiencyArray,
    costAnalysis: {
      totalExpectedCost,
      totalActualCost,
      totalWastageCost,
      costVariance,
      costVariancePercentage,
      byCategory: Array.from(categoryCosts.values()),
      byTest: Array.from(testCosts.values()),
    },
    trends,
  };
};

// Usage Metrics for Dashboard
export const getUsageMetrics = async (): Promise<UsageMetrics> => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayUsage, weekUsage, monthUsage] = await Promise.all([
    getUsageAnalysis(today, now),
    getUsageAnalysis(weekStart, now),
    getUsageAnalysis(monthStart, now),
  ]);

  // Calculate trends (simplified - compare with previous periods)
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(weekStart.getDate() - 7);
  const lastWeekEnd = new Date(weekStart);
  
  const lastMonthStart = new Date(monthStart);
  lastMonthStart.setMonth(monthStart.getMonth() - 1);
  const lastMonthEnd = new Date(monthStart);

  const [lastWeekUsage, lastMonthUsage] = await Promise.all([
    getUsageAnalysis(lastWeekStart, lastWeekEnd),
    getUsageAnalysis(lastMonthStart, lastMonthEnd),
  ]);

  const weekTrend = weekUsage.totalCost > lastWeekUsage.totalCost ? 'up' : 
                   weekUsage.totalCost < lastWeekUsage.totalCost ? 'down' : 'stable';
  
  const monthTrend = monthUsage.totalCost > lastMonthUsage.totalCost ? 'up' : 
                    monthUsage.totalCost < lastMonthUsage.totalCost ? 'down' : 'stable';

  return {
    today: {
      testsPerformed: todayUsage.totalTests,
      materialsUsed: todayUsage.totalMaterialsUsed,
      totalCost: todayUsage.totalCost,
      averageWastage: todayUsage.averageWastage,
    },
    thisWeek: {
      testsPerformed: weekUsage.totalTests,
      materialsUsed: weekUsage.totalMaterialsUsed,
      totalCost: weekUsage.totalCost,
      averageWastage: weekUsage.averageWastage,
      trend: weekTrend,
    },
    thisMonth: {
      testsPerformed: monthUsage.totalTests,
      materialsUsed: monthUsage.totalMaterialsUsed,
      totalCost: monthUsage.totalCost,
      averageWastage: monthUsage.averageWastage,
      trend: monthTrend,
    },
    topWastageProducts: weekUsage.topWastageProducts.slice(0, 5),
    leastEfficientTests: weekUsage.testEfficiency.slice(0, 5),
  };
};

// Alert Functions
export const createUsageAlert = async (alert: Omit<UsageAlert, "id" | "createdAt">) => {
  const timestamp = Timestamp.now();
  const newAlert = {
    ...alert,
    createdAt: timestamp,
  };

  return await addDoc(usageAlertsRef, newAlert);
};

export const getUsageAlerts = async (unreadOnly: boolean = false): Promise<UsageAlert[]> => {
  let q = query(usageAlertsRef, orderBy("createdAt", "desc"));
  
  if (unreadOnly) {
    q = query(q, where("isRead", "==", false));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as UsageAlert[];
};

export const markAlertAsRead = async (alertId: string) => {
  const alertRef = doc(db, "usageAlerts", alertId);
  await updateDoc(alertRef, { isRead: true });
};

export const resolveAlert = async (alertId: string, resolvedBy: string) => {
  const alertRef = doc(db, "usageAlerts", alertId);
  await updateDoc(alertRef, {
    isResolved: true,
    resolvedBy,
    resolvedAt: Timestamp.now(),
  });
};

// Configuration Functions
export const getUsageTrackingConfig = async (): Promise<UsageTrackingConfig | null> => {
  const snapshot = await getDocs(usageConfigRef);
  
  if (snapshot.empty) {
    return null;
  }
  
  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as UsageTrackingConfig;
};

export const updateUsageTrackingConfig = async (config: Partial<UsageTrackingConfig>) => {
  const snapshot = await getDocs(usageConfigRef);
  
  if (snapshot.empty) {
    // Create new config
    const newConfig = {
      ...config,
      updatedAt: Timestamp.now(),
    };
    return await addDoc(usageConfigRef, newConfig);
  } else {
    // Update existing config
    const doc = snapshot.docs[0];
    const configRef = doc.ref;
    await updateDoc(configRef, {
      ...config,
      updatedAt: Timestamp.now(),
    });
    return doc.id;
  }
};
