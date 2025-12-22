import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import SamplesTable from '../components/dashboard/samples/SamplesTable';
import TATDashboard from '../components/samples/TATDashboard';
import OverdueTestsBanner from '../components/common/OverdueTestsBanner';
import DuplicatePatientModal from '../components/common/DuplicatePatientModal';
import { Clock, CheckCircle, Activity, Beaker, Calendar } from 'lucide-react';
import { DateRangePicker } from '../components/common/DateRangePicker';
import { duplicatePatientService, DuplicatePatientSample } from '../services/duplicatePatientService';
import { useSampleStats } from '../hooks/queries/samples/useSampleStats';

type TabType = 'samples' | 'tat';
type TimeFilter = 'day' | 'week' | 'month' | 'year' | 'all';

export default function SampleManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('samples');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('day');
  const [tatTimeFilter, setTatTimeFilter] = useState<TimeFilter | 'custom'>('day');
  const { data: stats, isLoading: statsLoading } = useSampleStats(timeFilter);
  const [customDateRange, setCustomDateRange] = useState<[Date | null, Date | null]>([null, null]);
  
  // Duplicate patient detection state
  const [duplicatePatients, setDuplicatePatients] = useState<DuplicatePatientSample[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateCheckCompleted, setDuplicateCheckCompleted] = useState(false);

  // Get date range based on filter
  const getDateRange = (filter: TimeFilter) => {
    const now = new Date();
    const start = new Date();
    const end = new Date();
    
    switch (filter) {
      case 'day':
        // Today: start of day to end of day
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        // Last 7 days
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'month':
        // Last 30 days
        start.setMonth(now.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'year':
        // Last 365 days
        start.setFullYear(now.getFullYear() - 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'all':
        // All time - return null to indicate no filtering needed
        return { start: null, end: null };
    }
    
    return { start, end };
  };

  // Debug function to check today's samples
  const debugTodaysSamples = async () => {
    try {
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      const startTimestamp = Timestamp.fromDate(startOfDay);
      const endTimestamp = Timestamp.fromDate(endOfDay);

      console.log('Debug: Checking samples for today:', startOfDay.toISOString(), 'to', endOfDay.toISOString());

      const collectionRequestsRef = collection(db, 'collectionRequests');
      const todaysQuery = query(
        collectionRequestsRef,
        where('created_at', '>=', startTimestamp),
        where('created_at', '<=', endTimestamp)
      );

      const snapshot = await getDocs(todaysQuery);
      console.log(`Debug: Found ${snapshot.size} samples for today`);
      
      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        const patientName = data.patient_name || data.caller_name || data.patientName || 'Unknown';
        console.log(`Debug Sample ${index + 1}: Patient: "${patientName}", Status: ${data.status}, Phone: ${data.caller_number || data.patient_phone || 'none'}`);
      });
    } catch (error) {
      console.error('Debug error:', error);
    }
  };

  // Check for duplicate patients on page load
  useEffect(() => {
    const checkDuplicatePatients = async () => {
      try {
        console.log('Checking for duplicate patient samples...');
        
        // Debug: First let's see what samples exist today
        await debugTodaysSamples();
        
        const result = await duplicatePatientService.detectDuplicatePatients();
        
        if (result.duplicatePatients.length > 0) {
          console.log(`Found ${result.duplicatePatients.length} patients with duplicate samples`);
          setDuplicatePatients(result.duplicatePatients);
          setShowDuplicateModal(true);
        } else {
          console.log('No duplicate patient samples detected');
        }
      } catch (error) {
        console.error('Error checking for duplicate patients:', error);
      } finally {
        setDuplicateCheckCompleted(true);
      }
    };

    // Only check for duplicates once when component mounts
    if (!duplicateCheckCompleted) {
      checkDuplicatePatients();
    }
  }, [duplicateCheckCompleted]);

  // Stats are now provided by useSampleStats; no manual fetch needed.

  // Time filter labels
  const timeFilterLabels: Record<TimeFilter, string> = {
    day: 'Today',
    week: 'This Week',
    month: 'This Month',
    year: 'This Year',
    all: 'All Time'
  };

  // Helper to get date range for TAT tab
  const getTatDateRange = (): [Date | null, Date | null] => {
    if (tatTimeFilter === 'custom') {
      return customDateRange;
    } else {
      const { start, end } = getDateRange(tatTimeFilter as TimeFilter);
      return [start, end || new Date()];
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col space-y-6">
        {/* Header section */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sample Management</h1>
            <p className="text-sm text-gray-500">Track and manage sample collections and tests</p>
          </div>
          
          <div className="flex space-x-4">
            {/* Debug button for testing duplicate detection */}
            <button
              onClick={async () => {
                setDuplicateCheckCompleted(false);
                const result = await duplicatePatientService.detectDuplicatePatients();
                if (result.duplicatePatients.length > 0) {
                  setDuplicatePatients(result.duplicatePatients);
                  setShowDuplicateModal(true);
                } else {
                  alert('No duplicates found. Check console for details.');
                }
              }}
              className="px-3 py-2 text-sm bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200"
            >
              Test Duplicate Check
            </button>
            
            {/* Tabs */}
            <div className="flex rounded-md border border-gray-300 overflow-hidden">
              <button
                className={`px-4 py-2 ${activeTab === 'samples' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600'}`}
                onClick={() => setActiveTab('samples')}
              >
                Samples
              </button>
              <button
                className={`px-4 py-2 ${activeTab === 'tat' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600'}`}
                onClick={() => setActiveTab('tat')}
              >
                TAT Analysis
              </button>
            </div>
          </div>
        </div>

        {/* Overdue Tests Banner */}
        <OverdueTestsBanner />

        {/* Time filter or custom date range filter */}
        {activeTab === 'samples' ? (
          <div className="flex items-center space-x-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center text-gray-500 px-2">
              <Calendar className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">Filter:</span>
            </div>
            {(['day', 'week', 'month', 'year', 'all'] as TimeFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-3 py-1 text-sm rounded-md ${
                  timeFilter === filter
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {timeFilterLabels[filter]}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center space-x-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center text-gray-500 px-2">
              <Calendar className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">Filter:</span>
            </div>
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
                value={customDateRange}
                onChange={(start, end) => setCustomDateRange([start, end])}
              />
            )}
          </div>
        )}

        <div>
          {activeTab === 'samples' ? (
            <div className="space-y-8">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[
                  { 
                    label: 'Total Samples', 
                    value: statsLoading ? '-' : stats.totalSamples.toLocaleString(), 
                    trend: timeFilterLabels[timeFilter], 
                    icon: 'flask'
                  },
                  { 
                    label: 'Pending Collections', 
                    value: statsLoading ? '-' : stats.pendingCollections.toLocaleString(), 
                    trend: 'Awaiting pickup', 
                    icon: 'clock'
                  },
                  { 
                    label: 'In Progress', 
                    value: statsLoading ? '-' : stats.inProgress.toLocaleString(), 
                    trend: 'Being processed', 
                    icon: 'processing'
                  },
                  { 
                    label: 'Completed', 
                    value: statsLoading ? '-' : stats.completed.toLocaleString(), 
                    trend: 'Tests completed', 
                    icon: 'check'
                  },
                  { 
                    label: 'Delivered', 
                    value: statsLoading ? '-' : stats.delivered.toLocaleString(), 
                    trend: 'Results delivered', 
                    icon: 'delivered'
                  }
                ].map(({ label, value, trend, icon }) => (
                  <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        icon === 'check' ? 'bg-green-100 text-green-600' :
                        icon === 'clock' ? 'bg-yellow-100 text-yellow-600' :
                        icon === 'processing' ? 'bg-blue-100 text-blue-600' :
                        icon === 'delivered' ? 'bg-emerald-100 text-emerald-600' :
                        'bg-purple-100 text-purple-600'
                      }`}>
                        {icon === 'check' && <CheckCircle className="w-5 h-5" />}
                        {icon === 'clock' && <Clock className="w-5 h-5" />}
                        {icon === 'processing' && <Activity className="w-5 h-5" />}
                        {icon === 'flask' && <Beaker className="w-5 h-5" />}
                        {icon === 'delivered' && <CheckCircle className="w-5 h-5" />}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-secondary-600">{label}</p>
                        <div className="flex items-baseline">
                          <p className="text-2xl font-semibold text-secondary-900">{value}</p>
                          <p className="ml-2 text-xs text-secondary-500">{trend}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Samples Table */}
              <SamplesTable />
            </div>
          ) : (
            <TATDashboard dateRange={getTatDateRange()} />
          )}
        </div>
      </div>

      {/* Duplicate Patient Modal */}
      {showDuplicateModal && duplicatePatients.length > 0 && (
        <DuplicatePatientModal
          duplicatePatients={duplicatePatients}
          onClose={() => setShowDuplicateModal(false)}
          onSampleCancelled={() => {
            // Refresh stats after cancellation
            setStats(prev => ({ ...prev })); // Trigger stats refresh
            setDuplicateCheckCompleted(false); // Allow re-checking for duplicates
          }}
          onDuplicatesAcknowledged={() => {
            // Clear current duplicates list since they've been acknowledged
            setDuplicatePatients([]);
            setDuplicateCheckCompleted(true); // Mark as completed to prevent re-checking
          }}
        />
      )}
    </div>
  );
}