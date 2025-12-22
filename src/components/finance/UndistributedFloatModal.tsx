import React from 'react';
import { X, Download } from 'lucide-react';
import { DriverFloat } from '../../types/finance';
import { format } from 'date-fns';

interface UndistributedFloatModalProps {
  isOpen: boolean;
  onClose: () => void;
  floats: DriverFloat[];
  currency: string;
}

export default function UndistributedFloatModal({
  isOpen,
  onClose,
  floats,
  currency
}: UndistributedFloatModalProps) {
  if (!isOpen) return null;

  const totalUndistributed = floats.reduce((sum, f) => sum + f.remainingBalance, 0);

  const handleExport = () => {
    const csvRows = [
      ['Undistributed Float Report'],
      [`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`],
      [`Total Undistributed: ${currency} ${totalUndistributed.toFixed(2)}`],
      [],
      ['Driver Name', 'Float ID', 'Allocated Amount', 'Remaining Balance', 'Status', 'Allocated By', 'Created Date']
    ];

    floats.forEach(float => {
      csvRows.push([
        float.driverName || float.driverId,
        float.id || '',
        `${currency} ${float.allocatedAmount.toFixed(2)}`,
        `${currency} ${float.remainingBalance.toFixed(2)}`,
        float.status,
        float.allocatedByUserName || float.allocatedByUserId,
        (float.createdAt as any)?.toDate?.()?.toLocaleString() || ''
      ]);
    });

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `undistributed-float-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-secondary-900">Undistributed Float</h2>
            <p className="text-sm text-secondary-600 mt-1">
              Total: <span className="font-medium">{currency} {totalUndistributed.toFixed(2)}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={floats.length === 0}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {floats.length === 0 ? (
            <div className="text-center py-8 text-secondary-600">No active floats found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Driver Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Float ID
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Allocated
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remaining Balance
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Allocated By
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {floats.map((float) => (
                    <tr key={float.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-secondary-900">
                        {float.driverName || float.driverId}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary-600">
                        {float.id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-secondary-900">
                        {currency} {float.allocatedAmount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-secondary-900">
                        {currency} {float.remainingBalance.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        <span className={`px-2 py-1 rounded-full ${
                          float.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'
                        }`}>
                          {float.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary-600">
                        {float.allocatedByUserName || float.allocatedByUserId}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary-600">
                        {(float.createdAt as any)?.toDate?.()?.toLocaleString() || ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-sm font-medium text-secondary-900 text-right">
                      Total Undistributed:
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-secondary-900 text-right">
                      {currency} {totalUndistributed.toFixed(2)}
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

