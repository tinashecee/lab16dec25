import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Package,
  TestTube,
  DollarSign,
  Calendar,
  Filter,
  Download,
  Settings,
  Eye,
  Plus,
} from "lucide-react";
import {
  UsageMetrics,
  UsageAnalysis,
  UsageTrackingFilters,
  TestMaterialMapping,
  MaterialUsage,
  UsageAlert,
} from "../../types/usageTracking";
import {
  getUsageMetrics,
  getUsageAnalysis,
  getMaterialUsage,
  getTestMaterialMappings,
  getUsageAlerts,
  markAlertAsRead,
} from "../../services/usageTrackingService";
import { useAuth } from "../../hooks/useAuth";

interface UsageTrackingProps {
  searchQuery: string;
}

export default function UsageTracking({ searchQuery }: UsageTrackingProps) {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState<"dashboard" | "analysis" | "mappings" | "usage" | "alerts">("dashboard");
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
  const [analysis, setAnalysis] = useState<UsageAnalysis | null>(null);
  const [mappings, setMappings] = useState<TestMaterialMapping[]>([]);
  const [usage, setUsage] = useState<MaterialUsage[]>([]);
  const [alerts, setAlerts] = useState<UsageAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<UsageTrackingFilters>({
    dateRange: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      endDate: new Date(),
    },
  });

  useEffect(() => {
    loadData();
  }, [activeTab, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      switch (activeTab) {
        case "dashboard":
          try {
            const metricsData = await getUsageMetrics();
            setMetrics(metricsData);
          } catch (error) {
            console.error("Error loading metrics:", error);
            // Set default empty metrics
            setMetrics({
              today: { testsPerformed: 0, materialsUsed: 0, totalCost: 0, averageWastage: 0 },
              thisWeek: { testsPerformed: 0, materialsUsed: 0, totalCost: 0, averageWastage: 0, trend: 'stable' },
              thisMonth: { testsPerformed: 0, materialsUsed: 0, totalCost: 0, averageWastage: 0, trend: 'stable' },
              topWastageProducts: [],
              leastEfficientTests: [],
            });
          }
          break;
        case "analysis":
          try {
            const analysisData = await getUsageAnalysis(filters.dateRange.startDate, filters.dateRange.endDate);
            setAnalysis(analysisData);
          } catch (error) {
            console.error("Error loading analysis:", error);
            setAnalysis(null);
          }
          break;
        case "mappings":
          try {
            const mappingsData = await getTestMaterialMappings();
            setMappings(mappingsData);
          } catch (error) {
            console.error("Error loading mappings:", error);
            setMappings([]);
          }
          break;
        case "usage":
          try {
            const usageData = await getMaterialUsage(filters);
            setUsage(usageData.usage);
          } catch (error) {
            console.error("Error loading usage:", error);
            setUsage([]);
          }
          break;
        case "alerts":
          try {
            const alertsData = await getUsageAlerts();
            setAlerts(alertsData);
          } catch (error) {
            console.error("Error loading alerts:", error);
            setAlerts([]);
          }
          break;
      }
    } catch (error) {
      console.error("Error loading usage tracking data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAlertRead = async (alertId: string) => {
    await markAlertAsRead(alertId);
    setAlerts(alerts.map(alert => 
      alert.id === alertId ? { ...alert, isRead: true } : alert
    ));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-green-500" />;
      default:
        return <div className="w-4 h-4 bg-gray-400 rounded-full" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Usage Tracking & Analysis</h2>
          <p className="text-sm text-gray-600">Monitor test performance and material usage efficiency</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800">
            <Download className="w-4 h-4" />
            Export Report
          </button>
          <button className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800">
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "dashboard", label: "Dashboard", icon: BarChart3 },
            { id: "analysis", label: "Analysis", icon: TrendingUp },
            { id: "mappings", label: "Test Mappings", icon: TestTube },
            { id: "usage", label: "Usage Records", icon: Package },
            { id: "alerts", label: "Alerts", icon: AlertTriangle },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm
                  ${
                    activeTab === tab.id
                      ? "border-primary-500 text-primary-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}>
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.id === "alerts" && alerts.filter(a => !a.isRead).length > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                    {alerts.filter(a => !a.isRead).length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <input
            type="date"
            value={filters.dateRange.startDate.toISOString().split('T')[0]}
            onChange={(e) => setFilters({
              ...filters,
              dateRange: {
                ...filters.dateRange,
                startDate: new Date(e.target.value),
              },
            })}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={filters.dateRange.endDate.toISOString().split('T')[0]}
            onChange={(e) => setFilters({
              ...filters,
              dateRange: {
                ...filters.dateRange,
                endDate: new Date(e.target.value),
              },
            })}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <button className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800">
          <Filter className="w-4 h-4" />
          More Filters
        </button>
      </div>

      {/* Content */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today's Tests</p>
                  <p className="text-2xl font-semibold text-gray-900">{metrics?.today.testsPerformed || 0}</p>
                </div>
                <TestTube className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">This Week's Cost</p>
                  <p className="text-2xl font-semibold text-gray-900">{formatCurrency(metrics?.thisWeek.totalCost || 0)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {getTrendIcon(metrics?.thisWeek.trend || 'stable')}
                    <span className="text-xs text-gray-500">vs last week</span>
                  </div>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Wastage</p>
                  <p className="text-2xl font-semibold text-gray-900">{formatPercentage(metrics?.today.averageWastage || 0)}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-500" />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Materials Used</p>
                  <p className="text-2xl font-semibold text-gray-900">{metrics?.today.materialsUsed || 0}</p>
                </div>
                <Package className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Top Wastage Products */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Top Wastage Products</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {(metrics?.topWastageProducts || []).map((product, index) => (
                  <div key={product.productId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{product.productName}</p>
                        <p className="text-sm text-gray-600">{product.productCode}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-red-600">{formatPercentage(product.wastagePercentage)}</p>
                      <p className="text-sm text-gray-600">{formatCurrency(product.wastageCost)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Least Efficient Tests */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Least Efficient Tests</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {(metrics?.leastEfficientTests || []).map((test, index) => (
                  <div key={test.testId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{test.testName}</p>
                        <p className="text-sm text-gray-600">{test.testCategory}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-orange-600">{formatPercentage(test.averageWastage)}</p>
                      <p className="text-sm text-gray-600">{test.totalTests} tests</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "analysis" && analysis && (
        <div className="space-y-6">
          {/* Analysis Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Analysis</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Expected Cost:</span>
                  <span className="font-medium">{formatCurrency(analysis.costAnalysis.totalExpectedCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Actual Cost:</span>
                  <span className="font-medium">{formatCurrency(analysis.costAnalysis.totalActualCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Wastage Cost:</span>
                  <span className="font-medium text-red-600">{formatCurrency(analysis.costAnalysis.totalWastageCost)}</span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="text-gray-600">Variance:</span>
                  <span className={`font-medium ${analysis.costAnalysis.costVariance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(analysis.costAnalysis.costVariance)} ({formatPercentage(analysis.costAnalysis.costVariancePercentage)})
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Test Performance</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Tests:</span>
                  <span className="font-medium">{analysis.totalTests}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Materials Used:</span>
                  <span className="font-medium">{analysis.totalMaterialsUsed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg. Wastage:</span>
                  <span className="font-medium text-orange-600">{formatPercentage(analysis.averageWastage)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Efficiency Score</h3>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {Math.round(100 - analysis.averageWastage)}
                </div>
                <div className="text-sm text-gray-600">Overall Efficiency</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                  <div 
                    className="bg-primary-600 h-2 rounded-full" 
                    style={{ width: `${Math.max(0, 100 - analysis.averageWastage)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Analysis Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Wastage Products */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Top Wastage Products</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wastage</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {analysis.topWastageProducts.slice(0, 5).map((product) => (
                      <tr key={product.productId}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{product.productName}</div>
                            <div className="text-sm text-gray-500">{product.productCode}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-red-600">{formatPercentage(product.wastagePercentage)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{formatCurrency(product.wastageCost)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Test Efficiency */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Test Efficiency</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Efficiency</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tests</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {analysis.testEfficiency.slice(0, 5).map((test) => (
                      <tr key={test.testId}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{test.testName}</div>
                            <div className="text-sm text-gray-500">{test.testCategory}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-orange-600">{formatPercentage(test.averageWastage)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{test.totalTests}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "mappings" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Test-Material Mappings</h3>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              <Plus className="w-4 h-4" />
              Add Mapping
            </button>
          </div>

          {mappings.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <TestTube className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Test Mappings Found</h3>
              <p className="text-gray-600 mb-4">
                Create your first test-material mapping to start tracking usage efficiency.
              </p>
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                <Plus className="w-4 h-4" />
                Create First Mapping
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Materials</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mappings.map((mapping) => (
                      <tr key={mapping.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{mapping.testName}</div>
                            <div className="text-sm text-gray-500">{mapping.testId}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {mapping.testCategory}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{mapping.materials.length} materials</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-primary-600 hover:text-primary-900 mr-3">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="text-gray-600 hover:text-gray-900">
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "usage" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Material Usage Records</h3>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              <Plus className="w-4 h-4" />
              Record Usage
            </button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sample</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wastage</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {usage.map((record) => (
                    <tr key={record.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{record.accessionNumber}</div>
                          <div className="text-sm text-gray-500">{record.sampleId}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{record.testName}</div>
                          <div className="text-sm text-gray-500">{record.testCategory}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{record.productName}</div>
                          <div className="text-sm text-gray-500">{record.productCode}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.expectedQuantity} {record.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.actualQuantity} {record.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${record.wastage && record.wastage > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {record.wastage && record.wastage > 0 ? '+' : ''}{record.wastage || 0} {record.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(record.totalCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "alerts" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Usage Alerts</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {alerts.filter(a => !a.isRead).length} unread
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${
                  alert.isRead ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${getSeverityColor(alert.severity)}`}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">{alert.title}</h4>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(alert.severity)}`}>
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{alert.createdAt.toDate().toLocaleString()}</span>
                        {alert.type === 'high_wastage' && alert.threshold && alert.actualValue && (
                          <span>Threshold: {formatPercentage(alert.threshold)}, Actual: {formatPercentage(alert.actualValue)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!alert.isRead && (
                      <button
                        onClick={() => handleAlertRead(alert.id)}
                        className="text-sm text-primary-600 hover:text-primary-800"
                      >
                        Mark as Read
                      </button>
                    )}
                    <button className="text-sm text-gray-600 hover:text-gray-800">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
