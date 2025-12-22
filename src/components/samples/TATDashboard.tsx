import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer } from 'recharts';
import { Clock, TrendingUp, Activity, FileDown, Download } from 'lucide-react';
import SamplePerformanceMatrix from './SamplePerformanceMatrix';
import { sampleService } from '../../services/sampleService';
import { calculateTAT, calculateTATStatistics } from '../../utils/tatCalculations';
import { SampleCollection } from '../../services/sampleCollectionService';
import { generateTATAnalysisReport } from '../../utils/pdfGenerator';
import html2canvas from 'html2canvas';
import { 
  format, 
  parseISO, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  eachDayOfInterval, 
  eachWeekOfInterval,
  eachMonthOfInterval,
  eachHourOfInterval,
  getWeek,
  differenceInDays,
  differenceInMonths,
  differenceInYears,
  isSameMonth,
  addWeeks
} from 'date-fns';

// Helper function to determine aggregation type based on date range
const getAggregationType = (dateRange?: [Date | null, Date | null]) => {
  if (!dateRange || !dateRange[0] || !dateRange[1]) {
    return 'weekly'; // Default for "All Time"
  }

  const [start, end] = dateRange;
  const daysDiff = differenceInDays(end, start);
  const monthsDiff = differenceInMonths(end, start);
  const yearsDiff = differenceInYears(end, start);

  // Today: hourly breakdown
  if (daysDiff <= 1) {
    return 'hourly';
  }
  // This Week: daily breakdown
  else if (daysDiff <= 7) {
    return 'daily';
  }
  // This Month: weekly breakdown within the month
  else if (daysDiff <= 31 && isSameMonth(start, end)) {
    return 'monthly-weekly';
  }
  // Longer periods up to a year: weekly breakdown
  else if (monthsDiff <= 12 || yearsDiff <= 1) {
    return 'weekly';
  }
  // All Time or very long ranges: monthly breakdown
  else {
    return 'monthly';
  }
};

// Helper function to get chart title based on aggregation
const getChartTitle = (aggregationType: string) => {
  switch (aggregationType) {
    case 'hourly': return 'Hourly TAT Breakdown';
    case 'daily': return 'Daily TAT Breakdown';
    case 'monthly-weekly': return 'Weekly TAT Breakdown (This Month)';
    case 'weekly': return 'Weekly TAT Breakdown';
    case 'monthly': return 'Monthly TAT Breakdown';
    default: return 'TAT Breakdown';
  }
};

// Helper function to generate weekly intervals within a month
const generateMonthlyWeeklyIntervals = (start: Date, end: Date) => {
  const intervals: Array<{ start: Date; end: Date; name: string; key: string }> = [];
  
  // Find the first Sunday of or before the month start
  const monthStart = startOfMonth(start);
  const monthEnd = endOfMonth(end);
  
  // Start from the Sunday of the week containing the first day of the month
  let weekStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // 0 = Sunday
  let weekNumber = 1;
  
  while (weekStart <= monthEnd) {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 }); // 0 = Sunday
    
    // Only include weeks that have at least one day in the target month
    const actualStart = weekStart < monthStart ? monthStart : weekStart;
    const actualEnd = weekEnd > monthEnd ? monthEnd : weekEnd;
    
    if (actualStart <= actualEnd) {
      intervals.push({
        start: startOfDay(actualStart),
        end: endOfDay(actualEnd),
        name: `Week ${weekNumber}`,
        key: `${format(monthStart, 'yyyy-MM')}-W${weekNumber}`
      });
      weekNumber++;
    }
    
    weekStart = addWeeks(weekStart, 1);
  }
  
  return intervals;
};

