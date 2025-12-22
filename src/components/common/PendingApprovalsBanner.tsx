import React, { useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { LoanRequest } from '../../services/loanService';
import { LeaveRequest } from '../../types/leave';
import { useAllLeaveRequests } from '../../hooks/queries/useAllLeaveRequests';
import { useAllLoanRequests } from '../../hooks/queries/useAllLoanRequests';

function PendingApprovalsBanner() {
  const navigate = useNavigate();
  const { role, name } = useCurrentUser();
  const [modalOpen, setModalOpen] = useState(false);
  const { data: allLeaves = [], isLoading: leavesLoading } = useAllLeaveRequests();
  const { data: allLoans = [], isLoading: loansLoading } = useAllLoanRequests();

  const pendingLeaves = useMemo<LeaveRequest[]>(() => {
    return allLeaves.filter((leave: LeaveRequest) =>
      ((leave.approver1 === role || leave.approver1 === name) && leave.status === 'PENDING') ||
      ((leave.approver2 === role || leave.approver2 === name) && leave.status === 'CONFIRMED')
    );
  }, [allLeaves, role, name]);

  const pendingLoans = useMemo<LoanRequest[]>(() => {
    return allLoans.filter((loan: LoanRequest) =>
      ((loan.approver1 === role || loan.approver1 === name) && loan.status === 'PENDING') ||
      ((loan.approver2 === role || loan.approver2 === name) && loan.status === 'CONFIRMED')
    );
  }, [allLoans, role, name]);

  const loading = leavesLoading || loansLoading;

  const navigateToLeaveApprovals = () => {
    navigate('/app/hr-approvals', { state: { activeTab: 'leave' } });
  };

  const navigateToLoanApprovals = () => {
    navigate('/app/hr-approvals', { state: { activeTab: 'loan' } });
  };

  const totalPending = pendingLeaves.length + pendingLoans.length;
  if (loading || totalPending === 0) return null;

  return (
    <>
      <div className="bg-primary-100 border border-primary-300 text-primary-800 rounded-lg px-4 py-3 flex items-center gap-3 mb-4">
        <AlertCircle className="w-5 h-5 text-primary-500" />
        <span className="font-semibold">{totalPending} approval{totalPending > 1 ? 's are' : ' is'} pending!</span>
        <span className="ml-2">You have leave or loan applications that require your action.</span>
        <button
          className="ml-auto text-primary-700 underline font-medium hover:text-primary-900 bg-transparent border-0 cursor-pointer"
          onClick={() => setModalOpen(true)}
        >
          View Details
        </button>
      </div>
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              onClick={() => setModalOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4 text-primary-700 flex items-center gap-2">
              Pending Approvals
            </h2>
            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Type</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Applicant</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Details</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingLeaves.map((leave) => (
                    <tr 
                      key={leave.id} 
                      className="border-b hover:bg-primary-50 cursor-pointer transition-colors"
                      onClick={() => {
                        setModalOpen(false);
                        navigateToLeaveApprovals();
                      }}
                    >
                      <td className="px-3 py-2 text-sm">Leave</td>
                      <td className="px-3 py-2 text-sm">{leave.name}</td>
                      <td className="px-3 py-2 text-sm">{leave.type} ({leave.from} - {leave.to})</td>
                      <td className="px-3 py-2 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          leave.status === 'PENDING' 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {leave.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {pendingLoans.map((loan) => (
                    <tr 
                      key={loan.id} 
                      className="border-b hover:bg-primary-50 cursor-pointer transition-colors"
                      onClick={() => {
                        setModalOpen(false);
                        navigateToLoanApprovals();
                      }}
                    >
                      <td className="px-3 py-2 text-sm">Loan</td>
                      <td className="px-3 py-2 text-sm">{loan.employeeName}</td>
                      <td className="px-3 py-2 text-sm">${loan.amount.toLocaleString()} for {loan.purpose}</td>
                      <td className="px-3 py-2 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          loan.status === 'PENDING' 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {loan.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {totalPending === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-gray-500">No pending approvals.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                onClick={() => setModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PendingApprovalsBanner; 