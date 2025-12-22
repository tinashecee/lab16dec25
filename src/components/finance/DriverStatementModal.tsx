import React, { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';
import { DriverFloat } from '../../types/finance';
import { format, startOfDay, endOfDay } from 'date-fns';
import { DateRangePicker } from '../common/DateRangePicker';
import { useDriverStatement } from '../../hooks/queries/finance/useFinance';
import type { DriverStatementEntry } from '../../types/finance';

interface DriverStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  float: DriverFloat | null;
}

export default function DriverStatementModal({ isOpen, onClose, float }: DriverStatementModalProps) {
  const [filteredEntries, setFilteredEntries] = useState<DriverStatementEntry[]>([]);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [balanceBroughtForward, setBalanceBroughtForward] = useState<number | null>(null);

  // Use TanStack Query hook
  const { data: statementData, isLoading: loading, error: queryError } = useDriverStatement(float?.id || null);

  // Add currency to entries and store in state
  const allEntries = React.useMemo(() => {
    if (!statementData || !float) return [];
    return statementData.map(e => ({
      ...e,
      currency: float.currency
    }));
  }, [statementData, float]);

  useEffect(() => {
    if (isOpen) {
      setDateRange([null, null]); // Reset date range when modal opens
    }
  }, [isOpen]);

  useEffect(() => {
    applyDateFilter();
  }, [allEntries, dateRange]);

  const error = queryError ? 'Failed to load statement' : null;

  const applyDateFilter = () => {
    const [startDate, endDate] = dateRange;
    
    if (!startDate && !endDate) {
      // No filter - show all entries
      setFilteredEntries(allEntries);
      setBalanceBroughtForward(null);
      return;
    }

    // Filter entries based on date range
    let filtered: DriverStatementEntry[] = [];
    let balanceBF: number | null = null;

    if (startDate && endDate) {
      const start = startOfDay(startDate);
      const end = endOfDay(endDate);
      
      // Find entries within date range
      filtered = allEntries.filter(entry => {
        const entryDate = startOfDay(entry.date);
        return entryDate >= start && entryDate <= end;
      });

      // Calculate balance brought forward (balance before start date)
      const entriesBeforeStart = allEntries.filter(entry => {
        const entryDate = startOfDay(entry.date);
        return entryDate < start;
      });

      if (entriesBeforeStart.length > 0) {
        // Get the last entry before start date
        const lastEntryBeforeStart = entriesBeforeStart[entriesBeforeStart.length - 1];
        balanceBF = lastEntryBeforeStart.balance;
      } else if (allEntries.length > 0) {
        // If there are entries but none before start date, balance BF is 0
        balanceBF = 0;
      }
    } else if (startDate) {
      // Only start date specified
      const start = startOfDay(startDate);
      filtered = allEntries.filter(entry => {
        const entryDate = startOfDay(entry.date);
        return entryDate >= start;
      });

      const entriesBeforeStart = allEntries.filter(entry => {
        const entryDate = startOfDay(entry.date);
        return entryDate < start;
      });

      if (entriesBeforeStart.length > 0) {
        const lastEntryBeforeStart = entriesBeforeStart[entriesBeforeStart.length - 1];
        balanceBF = lastEntryBeforeStart.balance;
      } else if (allEntries.length > 0) {
        balanceBF = 0;
      }
    } else if (endDate) {
      // Only end date specified
      const end = endOfDay(endDate);
      filtered = allEntries.filter(entry => {
        const entryDate = startOfDay(entry.date);
        return entryDate <= end;
      });
      setBalanceBroughtForward(null);
    }

    setFilteredEntries(filtered);
    setBalanceBroughtForward(balanceBF);
  };

  const handleExport = () => {
    if (!float || (filteredEntries.length === 0 && balanceBroughtForward === null)) return;

    const [startDate, endDate] = dateRange;
    const dateRangeStr = startDate && endDate 
      ? `${format(startDate, 'yyyy-MM-dd')}_to_${format(endDate, 'yyyy-MM-dd')}`
      : format(new Date(), 'yyyy-MM-dd');

    const csvRows = [
      ['Driver Statement'],
      [`Driver: ${float.driverName || float.driverId}`],
      [`Float ID: ${float.id}`],
      startDate && endDate 
        ? [`Period: ${format(startDate, 'MMM dd, yyyy')} to ${format(endDate, 'MMM dd, yyyy')}`]
        : ['Period: All Transactions'],
      [`Total Allocated: ${float.currency} ${float.allocatedAmount.toFixed(2)}`],
      [`Remaining Balance: ${float.currency} ${float.remainingBalance.toFixed(2)}`],
      [],
      ['Date', 'Description', 'Amount', 'Balance']
    ];

    // Add balance brought forward if applicable
    if (balanceBroughtForward !== null) {
      csvRows.push([
        format(startDate || allEntries[0]?.date || new Date(), 'yyyy-MM-dd'),
        'Balance Brought Forward',
        '',
        `${float.currency} ${balanceBroughtForward.toFixed(2)}`
      ]);
    }

    filteredEntries.forEach(entry => {
      csvRows.push([
        format(entry.date, 'yyyy-MM-dd HH:mm:ss'),
        entry.description,
        entry.type === 'allocation' || entry.type === 'return' || entry.type === 'refund' 
          ? `+${entry.currency} ${entry.amount.toFixed(2)}`
          : `-${entry.currency} ${entry.amount.toFixed(2)}`,
        `${entry.currency} ${entry.balance.toFixed(2)}`
      ]);
    });

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `driver-statement-${float.driverName || float.driverId}-${dateRangeStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen || !float) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-secondary-900">Driver Statement</h2>
            <p className="text-sm text-secondary-600 mt-1">
              {float.driverName || float.driverId} - Float ID: {float.id}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={filteredEntries.length === 0 && balanceBroughtForward === null}
              className="inline-flex items-center gap-2 px-4 py-2 bg-secondary-100 text-secondary-700 rounded-lg hover:bg-secondary-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={onClose}
              className="p-2 text-secondary-400 hover:text-secondary-600 rounded-lg hover:bg-gray-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-secondary-700">Filter by Date Range:</label>
            <button
              onClick={() => setDateRange([null, null])}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Clear Filter
            </button>
          </div>
          <DateRangePicker
            value={dateRange}
            onChange={(startDate, endDate) => setDateRange([startDate, endDate])}
            showGoButton={false}
          />
        </div>

        {/* Summary */}
        <div className="px-6 py-4 bg-gray-50 border-b grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-secondary-600">Total Allocated</p>
            <p className="text-lg font-semibold text-secondary-900">
              {float.currency} {float.allocatedAmount.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-secondary-600">Remaining Balance</p>
            <p className="text-lg font-semibold text-secondary-900">
              {float.currency} {float.remainingBalance.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-secondary-600">Total Disbursed</p>
            <p className="text-lg font-semibold text-secondary-900">
              {float.currency} {(float.allocatedAmount - float.remainingBalance).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Statement Table */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-center py-8 text-secondary-600">Loading statement...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">{error}</div>
          ) : filteredEntries.length === 0 && balanceBroughtForward === null ? (
            <div className="text-center py-8 text-secondary-600">
              {dateRange[0] || dateRange[1] 
                ? 'No transactions found for the selected date range'
                : 'No transactions found'
              }
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* Balance Brought Forward Row */}
                  {balanceBroughtForward !== null && (
                    <tr className="bg-blue-50 hover:bg-blue-100">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-secondary-900">
                        {dateRange[0] ? format(startOfDay(dateRange[0]), 'MMM dd, yyyy') : ''}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-secondary-900">
                        Balance Brought Forward
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-secondary-600">
                        —
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-secondary-900">
                        {float.currency} {balanceBroughtForward.toFixed(2)}
                      </td>
                    </tr>
                  )}
                  {/* Transaction Rows */}
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary-900">
                        {format(entry.date, 'MMM dd, yyyy HH:mm')}
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary-900">
                        {entry.description}
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${
                        entry.type === 'allocation' || entry.type === 'return' || entry.type === 'refund'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {entry.type === 'allocation' || entry.type === 'return' || entry.type === 'refund'
                          ? `+${entry.currency} ${entry.amount.toFixed(2)}`
                          : `-${entry.currency} ${entry.amount.toFixed(2)}`
                        }
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-secondary-900">
                        {entry.currency} {entry.balance.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

