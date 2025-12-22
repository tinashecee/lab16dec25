import React, { useEffect, useState } from "react";
import { loanService } from "../../services/loanService";
import { useAuth } from "../../hooks/useAuth";

const LoanStatistics = () => {
  const { userData } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [approvalsToday, setApprovalsToday] = useState(0);
  const [rejectedToday, setRejectedToday] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);

  useEffect(() => {
    const fetchStatistics = async () => {
      if (
        userData.role === "Finance Manager" ||
        userData.role === "Finance Executive"
      ) {
        try {
          const pending = await loanService.getPendingLoanRequests();
          const todayApprovals = await loanService.getApprovalsToday();
          const todayRejections = await loanService.getRejectionsToday();
          const total = await loanService.getTotalLoanRequests();

          setPendingApprovals(pending.length);
          setApprovalsToday(todayApprovals);
          setRejectedToday(todayRejections);
          setTotalRequests(total);
        } catch (error) {
          console.error("Error fetching loan statistics:", error);
        }
      }
    };

    fetchStatistics();
  }, [userData.role]);

  if (
    userData.role !== "Finance Manager" &&
    userData.role !== "Finance Executive"
  ) {
    return null; // Do not render if the user does not have the right role
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold">Pending Approvals</h3>
        <p className="text-2xl font-bold">{pendingApprovals}</p>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold">Approvals Today</h3>
        <p className="text-2xl font-bold">{approvalsToday}</p>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold">Rejected Today</h3>
        <p className="text-2xl font-bold">{rejectedToday}</p>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold">Total Requests</h3>
        <p className="text-2xl font-bold">{totalRequests}</p>
      </div>
    </div>
  );
};

export default LoanStatistics;
