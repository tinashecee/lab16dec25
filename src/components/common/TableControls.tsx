import React, { useState } from 'react';
import { Search, Calendar, Download } from 'lucide-react';
import { DateRangePicker } from './DateRangePicker';
import { format } from 'date-fns';

interface TableControlsProps {
  onSearch: (query: string) => void;
  onDateRangeChange: (startDate: Date | null, endDate: Date | null) => void;
  onExport: (format: 'pdf' | 'excel') => void;
  showDateFilter?: boolean;
}

export const TableControls: React.FC<TableControlsProps> = ({
  onSearch,
  onDateRangeChange,
  onExport,
  showDateFilter = true,
}) => {
  const [showExportOptions, setShowExportOptions] = useState(false);

  const handleDateRangeChange = (dateRange) => {
    // Ensure dateRange is an array before passing to parent
    if (onDateRangeChange && Array.isArray(dateRange)) {
      onDateRangeChange(dateRange[0], dateRange[1]);
    } else {
      console.error("Invalid date range format:", dateRange);
      // Pass a default/empty array to prevent errors
      onDateRangeChange(null, null);
    }
  };

  return (
    <div className="p-4 border-b border-gray-200">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex-1 flex gap-4 w-full sm:w-auto">
          {/* Search Bar */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search..."
              onChange={(e) => onSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          {/* Date Range Filter */}
          {showDateFilter && (
            <DateRangePicker
              onChange={handleDateRangeChange}
            />
          )}
        </div>

        {/* Export Button */}
        <div className="relative">
          <button
            onClick={() => setShowExportOptions(!showExportOptions)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-secondary-600 hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>

          {/* Export Options Dropdown */}
          {showExportOptions && (
            <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
              <div className="py-1" role="menu">
                <button
                  onClick={() => {
                    onExport('pdf');
                    setShowExportOptions(false);
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                >
                  Export as PDF
                </button>
                <button
                  onClick={() => {
                    onExport('excel');
                    setShowExportOptions(false);
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                >
                  Export as Excel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 