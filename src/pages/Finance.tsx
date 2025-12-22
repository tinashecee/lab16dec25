import React, { useState, useMemo } from 'react';
import { PlusCircle, RefreshCw, Banknote, Wallet, Users, TrendingUp } from 'lucide-react';
import AllocateFloatModal from '../components/finance/AllocateFloatModal';
import DriverFloatTable from '../components/finance/DriverFloatTable';
import VPDisbursementsTable from '../components/finance/VPDisbursementsTable';
import RecordDisbursementForm from '../components/finance/RecordDisbursementForm';
import UndistributedFloatModal from '../components/finance/UndistributedFloatModal';
import NursesPaymentsModal from '../components/finance/NursesPaymentsModal';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { useVPSettings, useDriverFloats, useVPDisbursements } from '../hooks/queries/finance/useFinance';
import { useQueryClient } from '@tanstack/react-query';

type Tab = 'floats' | 'disbursements';
type TimeFilter = 'day' | 'week' | 'month' | 'quarter' | 'annual';

export default function Finance() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('floats');
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('day');
  const [undistributedFloatModalOpen, setUndistributedFloatModalOpen] = useState(false);
  const [nursesModalOpen, setNursesModalOpen] = useState(false);

  // Use TanStack Query hooks
  const { data: settings, isLoading: settingsLoading } = useVPSettings();
  const { data: floats = [], isLoading: floatsLoading } = useDriverFloats();
  const { data: disbursements = [], isLoading: disbursementsLoading } = useVPDisbursements();

  const loading = settingsLoading || floatsLoading || disbursementsLoading;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['vpSettings'] });
    queryClient.invalidateQueries({ queryKey: ['driverFloats'] });
    queryClient.invalidateQueries({ queryKey: ['vpDisbursements'] });
  };

  // Calculate date range based on time filter
  const getDateRange = (filter: TimeFilter): { start: Date | null; end: Date | null } => {
    const now = new Date();
    
    switch (filter) {
      case 'day':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'quarter':
        return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case 'annual':
        return { start: startOfYear(now), end: endOfYear(now) };
      default:
        return { start: null, end: null };
    }
  };

  // Calculate total disbursed for selected time period
  const totalDisbursed = useMemo(() => {
    const { start, end } = getDateRange(timeFilter);
    if (!start || !end) {
      return disbursements.reduce((sum, d) => sum + d.amount, 0);
    }
    return disbursements
      .filter(d => {
        const disbursedDate = (d.disbursedAt as any)?.toDate?.() ?? new Date(0);
        return disbursedDate >= start && disbursedDate <= end;
      })
      .reduce((sum, d) => sum + d.amount, 0);
  }, [disbursements, timeFilter]);

  // Calculate total undistributed float
  const totalUndistributedFloat = useMemo(() => {
    return floats.reduce((sum, f) => sum + f.remainingBalance, 0);
  }, [floats]);

  // Calculate unique nurses count
  const uniqueNursesCount = useMemo(() => {
    const nurses = new Set(disbursements.map(d => d.nurseName || d.nurseId).filter(Boolean));
    return nurses.size;
  }, [disbursements]);

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">Finance</h1>
            <p className="text-secondary-600">Venepuncture Payments (VP) management</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 px-3 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            {activeTab === 'floats' && (
              <button
                onClick={() => setAllocateOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded bg-primary-600 text-white hover:bg-primary-700">
                <PlusCircle className="w-4 h-4" />
                Allocate Float
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-4 bg-white border rounded-xl">
            <Banknote className="w-6 h-6 text-primary-600" />
            <div className="flex-1">
              <div className="text-sm text-secondary-600">Default VP per sample</div>
              <div className="text-lg font-semibold">
                {settings ? `${settings.currency} ${settings.defaultAmountPerSample?.toFixed(2)}` : 'Not set'}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 bg-white border rounded-xl">
            <Wallet className="w-6 h-6 text-primary-600" />
            <div className="flex-1">
              <div className="text-sm text-secondary-600">Active Driver Floats</div>
              <div className="text-lg font-semibold">{floats.length}</div>
            </div>
          </div>

          <div 
            className="flex items-center gap-3 p-4 bg-white border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setUndistributedFloatModalOpen(true)}
          >
            <TrendingUp className="w-6 h-6 text-primary-600" />
            <div className="flex-1">
              <div className="text-sm text-secondary-600">Total Undistributed Float</div>
              <div className="text-lg font-semibold">
                {settings?.currency || 'USD'} {totalUndistributedFloat.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Click to view details</div>
            </div>
          </div>

          <div 
            className="flex items-center gap-3 p-4 bg-white border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setNursesModalOpen(true)}
          >
            <Users className="w-6 h-6 text-primary-600" />
            <div className="flex-1">
              <div className="text-sm text-secondary-600">Nurses Paid</div>
              <div className="text-lg font-semibold">{uniqueNursesCount}</div>
              <div className="text-xs text-gray-500 mt-1">Click to view details</div>
            </div>
          </div>
        </div>

        {/* Total Disbursed with Time Filter */}
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-primary-600" />
              <div>
                <div className="text-sm text-secondary-600">Total Disbursed</div>
                <div className="text-2xl font-bold">
                  {settings?.currency || 'USD'} {totalDisbursed.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(['day', 'week', 'month', 'quarter', 'annual'] as TimeFilter[]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`px-3 py-1 text-sm rounded-md capitalize ${
                    timeFilter === filter
                      ? 'bg-primary-100 text-primary-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {filter === 'annual' ? 'Year' : filter}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('floats')}
            className={`px-4 py-2 rounded-lg border ${activeTab === 'floats' ? 'bg-primary-50 text-primary-700 border-primary-200' : 'bg-white text-secondary-700 border-gray-200 hover:bg-gray-50'}`}>
            Driver Floats
          </button>
          <button
            onClick={() => setActiveTab('disbursements')}
            className={`px-4 py-2 rounded-lg border ${activeTab === 'disbursements' ? 'bg-primary-50 text-primary-700 border-primary-200' : 'bg-white text-secondary-700 border-gray-200 hover:bg-gray-50'}`}>
            VP Disbursements
          </button>
        </div>

        {loading ? (
          <div className="animate-pulse text-secondary-600">Loading finance data...</div>
        ) : (
          <>
            {activeTab === 'floats' ? (
              <DriverFloatTable floats={floats} />
            ) : (
              <div className="space-y-6">
                <RecordDisbursementForm
                  settings={settings}
                />
                <VPDisbursementsTable disbursements={disbursements} />
              </div>
            )}
          </>
        )}
      </div>

      <AllocateFloatModal
        isOpen={allocateOpen}
        onClose={() => setAllocateOpen(false)}
        currency={settings?.currency || 'USD'}
      />

      <UndistributedFloatModal
        isOpen={undistributedFloatModalOpen}
        onClose={() => setUndistributedFloatModalOpen(false)}
        floats={floats}
        currency={settings?.currency || 'USD'}
      />

      <NursesPaymentsModal
        isOpen={nursesModalOpen}
        onClose={() => setNursesModalOpen(false)}
        disbursements={disbursements}
        currency={settings?.currency || 'USD'}
      />
    </div>
  );
}


