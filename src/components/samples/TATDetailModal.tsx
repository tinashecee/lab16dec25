import React, { useEffect, useState } from 'react';
import { X, Clock, TrendingUp, TrendingDown, FileDown, Download } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { sampleService } from '../../services/sampleService';
import { calculateTAT } from '../../utils/tatCalculations';
import { SampleCollection } from '../../services/sampleCollectionService';
import { format, parseISO, addDays, addWeeks, addMonths, differenceInDays, differenceInMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { DateRangePicker } from '../common/DateRangePicker';
import { generateTATDetailReport } from '../../utils/pdfGenerator';
import html2canvas from 'html2canvas';

interface TATDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  metric: {
    label: string;
    description: string;
    target: string;
  };
  dateRange?: [Date | null, Date | null];
}

// Create a map of metric labels to their keys in the TAT object
const metricKeyMap = {
  'Dispatch Time': 'dispatch',
  'Collection Time': 'collection',
  'Registration': 'registration',
  'Processing Time': 'processing',
  'Delivery Time': 'delivery'
};

const timeFilterLabels = {
  day: 'Today',
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
  all: 'All Time',
  custom: 'Custom',
};
type TimeFilter = 'day' | 'week' | 'month' | 'year' | 'all' | 'custom';

export default function TATDetailModal({ isOpen, onClose, metric, dateRange }: TATDetailModalProps) {
  const [historicalData, setHistoricalData] = useState<Array<{ date: string; value: number; target: number }>>([]);
  const [hourlyDistribution, setHourlyDistribution] = useState<Array<{ hour: string; value: number }>>([]);
  const [currentAverage, setCurrentAverage] = useState<string>('');
  const [percentFromTarget, setPercentFromTarget] = useState<number>(0);
  const [successRate, setSuccessRate] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [tatTimeFilter, setTatTimeFilter] = useState<TimeFilter>(dateRange && dateRange[0] && dateRange[1] ? 'custom' : 'all');
  const [customDateRange, setCustomDateRange] = useState<[Date | null, Date | null]>(dateRange || [null, null]);
  const [isExporting, setIsExporting] = useState(false);
  const [downloadingChart, setDownloadingChart] = useState<string | null>(null);

  // Helper to get date range for modal
  const getModalDateRange = () => {
    if (tatTimeFilter === 'custom') {
      return customDateRange;
    } else {
      const now = new Date();
      const start = new Date();
      switch (tatTimeFilter) {
        case 'day':
          start.setHours(0, 0, 0, 0);
          break;
        case 'week':
          start.setDate(now.getDate() - 7);
          break;
        case 'month':
          start.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          start.setFullYear(now.getFullYear() - 1);
          break;
        case 'all':
        default:
          start.setFullYear(2000, 0, 1);
          break;
      }
      return [start, now] as [Date | null, Date | null];
    }
  };

  // Helper to determine aggregation level and generate buckets
  const getAggregation = () => {
    if (tatTimeFilter === 'day') return 'hour';
    if (tatTimeFilter === 'week') return 'day';
    if (tatTimeFilter === 'month') return 'week';
    if (tatTimeFilter === 'year' || tatTimeFilter === 'all') return 'month';
    if (tatTimeFilter === 'custom') {
      const [start, end] = customDateRange;
      if (!start || !end) return 'day';
      const days = differenceInDays(end, start);
      if (days <= 14) return 'day';
      if (days <= 90) return 'week';
      return 'month';
    }
    return 'day';
  };

  useEffect(() => {
    if (!isOpen) return;

    async function fetchMetricData() {
      setIsLoading(true);
      try {
        console.log('TATDetailModal: Fetching data for metric:', metric.label);
        // Get the metric key to use in the TAT calculation
        const metricKey = metricKeyMap[metric.label as keyof typeof metricKeyMap] || 'dispatch';
        console.log('Metric key:', metricKey);

        // Fetch completed samples with date range - use both data sources like the main matrix
        const range = getModalDateRange();
        const [samplesData, collectionsData] = await Promise.all([
          sampleService.getSamplesForTATCalculation(range),
          sampleService.getSampleCollectionsForTATCalculation(range)
        ]);
        
        // Combine both data sources
        const allSamples = [...samplesData, ...collectionsData];
        console.log('TATDetailModal: Retrieved samples:', samplesData.length, 'collections:', collectionsData.length, 'total:', allSamples.length);
        
        // Skip if no samples
        if (!allSamples.length) {
          console.log('TATDetailModal: No samples found');
          setIsLoading(false);
          return;
        }

        // Parse timestamps and calculate TAT
        const tatData = allSamples
          .map(sample => {
            try {
              const tat = calculateTAT(sample as unknown as SampleCollection);
              
              // Get a proper timestamp - handle both Sample and TimelineSamples types
              let timestamp: string | null = null;
              
              // Try requested_at field (for TimelineSamples)
              if ('requested_at' in sample && sample.requested_at) {
                timestamp = typeof sample.requested_at === 'string' 
                  ? sample.requested_at 
                  : (sample.requested_at as any).toISOString?.() || null;
              } 
              // Try requestedAt field (for Sample)
              else if ('requestedAt' in sample && sample.requestedAt) {
                timestamp = typeof sample.requestedAt === 'string' 
                  ? sample.requestedAt 
                  : (sample.requestedAt as any).toISOString?.() || null;
              }
              // Try created_at field (for TimelineSamples)
              else if ('created_at' in sample && sample.created_at) {
                timestamp = typeof sample.created_at === 'object' && 'seconds' in sample.created_at
                  ? new Date((sample.created_at as any).seconds * 1000).toISOString()
                  : typeof sample.created_at === 'string'
                    ? sample.created_at
                    : null;
              }
              
              return { tat, sample, timestamp };
            } catch (error) {
              console.error('Error processing sample:', error, sample);
              return null;
            }
          })
          .filter(item => item !== null && item.timestamp && item.tat.rawMinutes[metricKey as keyof typeof item.tat.rawMinutes] > 0) as Array<{
            tat: any;
            sample: any;
            timestamp: string;
          }>;
        
        console.log('TATDetailModal: Filtered TAT data items:', tatData.length);
        if (tatData.length > 0) {
          console.log('TATDetailModal: Example TAT data item:', tatData[0]);
        }

        // Calculate target in minutes from the target string
        const targetParts = metric.target.match(/(\d+)h\s+(\d+)m/) || metric.target.match(/(\d+)m/);
        let targetMinutes = 0;
        if (targetParts) {
          if (targetParts[2]) {
            // Format: 3h 30m
            targetMinutes = parseInt(targetParts[1]) * 60 + parseInt(targetParts[2]);
          } else {
            // Format: 30m
            targetMinutes = parseInt(targetParts[1]);
          }
        }
        console.log('Target minutes:', targetMinutes);

        // Determine aggregation
        const aggregation = getAggregation();
        // Prepare buckets
        let buckets: any[] = [];
        let bucketMap: Map<string, { total: number; count: number }>; 
        if (aggregation === 'hour') {
          // 24 hours
          buckets = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
          bucketMap = new Map(buckets.map(hour => [hour, { total: 0, count: 0 }]));
        } else if (aggregation === 'day') {
          // Each day in range
          const [start, end] = range;
          let d = startOfDay(start!);
          buckets = [];
          while (d <= endOfDay(end!)) {
            buckets.push(format(d, 'yyyy-MM-dd'));
            d = addDays(d, 1);
          }
          bucketMap = new Map(buckets.map(date => [date, { total: 0, count: 0 }]));
        } else if (aggregation === 'week') {
          // Each week in range
          const [start, end] = range;
          let w = startOfWeek(start!);
          buckets = [];
          while (w <= endOfWeek(end!)) {
            const weekLabel = format(w, 'yyyy-ww');
            buckets.push(weekLabel);
            w = addWeeks(w, 1);
          }
          bucketMap = new Map(buckets.map(week => [week, { total: 0, count: 0 }]));
        } else if (aggregation === 'month') {
          // Each month in range
          const [start, end] = range;
          let m = startOfMonth(start!);
          buckets = [];
          while (m <= endOfMonth(end!)) {
            const monthLabel = format(m, 'yyyy-MM');
            buckets.push(monthLabel);
            m = addMonths(m, 1);
          }
          bucketMap = new Map(buckets.map(month => [month, { total: 0, count: 0 }]));
        } else {
          bucketMap = new Map();
        }
        // Process TAT data into buckets
        tatData.forEach(({ tat, timestamp }) => {
          if (!timestamp) return;
          const value = tat.rawMinutes[metricKey as keyof typeof tat.rawMinutes];
          if (value <= 0) return;
          const parsedDate = parseISO(timestamp);
          let bucketKey = '';
          if (aggregation === 'hour') {
            bucketKey = `${parsedDate.getHours().toString().padStart(2, '0')}:00`;
          } else if (aggregation === 'day') {
            bucketKey = format(parsedDate, 'yyyy-MM-dd');
          } else if (aggregation === 'week') {
            bucketKey = format(startOfWeek(parsedDate), 'yyyy-ww');
          } else if (aggregation === 'month') {
            bucketKey = format(parsedDate, 'yyyy-MM');
          }
          if (bucketMap.has(bucketKey)) {
            const current = bucketMap.get(bucketKey)!;
            current.total += value;
            current.count++;
            bucketMap.set(bucketKey, current);
          }
        });
        // Prepare chart data
        let chartData: any[] = [];
        if (aggregation === 'hour') {
          chartData = buckets.map(hour => ({
            hour,
            value: bucketMap.get(hour)?.count ? Math.round(bucketMap.get(hour)!.total / bucketMap.get(hour)!.count) : 0,
            target: targetMinutes
          }));
        } else if (aggregation === 'day') {
          chartData = buckets.map(date => ({
            date,
            value: bucketMap.get(date)?.count ? Math.round(bucketMap.get(date)!.total / bucketMap.get(date)!.count) : 0,
            target: targetMinutes
          }));
        } else if (aggregation === 'week') {
          chartData = buckets.map(week => ({
            week,
            value: bucketMap.get(week)?.count ? Math.round(bucketMap.get(week)!.total / bucketMap.get(week)!.count) : 0,
            target: targetMinutes
          }));
        } else if (aggregation === 'month') {
          chartData = buckets.map(month => ({
            month,
            value: bucketMap.get(month)?.count ? Math.round(bucketMap.get(month)!.total / bucketMap.get(month)!.count) : 0,
            target: targetMinutes
          }));
        }
        // Set chart data for the main trend
        setHistoricalData(chartData);
        // For hourly distribution, only show if aggregation is not hour
        if (aggregation !== 'hour') {
          // Show hourly distribution for the selected period
          const hourBuckets = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
          const hourMap = new Map(hourBuckets.map(hour => [hour, { total: 0, count: 0 }]));
          tatData.forEach(({ tat, timestamp }) => {
            if (!timestamp) return;
            const value = tat.rawMinutes[metricKey as keyof typeof tat.rawMinutes];
            if (value <= 0) return;
            const parsedDate = parseISO(timestamp);
            const hour = `${parsedDate.getHours().toString().padStart(2, '0')}:00`;
            if (hourMap.has(hour)) {
              const current = hourMap.get(hour)!;
              current.total += value;
              current.count++;
              hourMap.set(hour, current);
            }
          });
          setHourlyDistribution(hourBuckets.map(hour => ({
            hour,
            value: hourMap.get(hour)?.count ? Math.round(hourMap.get(hour)!.total / hourMap.get(hour)!.count) : 0
          })));
        } else {
          setHourlyDistribution([]);
        }
        
        // Calculate average for this metric - use the same method as the main matrix
        const totalMinutes = tatData.reduce((sum, { tat }) => sum + tat.rawMinutes[metricKey as keyof typeof tat.rawMinutes], 0);
        const avgMinutes = tatData.length > 0 ? Math.round(totalMinutes / tatData.length) : 0;
        console.log('TATDetailModal: Calculated average minutes:', avgMinutes, 'from', tatData.length, 'samples');
        const hours = Math.floor(avgMinutes / 60);
        const mins = avgMinutes % 60;
        const avgFormatted = hours > 0 ? `${hours} hours ${mins} minutes` : `${mins} minutes`;
        setCurrentAverage(avgFormatted);
        
        // Calculate percentage from target
        const percentDiff = targetMinutes > 0 ? ((avgMinutes - targetMinutes) / targetMinutes) * 100 : 0;
        setPercentFromTarget(Math.round(percentDiff));
        
        // Set success rate
        setSuccessRate(chartData.length > 0 ? Math.round((chartData.filter(item => item.value <= targetMinutes).length / chartData.length) * 100) : 0);
      } catch (error) {
        console.error('Error fetching metric data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMetricData();
  }, [isOpen, metric.label, metric.target, tatTimeFilter, customDateRange]);

  useEffect(() => {
    if (isOpen && dateRange) {
      setCustomDateRange(dateRange);
    }
  }, [isOpen, dateRange]);

  // PDF Export function
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      // Generate PDF for the specific metric
      const doc = generateTATDetailReport(
        metric.label,
        metric.description,
        getModalDateRange()
      );
      
      // Download PDF
      const fileName = `TAT_${metric.label.replace(/\s+/g, '_')}_Detail_Report_${
        getModalDateRange()[0] && getModalDateRange()[1]
          ? `${getModalDateRange()[0]!.toLocaleDateString().replace(/\//g, '-')}_to_${getModalDateRange()[1]!.toLocaleDateString().replace(/\//g, '-')}`
          : 'All_Time'
      }.pdf`;
      
      doc.save(fileName);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Enhanced chart download function with context
  const downloadChart = async (chartId: string, chartName: string) => {
    setDownloadingChart(chartId);
    try {
      const chartElement = document.querySelector(`[data-chart="${chartId}"]`) as HTMLElement;
      if (!chartElement) {
        throw new Error('Chart element not found');
      }

      // Capture the entire chart section including headers and context
      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
        logging: false
      });

      // Create download link
      const dateRangeStr = getModalDateRange()[0] && getModalDateRange()[1]
        ? `${getModalDateRange()[0]!.toLocaleDateString().replace(/\//g, '-')}_to_${getModalDateRange()[1]!.toLocaleDateString().replace(/\//g, '-')}`
        : 'All_Time';
      
      const link = document.createElement('a');
      link.download = `${metric.label.replace(/\s+/g, '_')}_${chartName}_${dateRangeStr}.png`;
      link.href = canvas.toDataURL('image/png');
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading chart:', error);
      alert('Failed to download chart. Please try again.');
    } finally {
      setDownloadingChart(null);
    }
  };

  // New function to download both charts combined with full context
  const downloadCombinedCharts = async () => {
    setDownloadingChart('combined');
    try {
      // Get the main modal content (excluding overlay and close button)
      const modalContent = document.querySelector('.modal-content-for-download') as HTMLElement;
      if (!modalContent) {
        throw new Error('Modal content not found');
      }

      // Temporarily hide download buttons for cleaner capture
      const downloadButtons = modalContent.querySelectorAll('.download-buttons-exclude');
      downloadButtons.forEach((button) => {
        (button as HTMLElement).style.display = 'none';
      });

      // Capture the entire modal content with charts, headers, stats, and filters
      const canvas = await html2canvas(modalContent, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
        logging: false,
        height: modalContent.scrollHeight,
        windowHeight: modalContent.scrollHeight
      });

      // Restore download buttons
      downloadButtons.forEach((button) => {
        (button as HTMLElement).style.display = '';
      });

      // Create download link
      const dateRangeStr = getModalDateRange()[0] && getModalDateRange()[1]
        ? `${getModalDateRange()[0]!.toLocaleDateString().replace(/\//g, '-')}_to_${getModalDateRange()[1]!.toLocaleDateString().replace(/\//g, '-')}`
        : 'All_Time';
      
      const link = document.createElement('a');
      link.download = `${metric.label.replace(/\s+/g, '_')}_Complete_Analysis_${dateRangeStr}.png`;
      link.href = canvas.toDataURL('image/png');
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading combined charts:', error);
      alert('Failed to download combined charts. Please try again.');
      
      // Ensure buttons are restored even if there's an error
      const downloadButtons = document.querySelectorAll('.download-buttons-exclude');
      downloadButtons.forEach((button) => {
        (button as HTMLElement).style.display = '';
      });
    } finally {
      setDownloadingChart(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Complete content wrapper for download */}
        <div className="modal-content-for-download">
          {/* Modal Header with Context */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-50 rounded-lg">
                  <Clock className="w-5 h-5 text-primary-500" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-secondary-900">{metric.label}</h2>
                  <p className="text-sm text-secondary-600">{metric.description}</p>
                  <p className="text-xs text-secondary-500 mt-1">
                    {getModalDateRange()[0] && getModalDateRange()[1]
                      ? `${getModalDateRange()[0]!.toLocaleDateString()} - ${getModalDateRange()[1]!.toLocaleDateString()}`
                      : 'All Time'
                    }
                  </p>
                </div>
              </div>
              {/* Download buttons - positioned outside the download area */}
              <div className="flex items-center gap-2 download-buttons-exclude">
                <button
                  onClick={downloadCombinedCharts}
                  disabled={downloadingChart === 'combined' || isLoading}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  title="Download complete analysis with both charts"
                >
                  <Download className="w-4 h-4" />
                  {downloadingChart === 'combined' ? 'Downloading...' : 'Download All'}
                </button>
                <button
                  onClick={handleExportPDF}
                  disabled={isExporting || isLoading}
                  className="flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  <FileDown className="w-4 h-4" />
                  {isExporting ? 'Exporting...' : 'Export PDF'}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-secondary-500" />
                </button>
              </div>
            </div>

            {/* Filter controls */}
            <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Filter:</span>
              {(['day', 'week', 'month', 'year', 'all'] as TimeFilter[]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTatTimeFilter(filter)}
                  className={`px-3 py-1 text-sm rounded-md ${
                    tatTimeFilter === filter
                      ? 'bg-primary-100 text-primary-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {timeFilterLabels[filter]}
                </button>
              ))}
              <button
                key="custom"
                onClick={() => setTatTimeFilter('custom')}
                className={`px-3 py-1 text-sm rounded-md ${
                  tatTimeFilter === 'custom'
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Custom
              </button>
              {tatTimeFilter === 'custom' && (
                <DateRangePicker
                  onChange={(start, end) => setCustomDateRange([start, end])}
                  value={customDateRange}
                />
              )}
            </div>
          </div>

          <div className="p-6 space-y-6">
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-secondary-500">Loading data...</p>
              </div>
            ) : (
              <>
                {/* Current Performance */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-secondary-600">Current Average</p>
                    <p className="text-2xl font-semibold text-secondary-900 mt-1">{currentAverage}</p>
                    <div className={`flex items-center gap-1 ${percentFromTarget <= 0 ? 'text-green-600' : 'text-red-600'} text-sm mt-1`}>
                      {percentFromTarget <= 0 ? (
                        <>
                          <TrendingDown className="w-4 h-4" />
                          <span>{Math.abs(percentFromTarget)}% below target</span>
                        </>
                      ) : (
                        <>
                          <TrendingUp className="w-4 h-4" />
                          <span>{percentFromTarget}% above target</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-secondary-600">Target Time</p>
                    <p className="text-2xl font-semibold text-secondary-900 mt-1">{metric.target}</p>
                    <p className="text-sm text-secondary-500 mt-1">Standard target</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-secondary-600">Success Rate</p>
                    <p className="text-2xl font-semibold text-secondary-900 mt-1">{successRate}%</p>
                    <div className="flex items-center gap-1 text-secondary-500 text-sm mt-1">
                      <span>Completed within target</span>
                    </div>
                  </div>
                </div>

                {/* Historical Trend */}
                <div className="bg-white rounded-lg border border-gray-200 p-4" data-chart="historical-trend">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-secondary-900">Historical Trend</h3>
                      <p className="text-xs text-secondary-500">
                        {getModalDateRange()[0] && getModalDateRange()[1]
                          ? `${getModalDateRange()[0]!.toLocaleDateString()} - ${getModalDateRange()[1]!.toLocaleDateString()}`
                          : 'All Time'
                        }
                      </p>
                    </div>
                    <button
                      onClick={() => downloadChart('historical-trend', 'Historical_Trend')}
                      disabled={downloadingChart === 'historical-trend' || isLoading}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors disabled:opacity-50 download-buttons-exclude"
                      title="Download chart as image"
                    >
                      <Download className="w-3 h-3" />
                      {downloadingChart === 'historical-trend' ? 'Downloading...' : 'Download'}
                    </button>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historicalData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        {(() => {
                          const agg = getAggregation();
                          if (agg === 'hour') return <XAxis dataKey="hour" />;
                          if (agg === 'day') return <XAxis dataKey="date" />;
                          if (agg === 'week') return <XAxis dataKey="week" />;
                          if (agg === 'month') return <XAxis dataKey="month" />;
                          return <XAxis dataKey="date" />;
                        })()}
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          name="Actual Time (minutes)" 
                          stroke="#4F46E5" 
                          strokeWidth={2} 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="target" 
                          name="Target (minutes)" 
                          stroke="#E11D48" 
                          strokeWidth={2} 
                          strokeDasharray="5 5" 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Hourly Distribution */}
                <div className="bg-white rounded-lg border border-gray-200 p-4" data-chart="hourly-distribution">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-secondary-900">Hourly Distribution</h3>
                      <p className="text-xs text-secondary-500">
                        {getModalDateRange()[0] && getModalDateRange()[1]
                          ? `${getModalDateRange()[0]!.toLocaleDateString()} - ${getModalDateRange()[1]!.toLocaleDateString()}`
                          : 'All Time'
                        }
                      </p>
                    </div>
                    <button
                      onClick={() => downloadChart('hourly-distribution', 'Hourly_Distribution')}
                      disabled={downloadingChart === 'hourly-distribution' || isLoading}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors disabled:opacity-50 download-buttons-exclude"
                      title="Download chart as image"
                    >
                      <Download className="w-3 h-3" />
                      {downloadingChart === 'hourly-distribution' ? 'Downloading...' : 'Download'}
                    </button>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={hourlyDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          name="Average Time (minutes)" 
                          stroke="#4F46E5" 
                          strokeWidth={2} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 