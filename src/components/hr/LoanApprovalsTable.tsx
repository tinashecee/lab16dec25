import React, { useState, useMemo } from "react";
import { Check, X, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import SearchBar from "../common/SearchBar";
import { loanService, type LoanRequest } from "../../services/loanService";
import { useAuth } from "../../hooks/useAuth";
import ViewLoanRequestModal from "./ViewLoanRequestModal";
import ApprovalModal from "./ApprovalModal";
import RejectionModal from "./RejectionModal";
import { generatePDF, downloadExcel } from '../../utils/export';
import { useAllLoanRequests } from "../../hooks/queries/useAllLoanRequests";
import { useUpdateLoanStatus } from "../../hooks/mutations/loanMutations";

type StatusType = "ALL" | "PENDING" | "CONFIRMED" | "APPROVED" | "REJECTED";

const statusTabs: { id: StatusType; label: string }[] = [
  { id: "ALL", label: "All Requests" },
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

export default function LoanApprovalsTable() {
  const { userData } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeStatus, setActiveStatus] = useState<StatusType>("ALL");
  const [loanRequests, setLoanRequests] = useState<LoanRequest[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'All'>(20);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<LoanRequest | null>(
    null
  );
  const [showViewModal, setShowViewModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  const { data: allLoans = [], isLoading } = useAllLoanRequests();
  React.useEffect(() => {
    if (
      userData.role === "Finance Manager" ||
      userData.role === "Finance Executive"
    ) {
      setLoanRequests(allLoans);
    } else {
      setLoanRequests([]);
    }
  }, [allLoans, userData]);

  const updateStatus = useUpdateLoanStatus();

  const filteredRequests = useMemo(() => {
    return loanRequests.filter((request) => {
      if (activeStatus === "ALL") return true;
      return request.status === activeStatus;
    });
  }, [activeStatus, loanRequests]);

  const totalPages = itemsPerPage === 'All' ? 1 : Math.ceil(filteredRequests.length / (itemsPerPage as number));
  const paginatedRequests = itemsPerPage === 'All'
    ? filteredRequests
    : filteredRequests.slice((currentPage - 1) * (itemsPerPage as number), currentPage * (itemsPerPage as number));

  // Export handlers
  const handleExportPDF = async () => {
    if (filteredRequests.length === 0) return;
    const data = filteredRequests.map(({ employeeName, amount, status, repaymentMonths }) => ({
      'Employee Name': employeeName,
      Amount: amount,
      Status: status,
      'Repayment Period': `${repaymentMonths} months`,
    }));
    const pdfUrl = await generatePDF(data);
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = 'loan-approvals.pdf';
    link.click();
  };

  const handleExportExcel = async () => {
    if (filteredRequests.length === 0) return;
    const data = filteredRequests.map(({ employeeName, amount, status, repaymentMonths }) => ({
      'Employee Name': employeeName,
      Amount: amount,
      Status: status,
      'Repayment Period': `${repaymentMonths} months`,
    }));
    await downloadExcel(data, 'loan-approvals');
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-secondary-900">Loan Approvals</h2>
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search requests..."
          />
        </div>
      </div>

      {/* Status Tabs */}
      <div className="px-4 border-b border-gray-200">
        <div className="flex flex-wrap gap-2 items-center mt-2 md:mt-0">
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

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Employee Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedRequests.map((request) => (
              <tr key={request.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">{request.employeeName}</td>
                <td className="px-6 py-4">{request.amount}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 text-xs rounded-full border ${
                      statusColors[request.status]
                    }`}>
                    {request.status}
                  </span>
                </td>
                <td className="px-6 py-4 flex space-x-2">
                  {userData.role === "Finance Manager" &&
                    request.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowApprovalModal(true);
                          }}
                          className="flex items-center text-green-600 hover:bg-green-50 rounded">
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowRejectionModal(true);
                          }}
                          className="flex items-center text-red-600 hover:bg-red-50 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  {userData.role === "Finance Executive" &&
                    request.status === "CONFIRMED" && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowApprovalModal(true);
                          }}
                          className="flex items-center text-green-600 hover:bg-green-50 rounded">
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowRejectionModal(true);
                          }}
                          className="flex items-center text-red-600 hover:bg-red-50 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  <button
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowViewModal(true);
                    }}
                    className="flex items-center text-blue-600 hover:bg-blue-50 rounded">
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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

      {showViewModal && selectedRequest && (
        <ViewLoanRequestModal
          request={selectedRequest}
          onClose={() => setShowViewModal(false)}
        />
      )}

      {showApprovalModal && selectedRequest && (
        <ApprovalModal
          requisitionId={selectedRequest.id}
          userData={userData}
          onClose={() => setShowApprovalModal(false)}
          onSuccess={async () => {
            try {
              await updateStatus.mutateAsync({
                requestId: selectedRequest.id,
                status: "CONFIRMED",
                additionalData: {
                  approvedBy: userData.name,
                  approvedAt: new Date().getTime(),
                },
              });
            } catch (error) {
              console.error("Error updating loan request status:", error);
            }
            setShowApprovalModal(false);
          }}
        />
      )}

      {showRejectionModal && selectedRequest && (
        <RejectionModal
          requisitionId={selectedRequest.id}
          onClose={() => setShowRejectionModal(false)}
          onSuccess={async () => {
            try {
              await updateStatus.mutateAsync({
                requestId: selectedRequest.id,
                status: "REJECTED",
              });
            } catch (error) {
              console.error("Error updating loan request status:", error);
            }
            setShowRejectionModal(false);
          }}
        />
      )}
    </div>
  );
}
