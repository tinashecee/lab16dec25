import { Timestamp } from "firebase/firestore";

// Test-Material Mapping Configuration
export interface TestMaterialMapping {
  id: string;
  testId: string;
  testName: string;
  testCategory: string;
  materials: MaterialRequirement[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  isActive: boolean;
}

export interface MaterialRequirement {
  productId: string;
  productName: string;
  productCode: string;
  category: string;
  expectedQuantity: number;
  unit: string;
  unitPrice: number;
  isConsumable: boolean; // Whether the material is consumed during the test
  notes?: string;
}

// Actual Usage Tracking
export interface MaterialUsage {
  id: string;
  sampleId: string;
  accessionNumber: string;
  testId: string;
  testName: string;
  testCategory: string;
  productId: string;
  productName: string;
  productCode: string;
  expectedQuantity: number;
  actualQuantity: number;
  unit: string;
  unitPrice: number;
  totalCost: number;
  usedBy: string;
  usedAt: Timestamp;
  notes?: string;
  wastage?: number; // Difference between expected and actual
  wastageReason?: string;
}

// Usage Analysis and Reports
export interface UsageAnalysis {
  period: {
    startDate: Date;
    endDate: Date;
  };
  totalTests: number;
  totalMaterialsUsed: number;
  totalCost: number;
  averageWastage: number;
  topWastageProducts: WastageAnalysis[];
  testEfficiency: TestEfficiency[];
  costAnalysis: CostAnalysis;
  trends: UsageTrend[];
}

export interface WastageAnalysis {
  productId: string;
  productName: string;
  productCode: string;
  category: string;
  expectedQuantity: number;
  actualQuantity: number;
  wastage: number;
  wastagePercentage: number;
  totalCost: number;
  wastageCost: number;
  testCount: number;
}

export interface TestEfficiency {
  testId: string;
  testName: string;
  testCategory: string;
  totalTests: number;
  averageWastage: number;
  efficiencyScore: number; // 0-100, higher is better
  materials: MaterialEfficiency[];
}

export interface MaterialEfficiency {
  productId: string;
  productName: string;
  expectedQuantity: number;
  actualQuantity: number;
  wastage: number;
  wastagePercentage: number;
}

export interface CostAnalysis {
  totalExpectedCost: number;
  totalActualCost: number;
  totalWastageCost: number;
  costVariance: number;
  costVariancePercentage: number;
  byCategory: CategoryCostAnalysis[];
  byTest: TestCostAnalysis[];
}

export interface CategoryCostAnalysis {
  category: string;
  expectedCost: number;
  actualCost: number;
  wastageCost: number;
  testCount: number;
}

export interface TestCostAnalysis {
  testId: string;
  testName: string;
  expectedCost: number;
  actualCost: number;
  wastageCost: number;
  testCount: number;
}

export interface UsageTrend {
  date: Date;
  testsPerformed: number;
  materialsUsed: number;
  totalCost: number;
  averageWastage: number;
}

// Dashboard Metrics
export interface UsageMetrics {
  today: {
    testsPerformed: number;
    materialsUsed: number;
    totalCost: number;
    averageWastage: number;
  };
  thisWeek: {
    testsPerformed: number;
    materialsUsed: number;
    totalCost: number;
    averageWastage: number;
    trend: 'up' | 'down' | 'stable';
  };
  thisMonth: {
    testsPerformed: number;
    materialsUsed: number;
    totalCost: number;
    averageWastage: number;
    trend: 'up' | 'down' | 'stable';
  };
  topWastageProducts: WastageAnalysis[];
  leastEfficientTests: TestEfficiency[];
}

// Filters and Search
export interface UsageTrackingFilters {
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  testCategory?: string;
  testId?: string;
  productCategory?: string;
  productId?: string;
  department?: string;
  technician?: string;
  wastageThreshold?: number; // Minimum wastage percentage to show
}

// Alerts and Notifications
export interface UsageAlert {
  id: string;
  type: 'high_wastage' | 'unusual_usage' | 'low_stock' | 'cost_overrun';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  productId?: string;
  testId?: string;
  threshold?: number;
  actualValue?: number;
  createdAt: Timestamp;
  isRead: boolean;
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Timestamp;
}

// Configuration for automated tracking
export interface UsageTrackingConfig {
  id: string;
  autoTrackUsage: boolean;
  wastageThresholds: {
    low: number;    // Percentage
    medium: number;
    high: number;
    critical: number;
  };
  alertSettings: {
    enableAlerts: boolean;
    emailNotifications: boolean;
    dashboardNotifications: boolean;
  };
  reportingSettings: {
    defaultPeriod: 'daily' | 'weekly' | 'monthly';
    includeWastageAnalysis: boolean;
    includeCostAnalysis: boolean;
    includeTrendAnalysis: boolean;
  };
  updatedAt: Timestamp;
  updatedBy: string;
}
