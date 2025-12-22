import React from 'react';
import LoanRequestForm from '../components/hr/LoanRequestForm';
import LoanRequestsTable from '../components/hr/LoanRequestsTable';

export default function LoanRequests() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Loan Requests</h1>
          <p className="mt-2 text-sm text-secondary-500">
            Submit a new loan request or view your existing requests below.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <LoanRequestForm />
          </div>
          <div>
            <LoanRequestsTable />
          </div>
        </div>
      </div>
    </div>
  );
} 