// Default trend data as fallback
const defaultTrendData = [
  { name: 'Mon', dispatch: 8, collection: 35, registration: 18, processing: 195, delivery: 25 },
  { name: 'Tue', dispatch: 12, collection: 42, registration: 22, processing: 225, delivery: 28 },
  { name: 'Wed', dispatch: 9, collection: 38, registration: 19, processing: 210, delivery: 26 },
  { name: 'Thu', dispatch: 7, collection: 33, registration: 16, processing: 185, delivery: 23 },
  { name: 'Fri', dispatch: 11, collection: 40, registration: 21, processing: 220, delivery: 27 },
  { name: 'Sat', dispatch: 9, collection: 37, registration: 20, processing: 200, delivery: 25 },
  { name: 'Sun', dispatch: 10, collection: 39, registration: 21, processing: 215, delivery: 26 },
];

interface EfficiencyStat {
  label: string;
  value: string;
  trend: string;
  status: 'good' | 'warning' | 'critical';
}

const defaultEfficiencyStats: EfficiencyStat[] = [
  { label: 'Average TAT', value: '4h 30m', trend: '-15%', status: 'good' },
  { label: 'On-Time Completion', value: '92%', trend: '+5%', status: 'good' },
  { label: 'Delayed Samples', value: '12', trend: '-8', status: 'good' },
  { label: 'Efficiency Score', value: '95%', trend: '+3%', status: 'good' },
];

