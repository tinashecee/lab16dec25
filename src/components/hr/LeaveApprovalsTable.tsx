import React, { useState, useMemo } from "react";
import {
  Check,
  User,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import SearchBar from "../common/SearchBar";
import { useAuth } from "../../hooks/useAuth";
import ConfirmationDialog from "../common/ConfirmationDialog";
import { LeaveRequest } from "../../types/leave";
import LeaveRequestDetailModal from "./LeaveRequestDetailModal";
import { generatePDF, downloadExcel } from '../../utils/export';
import { usePendingLeaveRequests } from "../../hooks/queries/usePendingLeaveRequests";
import { useApproveLeaveRequest, useConfirmLeaveRequest, useRejectLeaveRequest } from "../../hooks/mutations/leaveMutations";

type StatusType = "PENDING" | "CONFIRMED" | "APPROVED" | "REJECTED" | "All";

const statusTabs: { id: StatusType; label: string }[] = [
  { id: "All", label: "All Requests" },
  { id: "PENDING", label: "Pending" },
  { id: "CONFIRMED", label: "Confirmed" },
  { id: "APPROVED", label: "Approved" },
  { id: "REJECTED", label: "Rejected" },
];

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-100",
  CONFIRMED: "bg-blue-50 text-blue-700 border-blue-100",
  APPROVED: "bg-green-50 text-green-700 border-green-100",
  REJECTED: "bg-red-50 text-red-700 border-red-100",
};

