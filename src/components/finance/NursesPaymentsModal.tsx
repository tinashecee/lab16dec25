import React, { useMemo } from 'react';
import { X, Download } from 'lucide-react';
import { VPDisbursement } from '../../types/finance';
import { format } from 'date-fns';

interface NursesPaymentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  disbursements: VPDisbursement[];
  currency: string;
}

interface NursePaymentSummary {
  nurseName: string;
  nurseId: string;
  totalAmount: number;
  paymentCount: number;
  lastPaymentDate: Date | null;
}

export default function NursesPaymentsModal({
  isOpen,
  onClose,
  disbursements,
  currency
}: NursesPaymentsModalProps) {
  if (!isOpen) return null;

  // Calculate nurse payment summaries
  const nurseSummaries = useMemo(() => {
    const nurseMap = new Map<string, NursePaymentSummary>();

    disbursements.forEach(disb => {
      const nurseKey = disb.nurseName || disb.nurseId || 'Unknown';
      const existing = nurseMap.get(nurseKey);

      if (existing) {
        existing.totalAmount += disb.amount;
        existing.paymentCount += 1;
        const disbursedDate = (disb.disbursedAt as any)?.toDate?.() ?? null;
        if (disbursedDate && (!existing.lastPaymentDate || disbursedDate > existing.lastPaymentDate)) {
          existing.lastPaymentDate = disbursedDate;
        }
      } else {
        const disbursedDate = (disb.disbursedAt as any)?.toDate?.() ?? null;
        nurseMap.set(nurseKey, {
          nurseName: disb.nurseName || 'Unknown',
          nurseId: disb.nurseId || '',
          totalAmount: disb.amount,
          paymentCount: 1,
          lastPaymentDate: disbursedDate
        });
      }
    });

    return Array.from(nurseMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [disbursements]);

  const grandTotal = nurseSummaries.reduce((sum, n) => sum + n.totalAmount, 0);

  const handleExport = () => {
    const csvRows = [
      ['Nurses VP Payments Report'],
      [`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`],
      [`Total Nurses: ${nurseSummaries.length}`],
      [`Grand Total Paid: ${currency} ${grandTotal.toFixed(2)}`],
      [],
      ['Nurse Name', 'Total Amount', 'Payment Count', 'Last Payment Date']
    ];

    nurseSummaries.forEach(nurse => {
      csvRows.push([
        nurse.nurseName,
        `${currency} ${nurse.totalAmount.toFixed(2)}`,
        nurse.paymentCount.toString(),
        nurse.lastPaymentDate ? format(nurse.lastPaymentDate, 'yyyy-MM-dd HH:mm:ss') : ''
      ]);
    });

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nurses-payments-${format(new Date(), 'yyyy-MM-dd')}.csv`;
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
            <h2 className="text-xl font-semibold text-secondary-900">Nurses VP Payments</h2>
            <p className="text-sm text-secondary-600 mt-1">
              {nurseSummaries.length} nurses • Total Paid: <span className="font-medium">{currency} {grandTotal.toFixed(2)}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={nurseSummaries.length === 0}
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
          {nurseSummaries.length === 0 ? (
            <div className="text-center py-8 text-secondary-600">No nurse payments found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nurse Name
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Count
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Payment Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {nurseSummaries.map((nurse, index) => (
                    <tr key={`${nurse.nurseId}-${index}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-secondary-900">
                        {nurse.nurseName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-secondary-900">
                        {currency} {nurse.totalAmount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-secondary-600">
                        {nurse.paymentCount}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-secondary-600">
                        {nurse.lastPaymentDate ? format(nurse.lastPaymentDate, 'MMM dd, yyyy HH:mm') : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-secondary-900">
                      Grand Total ({nurseSummaries.length} nurses):
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-secondary-900 text-right">
                      {currency} {grandTotal.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary-600 text-right">
                      {disbursements.length}
                    </td>
                    <td></td>
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

