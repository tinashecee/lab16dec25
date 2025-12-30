import React from 'react';
import { VPDisbursement } from '../../types/finance';

interface VPDisbursementsTableProps {
  disbursements: VPDisbursement[];
}

export default function VPDisbursementsTable({ disbursements }: VPDisbursementsTableProps) {
  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h3 className="text-lg font-semibold">Recent VP Disbursements</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nurse</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {disbursements.map(d => (
              <tr key={d.id}>
                <td className="px-4 py-2 whitespace-nowrap text-sm">{(d.disbursedAt as any)?.toDate?.()?.toLocaleString?.() || ''}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                  {d.patientName || d.sampleId || '—'}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm">{d.nurseName || d.nurseId}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm">{d.driverName || d.driverId}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">{d.currency} {d.amount.toFixed(2)}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm">{d.notes || '-'}</td>
              </tr>
            ))}
            {disbursements.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-sm text-gray-500" colSpan={6}>No disbursements recorded.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


