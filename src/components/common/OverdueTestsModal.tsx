import React, { useState, useEffect } from 'react';

export type OverdueTest = {
  accessionNumber: string;
  patientName: string;
  testName: string;
  targetTAT: string;
  timeLapsed: string;
  comment: string;
};

interface OverdueTestsModalProps {
  open: boolean;
  onClose: () => void;
  onGoToAll?: () => void;
  tests: OverdueTest[];
}

export default function OverdueTestsModal({ open, onClose, onGoToAll, tests: initialTests }: OverdueTestsModalProps) {
  const [tests, setTests] = useState(initialTests);

  useEffect(() => {
    setTests(initialTests);
  }, [initialTests]);

  if (!open) return null;

  const handleCommentChange = (idx: number, value: string) => {
    setTests(tests => tests.map((t, i) => i === idx ? { ...t, comment: value } : t));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6 relative">
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-xl font-bold mb-4 text-red-700 flex items-center gap-2">
          Overdue Tests
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Accession #</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Patient Name</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Test</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Target TAT</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Time Lapsed</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Comments</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((test, idx) => (
                <tr key={test.accessionNumber + test.testName} className="border-b">
                  <td className="px-3 py-2 text-sm">{test.accessionNumber}</td>
                  <td className="px-3 py-2 text-sm">{test.patientName}</td>
                  <td className="px-3 py-2 text-sm">{test.testName}</td>
                  <td className="px-3 py-2 text-sm">{test.targetTAT}</td>
                  <td className="px-3 py-2 text-sm text-red-700 font-semibold">{test.timeLapsed}</td>
                  <td className="px-3 py-2 text-sm">
                    <textarea
                      className="w-full border rounded p-1 text-xs"
                      rows={2}
                      placeholder="Add reason or notes..."
                      value={test.comment}
                      onChange={e => handleCommentChange(idx, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            onClick={onClose}
          >
            Close
          </button>
          {onGoToAll && (
            <button
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
              onClick={onGoToAll}
            >
              Go to All Overdue Samples
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 