// Utility function to format minutes into hours and minutes
const formatMinutesToHoursMinutes = (minutes: number): string => {
  if (minutes === 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ''}` : `${mins}m`;
};

interface TATDashboardProps {
  dateRange?: [Date | null, Date | null];
  onExportPDF?: () => void;
}

export default function TATDashboard({ dateRange, onExportPDF }: TATDashboardProps) {
  const [trendData, setTrendData] = useState(defaultTrendData);
  const [efficiencyStats, setEfficiencyStats] = useState(defaultEfficiencyStats);
  const [isLoading, setIsLoading] = useState(true);
  const [processingTimeData, setProcessingTimeData] = useState(defaultTrendData);
  const [aggregationType, setAggregationType] = useState('weekly');
  const [isExporting, setIsExporting] = useState(false);
  const [downloadingChart, setDownloadingChart] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTATData() {
      setIsLoading(true);
      try {
        console.log('Fetching data for TAT Dashboard with dateRange:', dateRange);
        
        // Determine aggregation type based on date range
        const aggType = getAggregationType(dateRange);
        setAggregationType(aggType);
        console.log('Using aggregation type:', aggType);
        
        // Fetch completed samples from Firestore with date range
        const [samples, collections] = await Promise.all([
          sampleService.getSamplesForTATCalculation(dateRange),
          sampleService.getSampleCollectionsForTATCalculation(dateRange)
        ]);
        
        console.log('Retrieved samples:', samples.length);
        console.log('Retrieved collections:', collections.length);
        
        // Combine all samples
        const allSamples = [...samples, ...collections];
        
        if (allSamples.length === 0) {
          console.log('No sample data found, using defaults');
          setIsLoading(false);
          return;
        }
        
        // Parse timestamps and calculate TAT
        const samplesWithTAT = allSamples.map(sample => {
          try {
            const tat = calculateTAT(sample as SampleCollection);
            
            // Get timestamp - handle both Sample and TimelineSamples types safely
            let timestamp = null;
            if ('requested_at' in sample && sample.requested_at) {
              timestamp = typeof sample.requested_at === 'string' 
                ? parseISO(sample.requested_at)
                : new Date((sample.requested_at as any).seconds * 1000);
            } else if ('requestedAt' in sample && sample.requestedAt) {
              timestamp = typeof sample.requestedAt === 'string' 
                ? parseISO(sample.requestedAt)
                : new Date(sample.requestedAt);
            } else if ('created_at' in sample && sample.created_at) {
              timestamp = typeof sample.created_at === 'object' && 'seconds' in sample.created_at
                ? new Date((sample.created_at as any).seconds * 1000)
                : typeof sample.created_at === 'string'
                  ? parseISO(sample.created_at)
                  : null;
            }
            
            return { sample, tat, timestamp };
          } catch (error) {
            console.error('Error calculating TAT for sample:', error);
            return null;
          }
        }).filter(item => item !== null && item.timestamp) as Array<{
          sample: any;
          tat: any;
          timestamp: Date;
        }>;
        
        console.log('Processed samples with TAT:', samplesWithTAT.length);
        
        // If no data found, show message and use defaults
        if (samplesWithTAT.length === 0) {
          console.log('No sample data found for the selected date range');
          setIsLoading(false);
          return;
        }
        
        // Find the actual data range within the selected period
        const timestamps = samplesWithTAT.map(item => item.timestamp).sort((a, b) => a.getTime() - b.getTime());
        const actualDataStart = timestamps[0];
        const actualDataEnd = timestamps[timestamps.length - 1];
        
        console.log('Actual data range:', {
          selected: { start: dateRange?.[0], end: dateRange?.[1] },
          actual: { start: actualDataStart, end: actualDataEnd },
          totalSamples: samplesWithTAT.length
        });
        
        // Use the intersection of selected range and actual data range for interval generation
        const effectiveStart = dateRange?.[0] && actualDataStart > dateRange[0] ? actualDataStart : (dateRange?.[0] || actualDataStart);
        const effectiveEnd = dateRange?.[1] && actualDataEnd < dateRange[1] ? actualDataEnd : (dateRange?.[1] || actualDataEnd);
        
        console.log('Effective range for intervals:', { start: effectiveStart, end: effectiveEnd });
        
        // Generate time intervals based on aggregation type
        let intervals: Array<{ start: Date; end: Date; name: string; key: string }> = [];
        const now = new Date();
        
        if (aggType === 'hourly') {
          // For today: hourly intervals
          const dayStart = startOfDay(effectiveStart);
          const dayEnd = endOfDay(effectiveEnd);
          const hours = eachHourOfInterval({ start: dayStart, end: dayEnd });
          intervals = hours.map(hour => ({
            start: hour,
            end: new Date(hour.getTime() + 60 * 60 * 1000 - 1), // End of hour
            name: format(hour, 'HH:mm'),
            key: format(hour, 'HH')
          }));
        } else if (aggType === 'daily') {
          // For week: daily intervals
          const start = startOfDay(effectiveStart);
          const end = endOfDay(effectiveEnd);
          const days = eachDayOfInterval({ start, end });
          intervals = days.map(day => ({
            start: startOfDay(day),
            end: endOfDay(day),
            name: format(day, 'EEE'),
            key: format(day, 'yyyy-MM-dd')
          }));
        } else if (aggType === 'weekly') {
          // For year: weekly intervals
          const start = startOfWeek(effectiveStart, { weekStartsOn: 1 });
          const end = endOfWeek(effectiveEnd, { weekStartsOn: 1 });
          const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
          intervals = weeks.map(week => ({
            start: startOfWeek(week, { weekStartsOn: 1 }),
            end: endOfWeek(week, { weekStartsOn: 1 }),
            name: `W${getWeek(week)}`,
            key: format(week, 'yyyy-ww')
          }));
        } else if (aggType === 'monthly-weekly') {
          intervals = generateMonthlyWeeklyIntervals(effectiveStart, effectiveEnd);
        } else {
          // For all time: monthly intervals
          const start = startOfMonth(effectiveStart);
          const end = endOfMonth(effectiveEnd);
          const months = eachMonthOfInterval({ start, end });
          intervals = months.map(month => ({
            start: startOfMonth(month),
            end: endOfMonth(month),
            name: format(month, 'MMM'),
            key: format(month, 'yyyy-MM')
          }));
        }
        
        console.log('Generated intervals:', intervals.length, 'for type:', aggType);
        
        // Filter intervals to only include those that have data
        const intervalsWithData = intervals.filter(interval => {
          return samplesWithTAT.some(({ timestamp }) => 
            timestamp >= interval.start && timestamp <= interval.end
          );
        });
        
        console.log('Intervals with actual data:', intervalsWithData.length);
        
        // Initialize data map for intervals (only for intervals with data)
        const intervalMap = new Map(intervalsWithData.map(interval => [
          interval.key,
          { 
            name: interval.name,
            dispatch: 0, 
            dispatchCount: 0,
            collection: 0, 
            collectionCount: 0, 
            registration: 0, 
            registrationCount: 0,
            processing: 0, 
            processingCount: 0,
            delivery: 0, 
            deliveryCount: 0,
            interval
          }
        ]));
        
        // Process samples for chart data
        samplesWithTAT.forEach(({ tat, timestamp }) => {
          // Find which interval this sample belongs to
          const matchingInterval = intervalsWithData.find(interval => 
            timestamp >= interval.start && timestamp <= interval.end
          );
          
          if (matchingInterval) {
            const intervalData = intervalMap.get(matchingInterval.key);
            
            if (intervalData) {
              // Sum up values for each metric
              if (tat.rawMinutes.dispatch > 0) {
                intervalData.dispatch += tat.rawMinutes.dispatch;
                intervalData.dispatchCount++;
              }
              
              if (tat.rawMinutes.collection > 0) {
                intervalData.collection += tat.rawMinutes.collection;
                intervalData.collectionCount++;
              }
              
              if (tat.rawMinutes.registration > 0) {
                intervalData.registration += tat.rawMinutes.registration;
                intervalData.registrationCount++;
              }
              
              if (tat.rawMinutes.processing > 0) {
                intervalData.processing += tat.rawMinutes.processing;
                intervalData.processingCount++;
              }
              
              if (tat.rawMinutes.delivery > 0) {
                intervalData.delivery += tat.rawMinutes.delivery;
                intervalData.deliveryCount++;
              }
            }
          }
        });
        
        // Calculate averages and prepare chart data
        const processedTrendData = Array.from(intervalMap.values()).map(data => ({
          name: data.name,
          dispatch: data.dispatchCount > 0 ? Math.round(data.dispatch / data.dispatchCount) : 0,
          collection: data.collectionCount > 0 ? Math.round(data.collection / data.collectionCount) : 0,
          registration: data.registrationCount > 0 ? Math.round(data.registration / data.registrationCount) : 0,
          processing: data.processingCount > 0 ? Math.round(data.processing / data.processingCount) : 0,
          delivery: data.deliveryCount > 0 ? Math.round(data.delivery / data.deliveryCount) : 0
        }));
        
        console.log('Processed trend data:', processedTrendData);
        
        // Create processing time data with additional info for the line chart
        const processedTimeData = Array.from(intervalMap.values()).map(data => ({
          name: data.name,
          dispatch: 0,
          collection: 0,
          registration: 0,
          processing: data.processingCount > 0 ? Math.round(data.processing / data.processingCount) : 0,
          delivery: 0
        }));
        
        console.log('Processed processing time data:', processedTimeData);
        
        // Check if we have actual data
        const hasRealData = processedTrendData.some(item => 
          item.dispatch > 0 || item.collection > 0 || item.registration > 0 || 
          item.processing > 0 || item.delivery > 0
        );
        
        if (hasRealData) {
          setTrendData(processedTrendData);
          setProcessingTimeData(processedTimeData);
        } else {
          console.log('No real data for chart, using defaults');
        }
        
        // Calculate TAT statistics for the matrix
        const stats = calculateTATStatistics(allSamples, dateRange);
        console.log('TAT Dashboard: Calculated statistics:', stats);
        
        // Update efficiency stats based on real data
        const hasValidData = allSamples.length > 0;
        if (hasValidData) {
          // Calculate real efficiency metrics
          const avgTotalTAT = samplesWithTAT.reduce((sum, item) => sum + item.tat.rawMinutes.total, 0) / samplesWithTAT.length;
          const onTimeCount = samplesWithTAT.filter(item => item.tat.rawMinutes.total <= 240).length; // Assuming 4h target
          const onTimePercentage = (onTimeCount / samplesWithTAT.length) * 100;
          const delayedCount = samplesWithTAT.length - onTimeCount;
          
          const realEfficiencyStats: EfficiencyStat[] = [
            { 
              label: 'Average TAT', 
              value: formatMinutesToHoursMinutes(Math.round(avgTotalTAT)), 
              trend: '-', 
              status: avgTotalTAT <= 240 ? 'good' : avgTotalTAT <= 300 ? 'warning' : 'critical' 
            },
            { 
              label: 'On-Time Completion', 
              value: `${Math.round(onTimePercentage)}%`, 
              trend: '-', 
              status: onTimePercentage >= 90 ? 'good' : onTimePercentage >= 75 ? 'warning' : 'critical' 
            },
            { 
              label: 'Delayed Samples', 
              value: `${delayedCount}`, 
              trend: '-', 
              status: delayedCount <= 5 ? 'good' : delayedCount <= 15 ? 'warning' : 'critical' 
            },
            { 
              label: 'Total Samples', 
              value: `${samplesWithTAT.length}`, 
              trend: '-', 
              status: 'good' 
            },
          ];
          
          setEfficiencyStats(realEfficiencyStats);
        } else {
          // Show "No Data" stats for empty periods
          const noDataStats: EfficiencyStat[] = [
            { label: 'Average TAT', value: 'No Data', trend: '-', status: 'good' },
            { label: 'On-Time Completion', value: 'No Data', trend: '-', status: 'good' },
            { label: 'Delayed Samples', value: 'No Data', trend: '-', status: 'good' },
            { label: 'Total Samples', value: '0', trend: '-', status: 'good' },
          ];
          setEfficiencyStats(noDataStats);
        }
      } catch (error) {
        console.error('Error fetching TAT data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchTATData();
  }, [dateRange]);

  const getStatusColor = (status: 'good' | 'warning' | 'critical') => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-amber-600';
      case 'critical': return 'text-red-600';
      default: return 'text-secondary-600';
    }
  };

  // Custom tooltip for the bar chart
  const BarChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-200 rounded-md shadow-sm">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: <span className="font-medium">{formatMinutesToHoursMinutes(entry.value)}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for processing time chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 border border-gray-200 rounded-md shadow-sm">
          <p className="font-medium">{label}</p>
          <p className="text-sm">
            Processing Time: <span className="font-medium">{formatMinutesToHoursMinutes(payload[0].value)}</span>
          </p>
          {data.count > 0 && (
            <p className="text-xs text-gray-500">Based on {data.count} sample{data.count !== 1 ? 's' : ''}</p>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom Y-axis tick formatter
  const formatYAxis = (tickItem: number) => {
    if (tickItem === 0) return '0';
    if (tickItem < 60) return `${tickItem}m`;
    return `${Math.floor(tickItem / 60)}h`;
  };

  // PDF Export function
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      // Prepare stats for PDF
      const stats = {
        totalSamples: 0,
        pendingCollections: 0,
        inProgress: 0,
        completed: 0
      };

      // Extract stats from efficiency stats
      const totalSamplesFromData = trendData.reduce((sum, item) => 
        sum + (item.dispatch || 0) + (item.collection || 0) + (item.registration || 0) + (item.processing || 0) + (item.delivery || 0), 0
      );
      stats.totalSamples = totalSamplesFromData;

      // Prepare TAT metrics for PDF - use efficiency stats directly
      const tatMetrics = efficiencyStats.map(stat => ({
        label: stat.label,
        description: `Current performance metric for ${stat.label.toLowerCase()}`,
        periods: {
          daily: { 
            current: stat.value, 
            target: stat.label === 'Average TAT' ? '4h 0m' : '90%', 
            trend: stat.trend.includes('+') ? 'up' as const : 'down' as const, 
            status: stat.status 
          },
          weekly: { 
            current: stat.value, 
            target: stat.label === 'Average TAT' ? '4h 0m' : '90%', 
            trend: stat.trend.includes('+') ? 'up' as const : 'down' as const, 
            status: stat.status 
          },
          monthly: { 
            current: stat.value, 
            target: stat.label === 'Average TAT' ? '4h 0m' : '90%', 
            trend: stat.trend.includes('+') ? 'up' as const : 'down' as const, 
            status: stat.status 
          }
        }
      }));

      // Generate PDF
      const doc = generateTATAnalysisReport(stats, tatMetrics, dateRange);
      
      // Download PDF
      const fileName = `TAT_Analysis_Report_${dateRange && dateRange[0] && dateRange[1] 
        ? `${dateRange[0].toLocaleDateString().replace(/\//g, '-')}_to_${dateRange[1].toLocaleDateString().replace(/\//g, '-')}`
        : 'All_Time'
      }.pdf`;
      
      doc.save(fileName);
      
      if (onExportPDF) {
        onExportPDF();
      }
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

      // Create download link with enhanced filename
      const dateRangeStr = dateRange && dateRange[0] && dateRange[1] 
        ? `${dateRange[0].toLocaleDateString().replace(/\//g, '-')}_to_${dateRange[1].toLocaleDateString().replace(/\//g, '-')}`
        : 'All_Time';
      
      const link = document.createElement('a');
      link.download = `TAT_${chartName}_${dateRangeStr}.png`;
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

  return (
    <div className="space-y-6">
      {/* Export Button */}
      <div className="flex justify-end">
        <button
          onClick={handleExportPDF}
          disabled={isExporting || isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <FileDown className="w-4 h-4" />
          {isExporting ? 'Exporting...' : 'Export PDF'}
        </button>
      </div>

      {/* Efficiency Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {efficiencyStats.map(({ label, value, trend, status }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-secondary-600">{label}</p>
            <p className="text-2xl font-semibold text-secondary-900 mt-1">{value}</p>
            <p className={`text-xs ${getStatusColor(status)} mt-1 flex items-center gap-1`}>
              <TrendingUp className="w-3 h-3" />
              {trend}
            </p>
          </div>
        ))}
      </div>

      {/* TAT Performance Matrix */}
      <SamplePerformanceMatrix dateRange={dateRange} />

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dynamic TAT Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-4" data-chart="breakdown">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-500" />
              <div>
                <h3 className="font-semibold text-secondary-900">
                  {getChartTitle(aggregationType)}
                  {isLoading && <span className="text-xs text-gray-500 ml-2">(Loading...)</span>}
                </h3>
                <p className="text-xs text-secondary-500">
                  {dateRange && dateRange[0] && dateRange[1]
                    ? `${dateRange[0].toLocaleDateString()} - ${dateRange[1].toLocaleDateString()}`
                    : 'All Time'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={() => downloadChart('breakdown', getChartTitle(aggregationType).replace(/\s+/g, '_'))}
              disabled={downloadingChart === 'breakdown' || isLoading}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors disabled:opacity-50"
              title="Download chart as image"
            >
              <Download className="w-3 h-3" />
              {downloadingChart === 'breakdown' ? 'Downloading...' : 'Download'}
            </button>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={formatYAxis} />
                <Tooltip content={<BarChartTooltip />} />
                <Legend />
                <Bar dataKey="dispatch" name="Dispatch" fill="#4F46E5" />
                <Bar dataKey="collection" name="Collection" fill="#7C3AED" />
                <Bar dataKey="registration" name="Registration" fill="#EC4899" />
                <Bar dataKey="delivery" name="Delivery" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Processing Time Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-4" data-chart="trend">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-500" />
              <div>
                <h3 className="font-semibold text-secondary-900">
                  Processing Time Trend ({aggregationType})
                  {isLoading && <span className="text-xs text-gray-500 ml-2">(Loading...)</span>}
                </h3>
                <p className="text-xs text-secondary-500">
                  {dateRange && dateRange[0] && dateRange[1]
                    ? `${dateRange[0].toLocaleDateString()} - ${dateRange[1].toLocaleDateString()}`
                    : 'All Time'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={() => downloadChart('trend', `Processing_Time_Trend_${aggregationType}`)}
              disabled={downloadingChart === 'trend' || isLoading}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors disabled:opacity-50"
              title="Download chart as image"
            >
              <Download className="w-3 h-3" />
              {downloadingChart === 'trend' ? 'Downloading...' : 'Download'}
            </button>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={processingTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={formatYAxis} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="processing" 
                  name="Processing Time" 
                  stroke="#4F46E5" 
                  strokeWidth={2}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
} 