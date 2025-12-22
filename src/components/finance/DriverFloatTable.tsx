import React, { useState } from 'react';
import { DriverFloat } from '../../types/finance';
import DriverStatementModal from './DriverStatementModal';

interface DriverFloatTableProps {
  floats: DriverFloat[];
}

export default function DriverFloatTable({ floats }: DriverFloatTableProps) {
  const [selectedFloat, setSelectedFloat] = useState<DriverFloat | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRowClick = (float: DriverFloat) => {
    setSelectedFloat(float);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedFloat(null);
  };

  return (
    <>
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Active Driver Floats</h3>
          <p className="text-sm text-secondary-600">Click on a row to view statement</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allocated</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allocated By</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {floats.map((f) => (
                <tr 
                  key={f.id}
                  onClick={() => handleRowClick(f)}
                  className="cursor-pointer hover:bg-primary-50 transition-colors"
                >
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-secondary-900">{f.driverName || f.driverId}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm">{f.currency} {f.allocatedAmount.toFixed(2)}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">{f.currency} {f.remainingBalance.toFixed(2)}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs">
                    <span className={`px-2 py-1 rounded-full ${f.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'}`}>
                      {f.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm">{f.allocatedByUserName || f.allocatedByUserId}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm">{(f.createdAt as any)?.toDate?.()?.toLocaleString?.() || ''}</td>
                </tr>
              ))}
              {floats.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-sm text-gray-500" colSpan={6}>
                    No active floats found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DriverStatementModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        float={selectedFloat}
      />
    </>
  );
}


