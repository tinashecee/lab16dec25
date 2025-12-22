import React, { useState } from 'react';
import LeaveRequestForm from '../components/hr/LeaveRequestForm';
import LeaveManagementTable from '../components/hr/LeaveManagementTable';
import { useCurrentUser } from '../hooks/useCurrentUser';

export default function LeaveRequests() {
  const { id, name, department } = useCurrentUser();
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">Leave Requests</h1>
            <p className="mt-2 text-sm text-secondary-500">
              View your leave requests or submit a new request.
            </p>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            New Leave Request
          </button>
        </div>

        <LeaveManagementTable />

        <LeaveRequestForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          employeeId={id}
          employeeName={name}
          department={department}
        />
      </div>
    </div>
  );
} 