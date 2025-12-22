import React, { useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import LeaveApprovalsTable from '../components/hr/LeaveApprovalsTable';
import LoanApprovalsTable from '../components/hr/LoanApprovalsTable';

type TabType = 'leave' | 'loans';

export default function HRApprovals() {
  const [activeTab, setActiveTab] = useState<TabType>('leave');

  const tabs = [
    { id: 'leave', label: 'Leave Approvals', icon: Calendar },
    { id: 'loans', label: 'Loan Approvals', icon: Clock },
  ] as const;

  const leaveStats = [
    { label: 'Pending Approvals', value: '8', trend: 'Leave requests' },
    { label: 'Approved Today', value: '3', trend: 'Processed requests' },
    { label: 'Rejected Today', value: '1', trend: 'Declined requests' },
    { label: 'Total Requests', value: '25', trend: 'This month' }
  ];

  const loanStats = [
    { label: 'Pending Approvals', value: '5', trend: 'Loan requests' },
    { label: 'Approved Today', value: '2', trend: 'Processed requests' },
    { label: 'Rejected Today', value: '1', trend: 'Declined requests' },
    { label: 'Total Requests', value: '15', trend: 'This month' }
  ];

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">HR Approvals</h1>
          <p className="text-secondary-600">Review and manage staff requests</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(activeTab === 'leave' ? leaveStats : loanStats).map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-secondary-600">{stat.label}</p>
              <p className="text-2xl font-semibold text-secondary-900 mt-1">{stat.value}</p>
              <p className="text-xs text-secondary-500 mt-1">{stat.trend}</p>
            </div>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'leave' ? (
          <LeaveApprovalsTable />
        ) : (
          <LoanApprovalsTable />
        )}
      </div>
    </div>
  );
} 