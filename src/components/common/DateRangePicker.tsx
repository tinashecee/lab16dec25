import React, { useState } from 'react';
import { Calendar, AlertCircle, Play } from 'lucide-react';

interface DateRangePickerProps {
  onChange: (startDate: Date | null, endDate: Date | null) => void;
  value?: [Date | null, Date | null];
  showGoButton?: boolean;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ 
  onChange, 
  value, 
  showGoButton = true 
}) => {
  const [startDate, setStartDate] = useState<Date | null>(value?.[0] || null);
  const [endDate, setEndDate] = useState<Date | null>(value?.[1] || null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateDates = (start: Date | null, end: Date | null): boolean => {
    // Clear previous validation error
    setValidationError(null);

    // If both dates are selected, validate the range
    if (start && end) {
      if (end < start) {
        setValidationError('End date cannot be earlier than start date');
        return false;
      }
    }
    return true;
  };

  const handleGoClick = () => {
    if (validateDates(startDate, endDate)) {
      onChange(startDate, endDate);
    }
  };

  // Helper to safely get date string for input
  const getDateInputValue = (val: Date | string | null | undefined) => {
    if (!val) return '';
    if (val instanceof Date && !isNaN(val.getTime())) return val.toISOString().slice(0, 10);
    // Try to parse if it's a string
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    return '';
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value ? new Date(e.target.value) : null;
    setStartDate(newStartDate);
    
    // If showGoButton is false, maintain the old behavior of immediate onChange
    if (!showGoButton) {
      if (validateDates(newStartDate, endDate)) {
        onChange(newStartDate, endDate);
      }
    } else {
      // Just validate without triggering onChange
      validateDates(newStartDate, endDate);
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = e.target.value ? new Date(e.target.value) : null;
    setEndDate(newEndDate);
    
    // If showGoButton is false, maintain the old behavior of immediate onChange
    if (!showGoButton) {
      if (validateDates(startDate, newEndDate)) {
        onChange(startDate, newEndDate);
      }
    } else {
      // Just validate without triggering onChange
      validateDates(startDate, newEndDate);
    }
  };

  const handleClearClick = () => {
    setStartDate(null);
    setEndDate(null);
    setValidationError(null);
    onChange(null, null);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="date"
            value={getDateInputValue(startDate)}
            onChange={handleStartDateChange}
            className={`pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              validationError ? 'border-red-300 bg-red-50' : 'border-gray-200'
            }`}
            placeholder="Start date"
          />
          <Calendar className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
        <span className="text-gray-500">to</span>
        <div className="relative">
          <input
            type="date"
            value={getDateInputValue(endDate)}
            onChange={handleEndDateChange}
            className={`pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              validationError ? 'border-red-300 bg-red-50' : 'border-gray-200'
            }`}
            placeholder="End date"
          />
          <Calendar className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
        
        {showGoButton && (
          <>
            <button
              onClick={handleGoClick}
              disabled={(!startDate && !endDate) || !!validationError}
              className="flex items-center gap-1 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              title="Apply date filter"
            >
              <Play className="w-4 h-4" />
              Go
            </button>
            <button
              onClick={handleClearClick}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              title="Clear date filter"
            >
              Clear
            </button>
          </>
        )}
      </div>
      
      {/* Validation Error Message */}
      {validationError && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
}; 