export default function LeaveApprovalsTable() {
  const { userData } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeStatus, setActiveStatus] = useState<StatusType>("PENDING");
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(
    null
  );
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [modalMode, setModalMode] = useState<"view" | "confirm" | "approve">(
    "view"
  );
  const [itemsPerPage, setItemsPerPage] = useState<number | 'All'>(20);

  const { data: initialRequests = [], isLoading } = usePendingLeaveRequests(userData?.role);
  React.useEffect(() => {
    setLeaveRequests(initialRequests);
  }, [initialRequests]);

  const confirmMutation = useConfirmLeaveRequest(userData?.role);
  const approveMutation = useApproveLeaveRequest(userData?.role);
  const rejectMutation = useRejectLeaveRequest(userData?.role);

  const handleConfirm = async (requestId: string) => {
    if (!userData?.id) return;

    try {
      await confirmMutation.mutateAsync({ requestId, approverId: userData.id });
      
      // Update the local state to reflect the confirmation immediately
      setLeaveRequests(prev => 
        prev.map(request => 
          request.id === requestId 
            ? { ...request, status: "CONFIRMED", confirmedBy: userData.id }
            : request
        )
      );
      
      // Switch to the confirmed tab to show the confirmed request
      setActiveStatus("CONFIRMED");
    } catch (error) {
      console.error("Error confirming leave request:", error);
      setError("Failed to confirm leave request. Please try again.");
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!userData?.id) return;

    try {
      await approveMutation.mutateAsync({ requestId, approverId: userData.id });
      
      // Update the local state to reflect the approval immediately
      setLeaveRequests(prev => 
        prev.map(request => 
          request.id === requestId 
            ? { ...request, status: "APPROVED", approvedBy: userData.id }
            : request
        )
      );
      
      // Switch to the approved tab to show the approved request
      setActiveStatus("APPROVED");
    } catch (error) {
      console.error("Error approving leave request:", error);
      setError("Failed to approve leave request. Please try again.");
    }
  };

  const handleReject = async () => {
    if (!userData?.id || !selectedRequest || !rejectionReason) return;

    try {
      await rejectMutation.mutateAsync({ requestId: selectedRequest.id, rejectorId: userData.id, reason: rejectionReason });
      
      // Update the local state to reflect the rejection immediately
      setLeaveRequests(prev => 
        prev.map(request => 
          request.id === selectedRequest.id 
            ? { ...request, status: "REJECTED", rejectionReason }
            : request
        )
      );
      
      // Switch to the rejected tab to show the rejected request
      setActiveStatus("REJECTED");
      
      // Close the rejection dialog
      setShowRejectDialog(false);
      setSelectedRequest(null);
      setRejectionReason("");
    } catch (error) {
      console.error("Error rejecting leave request:", error);
      setError("Failed to reject leave request. Please try again.");
    }
  };

  const filteredRequests = useMemo(() => {
    return leaveRequests
      .filter((request) =>
        activeStatus === "All" ? true : request.status === activeStatus
      )
      .filter(
        (request) =>
          request.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          request.department
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          request.type?.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [searchQuery, activeStatus, leaveRequests]);

  const totalPages = itemsPerPage === 'All' ? 1 : Math.ceil(filteredRequests.length / (itemsPerPage as number));
  const paginatedRequests = itemsPerPage === 'All'
    ? filteredRequests
    : filteredRequests.slice((currentPage - 1) * (itemsPerPage as number), currentPage * (itemsPerPage as number));

  // Export handlers
  const handleExportPDF = async () => {
    if (filteredRequests.length === 0) return;
    const data = filteredRequests.map(({ name, department, type, days, from, to, status }) => ({
      Name: name,
      Department: department,
      Type: type,
      Days: days,
      Period: `${from} - ${to}`,
      Status: status,
    }));
    const pdfUrl = await generatePDF(data);
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = 'leave-approvals.pdf';
    link.click();
  };

  const handleExportExcel = async () => {
    if (filteredRequests.length === 0) return;
    const data = filteredRequests.map(({ name, department, type, days, from, to, status }) => ({
      Name: name,
      Department: department,
      Type: type,
      Days: days,
      Period: `${from} - ${to}`,
      Status: status,
    }));
    await downloadExcel(data, 'leave-approvals');
  };

  if (isLoading || !userData?.role) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const renderActionButtons = (request: LeaveRequest) => {
    const actions = [];

    // View action for all requests
    actions.push(
      <button
        key="view"
        onClick={() => {
          setSelectedRequest(request);
          setModalMode("view");
          setShowDetailModal(true);
        }}
        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
        title="View Details">
        <Eye className="w-4 h-4" />
      </button>
    );

    // Confirm/Reject actions for department managers
    if (request.approver1 === userData.role && request.status === "PENDING") {
      actions.push(
        <button
          key="confirm"
          onClick={() => {
            setSelectedRequest(request);
            setModalMode("confirm");
            setShowDetailModal(true);
          }}
          className="p-1 text-green-600 hover:bg-green-50 rounded"
          title="Confirm">
          <Check className="w-4 h-4" />
        </button>
      );
    }

    // Approve/Reject actions for Finance Manager (now only for other managers' requests)
    if (userData.role === "Finance Manager" && 
        (request.status === "CONFIRMED" || 
         (request.status === "PENDING" && request.approver1 === "Finance Manager"))) {
      actions.push(
        <button
          key="approve"
          onClick={() => {
            setSelectedRequest(request);
            setModalMode("approve");
            setShowDetailModal(true);
          }}
          className="p-1 text-green-600 hover:bg-green-50 rounded"
          title="Approve">
          <Check className="w-4 h-4" />
        </button>
      );
    }

    // Approve/Reject actions for Finance Executive (for Finance Manager's requests)
    if (userData.role === "Finance Executive" && 
        (request.status === "CONFIRMED" || 
         (request.status === "PENDING" && request.approver1 === "Finance Executive"))) {
      actions.push(
        <button
          key="approve"
          onClick={() => {
            setSelectedRequest(request);
            setModalMode("approve");
            setShowDetailModal(true);
          }}
          className="p-1 text-green-600 hover:bg-green-50 rounded"
          title="Approve">
          <Check className="w-4 h-4" />
        </button>
      );
    }

    return actions;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <h2 className="font-semibold text-secondary-900">Leave Approvals</h2>
          <div className="flex flex-wrap gap-2 items-center">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by employee, department..."
            />
            <select
              className="border rounded px-2 py-1 text-sm"
              value={itemsPerPage}
              onChange={e => {
                const val = e.target.value;
                setItemsPerPage(val === 'All' ? 'All' : parseInt(val));
                setCurrentPage(1);
              }}
            >
              {[20, 40, 60, 80, 100].map(num => (
                <option key={num} value={num}>{num} / page</option>
              ))}
              <option value="All">All</option>
            </select>
            <button
              className="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 text-xs"
              onClick={handleExportPDF}
              title="Export to PDF"
            >Export PDF</button>
            <button
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
              onClick={handleExportExcel}
              title="Export to Excel"
            >Export Excel</button>
          </div>
        </div>
      </div>

      <div className="px-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          {statusTabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => {
                setActiveStatus(id);
                setCurrentPage(1);
              }}
              className={
                `
                py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                ${
                  activeStatus === id
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300"
                }
              `}>
              {label}
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100">
                {
                  leaveRequests.filter((r) =>
                    id === "All" ? true : r.status === id
                  ).length
                }
              </span>
            </button>
          ))}
        </nav>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                Employee
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                Department
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                Type
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                Duration
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedRequests.map((request) => (
              <tr key={request.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8">
                      <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-500" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {request.name}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {request.department}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {request.type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {request.days} days
                  </div>
                  <div className="text-sm text-gray-500">
                    {request.from} - {request.to}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      statusColors[request.status]
                    }`}>
                    {request.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    {renderActionButtons(request)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-secondary-600">
            Showing {filteredRequests.length === 0 ? 0 : Math.min(filteredRequests.length, (currentPage - 1) * (itemsPerPage === 'All' ? filteredRequests.length : itemsPerPage as number) + 1)} to {filteredRequests.length === 0 ? 0 : Math.min(filteredRequests.length, currentPage * (itemsPerPage === 'All' ? filteredRequests.length : itemsPerPage as number))} of {filteredRequests.length} results
          </div>
          {itemsPerPage !== 'All' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 text-secondary-600 hover:text-secondary-900 disabled:opacity-50">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 text-secondary-600 hover:text-secondary-900 disabled:opacity-50">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {showRejectDialog && (
        <ConfirmationDialog
          title="Reject Leave Request"
          message="Please provide a reason for rejecting this leave request."
          isOpen={showRejectDialog}
          onClose={() => {
            setShowRejectDialog(false);
            setSelectedRequest(null);
            setRejectionReason("");
          }}
          onConfirm={handleReject}>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="w-full mt-4 p-2 border border-gray-300 rounded-md"
            placeholder="Enter rejection reason..."
            rows={3}
          />
        </ConfirmationDialog>
      )}

      {showDetailModal && selectedRequest && (
        <LeaveRequestDetailModal
          request={selectedRequest}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedRequest(null);
          }}
          mode={modalMode}
          onConfirm={handleConfirm}
          onReject={handleReject}
          onApprove={handleApprove}
        />
      )}
    </div>
  );
}
