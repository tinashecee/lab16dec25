import React, { useState } from 'react';
import { Calendar, FileText, X } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  frequency: string;
  lastGenerated: string;
}

interface ReportGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report;
  onGenerate: (format: 'pdf' | 'excel', startDate: Date, endDate: Date) => void;
}

export default function ReportGenerationModal({
  isOpen,
  onClose,
  report,
  onGenerate
}: ReportGenerationModalProps) {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [format, setFormat] = useState<'pdf' | 'excel'>('pdf');
  const [showPreview, setShowPreview] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = () => {
    onGenerate(format, startDate, endDate);
    if (!showPreview) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-30" onClick={onClose} />
      
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative bg-white rounded-lg max-w-4xl w-full p-6 shadow-xl">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Generate {report.title}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <div className="relative">
                  <DatePicker
                    selected={startDate}
                    onChange={(date: Date) => setStartDate(date)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <Calendar className="w-5 h-5 text-gray-400 absolute right-3 top-2.5" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <div className="relative">
                  <DatePicker
                    selected={endDate}
                    onChange={(date: Date) => setEndDate(date)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    minDate={startDate}
                  />
                  <Calendar className="w-5 h-5 text-gray-400 absolute right-3 top-2.5" />
                </div>
              </div>
            </div>

            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report Format
              </label>
              <div className="flex space-x-4">
                <button
                  onClick={() => setFormat('pdf')}
                  className={`flex items-center px-4 py-2 rounded-md ${
                    format === 'pdf'
                      ? 'bg-primary-50 text-primary-600 border border-primary-200'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <FileText className="w-5 h-5 mr-2" />
                  PDF
                </button>
                <button
                  onClick={() => setFormat('excel')}
                  className={`flex items-center px-4 py-2 rounded-md ${
                    format === 'excel'
                      ? 'bg-primary-50 text-primary-600 border border-primary-200'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Excel
                </button>
              </div>
            </div>

            {/* Preview Option (for PDF only) */}
            {format === 'pdf' && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="preview"
                  checked={showPreview}
                  onChange={(e) => setShowPreview(e.target.checked)}
                  className="h-4 w-4 text-primary-600 rounded border-gray-300"
                />
                <label
                  htmlFor="preview"
                  className="ml-2 text-sm text-gray-700"
                >
                  Show preview before download
                </label>
              </div>
            )}

            {/* PDF Preview */}
            {format === 'pdf' && showPreview && (
              <div className="mt-4 border border-gray-200 rounded-lg h-96">
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  PDF Preview will be shown here
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Generate Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 