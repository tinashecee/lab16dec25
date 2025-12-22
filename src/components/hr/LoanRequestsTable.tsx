import React, { useState, useEffect } from "react";
import { loanService, type LoanRequest } from "../../services/loanService";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { Check, X, Eye, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import LoanRequestDetailModal from "./LoanRequestDetailModal";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import { generatePDF, downloadExcel } from '../../utils/export';

type StatusType = "All" | "Pending" | "Confirmed" | "Approved" | "Rejected";

const statusTabs: { id: StatusType; label: string }[] = [
  { id: "All", label: "All Requests" },
  { id: "Pending", label: "Pending" },
  { id: "Confirmed", label: "Confirmed" },
  { id: "Approved", label: "Approved" },
  { id: "Rejected", label: "Rejected" },
];

export default function LoanRequestsTable() {
  const { id } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<LoanRequest[]>([]);
  const [activeStatus, setActiveStatus] = useState<StatusType>("All");
  const [selectedRequest, setSelectedRequest] = useState<LoanRequest | null>(
    null
  );
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'All'>(20);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (id) {
      fetchLoanRequests();
    }
  }, [id]);

  const fetchLoanRequests = async () => {
    try {
      setLoading(true);
      const data = await loanService.getLoanRequestsByEmployee(id!);
      setRequests(data);
    } catch (err) {
      console.error("Error fetching loan requests:", err);
      setError("Failed to load loan requests");
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter((request) => {
    if (activeStatus === "All") return true;
    return request.status === activeStatus.toLowerCase();
  });

  const totalPages = itemsPerPage === 'All' ? 1 : Math.ceil(filteredRequests.length / (itemsPerPage as number));
  const paginatedRequests = itemsPerPage === 'All'
    ? filteredRequests
    : filteredRequests.slice((currentPage - 1) * (itemsPerPage as number), currentPage * (itemsPerPage as number));

  const handleDelete = async (requestId: string) => {
    try {
      await loanService.deleteLoanRequest(requestId);
      setRequests((prevRequests) =>
        prevRequests.filter((req) => req.id !== requestId)
      );
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error("Error deleting loan request:", error);
      setError("Failed to delete loan request");
    }
  };

  const openDetailModal = (request: LoanRequest) => {
    setSelectedRequest(request);
    setIsDetailModalOpen(true);
  };

  const openDeleteModal = (request: LoanRequest) => {
    setSelectedRequest(request);
    setIsDeleteModalOpen(true);
  };

  // Export handlers
  const handleExportPDF = async () => {
    if (filteredRequests.length === 0) return;
    const data = filteredRequests.map(({ amount, purpose, repaymentMonths, status }) => ({
      Amount: amount,
      Purpose: purpose,
      'Repayment Period': `${repaymentMonths} months`,
      Status: status,
    }));
    const pdfUrl = await generatePDF(data);
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = 'loan-requests.pdf';
    link.click();
  };

  const handleExportExcel = async () => {
    if (filteredRequests.length === 0) return;
    const data = filteredRequests.map(({ amount, purpose, repaymentMonths, status }) => ({
      Amount: amount,
      Purpose: purpose,
      'Repayment Period': `${repaymentMonths} months`,
      Status: status,
    }));
    await downloadExcel(data, 'loan-requests');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((index) => (
              <div key={index} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button
            onClick={fetchLoanRequests}
            className="mt-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-secondary-600">No loan requests found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <nav className="-mb-px flex space-x-6">
          {statusTabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveStatus(id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeStatus === id
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300"
              }`}>
              {label}
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100">
                {
                  filteredRequests.filter((r) =>
                    id === "All" ? true : r.status === id.toLowerCase()
                  ).length
                }
              </span>
            </button>
          ))}
        </nav>
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

      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Purpose
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Repayment Period
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Submitted
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {paginatedRequests.map((request) => (
            <tr key={request.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">
                ${request.amount.toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                {request.purpose}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                {request.repaymentMonths} months
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    request.status === "approved"
                      ? "bg-green-100 text-green-800"
                      : request.status === "rejected"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}>
                  {request.status.charAt(0).toUpperCase() +
                    request.status.slice(1)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                {new Date(request.createdAt).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {request.status === "pending" ? (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openDeleteModal(request)}
                      className="text-red-600 hover:underline">
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => openDetailModal(request)}
                      className="text-blue-600 hover:underline">
                      <Eye className="w-4 h-4 inline" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => openDetailModal(request)}
                    className="text-blue-600 hover:underline">
                    <Eye className="w-4 h-4 inline" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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

      {/* Modals */}
      <LoanRequestDetailModal
        request={selectedRequest!}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => handleDelete(selectedRequest!.id)}
      />
    </div>
  );
}
