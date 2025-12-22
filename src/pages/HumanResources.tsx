import React, { useState, useEffect } from "react";
import { Plus, Calendar, Clock } from "lucide-react";
import LeaveManagementTable from "../components/hr/LeaveManagementTable";
import LoanRequestsTable from "../components/hr/LoanRequestsTable";
import LeaveRequestForm from "../components/hr/LeaveRequestForm";
import LoanRequestForm from "../components/hr/LoanRequestForm";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { leaveService } from "../services/leaveService";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";

type TabType = "leave" | "loans";

interface LeaveStats {
  balance: number;
  pending: number;
  approved: number;
  rejected: number;
}

export default function HumanResources() {
  const { id, name, department, loading, dateJoined } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<TabType>("leave");
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [leaveStats, setLeaveStats] = useState<LeaveStats>({
    balance: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  useEffect(() => {
    const fetchLeaveStats = async () => {
      if (!dateJoined || !name || !id) return;

      try {
        // Calculate leave balance
        const today = new Date().toISOString().split("T")[0];
        console.log("Date Joined:", dateJoined); // Debug log
        
        // Update user's leave accrual in the database
        await leaveService.updateUserLeaveAccrual(id);
        
        const totalLeaveDays = leaveService.calculateLeaveDays(
          dateJoined,
          today
        );
        console.log("Total Leave Days:", totalLeaveDays); // Debug log

        // Get current year's leave requests
        const currentYear = new Date().getFullYear();
        const startOfYear = `${currentYear}-01-01`;
        const endOfYear = `${currentYear}-12-31`;

        const leaveRequestsRef = collection(db, "leave-requests");
        const q = query(
          leaveRequestsRef,
          where("name", "==", name),
          where("status", "==", "APPROVED"), // Only count approved requests
          where("date_requested", ">=", startOfYear),
          where("date_requested", "<=", endOfYear)
        );

        const snapshot = await getDocs(q);
        const requests = snapshot.docs.map((doc) => doc.data());

        // Calculate used leave days
        const usedLeaveDays = requests.reduce(
          (total, req) => total + (req.days || 0),
          0
        );
        console.log("Used Leave Days:", usedLeaveDays); // Debug log

        // For someone who joined on January 1, 2023:
        // - Months worked until now (October 2023) = 10 months
        // - Leave accrual rate = 2.5 days per month
        // - Total leave = 10 * 2.5 = 25 days
        // - Balance = 25 - usedLeaveDays

        setLeaveStats({
          balance: totalLeaveDays - usedLeaveDays,
          pending: requests.filter((req) => req.status === "PENDING").length,
          approved: requests.filter((req) => req.status === "APPROVED").length,
          rejected: requests.filter((req) => req.status === "REJECTED").length,
        });
      } catch (error) {
        console.error("Error fetching leave statistics:", error);
      }
    };

    fetchLeaveStats();
  }, [dateJoined, name, id]);

  const stats = [
    {
      label: "Leave Balance",
      value: `${leaveStats.balance.toFixed(2)} days`,
      trend: "Annual leave",
    },
    {
      label: "Pending Requests",
      value: leaveStats.pending.toString(),
      trend: "Awaiting approval",
    },
    {
      label: "Approved",
      value: leaveStats.approved.toString(),
      trend: "This year",
    },
    {
      label: "Rejected",
      value: leaveStats.rejected.toString(),
      trend: "This year",
    },
  ];

  const tabs = [
    { id: "leave", label: "Leave Management", icon: Calendar },
    { id: "loans", label: "Loan Requests", icon: Clock },
  ] as const;

  const loanStats = [
    { label: "Available Limit", value: "$5,000", trend: "Maximum amount" },
    { label: "Pending Requests", value: "1", trend: "Awaiting approval" },
    { label: "Active Loans", value: "2", trend: "Being repaid" },
    { label: "Total Outstanding", value: "$3,200", trend: "Current balance" },
  ];

  const handleSubmitLoanRequest = (data: LoanRequestData) => {
    console.log("Loan request submitted:", data);
    // Add your API call or state update logic
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">
              Human Resources
            </h1>
            <p className="text-secondary-600">
              Manage your leave and loan requests
            </p>
          </div>
          <button
            onClick={() => setIsNewRequestOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
            <Plus className="w-5 h-5" />
            <span>New Request</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2
                  ${
                    activeTab === id
                      ? "border-primary-500 text-primary-600"
                      : "border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300"
                  }
                `}>
                <Icon className="w-5 h-5" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(activeTab === "leave" ? stats : loanStats).map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-secondary-600">{stat.label}</p>
              <p className="text-2xl font-semibold text-secondary-900 mt-1">
                {stat.value}
              </p>
              <p className="text-xs text-secondary-500 mt-1">{stat.trend}</p>
            </div>
          ))}
        </div>

        {/* Content */}
        {activeTab === "leave" ? (
          <LeaveManagementTable />
        ) : (
          <LoanRequestsTable />
        )}

        {isNewRequestOpen && activeTab === "leave" && (
          <LeaveRequestForm
            isOpen={isNewRequestOpen}
            onClose={() => setIsNewRequestOpen(false)}
            employeeId={id}
            employeeName={name}
            department={department}
          />
        )}

        {isNewRequestOpen && activeTab === "loans" && (
          <LoanRequestForm
            isOpen={isNewRequestOpen}
            onClose={() => setIsNewRequestOpen(false)}
            onSubmit={handleSubmitLoanRequest}
          />
        )}
      </div>
    </div>
  );
}
