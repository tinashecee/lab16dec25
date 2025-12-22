import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { useAuth } from "../../hooks/useAuth";
import { emailApi } from "../../api/emailApi";
import SearchBar from "../common/SearchBar";
import {
  Calendar,
  Check,
  X,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import LeaveRequestDetailModal from "./LeaveRequestDetailModal";
import LeaveRequestForm from "./LeaveRequestForm";
import { generatePDF, downloadExcel } from '../../utils/export';

interface LeaveRequest {
  id: string;
  request_id: string;
  name: string;
  email: string;
  type: string;
  from: string;
  to: string;
  days: number;
  status: "PENDING" | "CONFIRMED" | "APPROVED" | "REJECTED" | "ISSUED";
  date_requested: string;
  department: string;
  approver1: string;
  approver2: string;
  comments: string;
  contact: string;
  reason: string;
  leaveDaysBalance: number;
}

export default function LeaveManagementTable() {
  const { userData } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(
    null
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'All'>(20);
  const [currentPage, setCurrentPage] = useState(1);

  const statusTabs = [
    { id: "All", label: "All Requests" },
    { id: "PENDING", label: "Pending" },
    { id: "CONFIRMED", label: "Confirmed" },
    { id: "APPROVED", label: "Approved" },
    { id: "REJECTED", label: "Rejected" },
    { id: "ISSUED", label: "Issued" },
  ];

  const filteredRequests = leaveRequests.filter((request) => {
    const matchesSearch =
      request.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      activeStatus === "All" || request.status === activeStatus;
    return matchesSearch && matchesStatus;
  });

  const totalPages = itemsPerPage === 'All' ? 1 : Math.ceil(filteredRequests.length / (itemsPerPage as number));
  const paginatedRequests = itemsPerPage === 'All'
    ? filteredRequests
    : filteredRequests.slice((currentPage - 1) * (itemsPerPage as number), currentPage * (itemsPerPage as number));

  const fetchLeaveRequests = async () => {
    if (!userData?.name) return;

    try {
      const leaveRef = collection(db, "leave-requests");
      let q;

      q = query(leaveRef, where("name", "==", userData.name));

      const snapshot = await getDocs(q);
      const requests = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as LeaveRequest[];

      setLeaveRequests(requests);
      setError(null);
    } catch (err) {
      console.error("Error fetching leave requests:", err);
      setError("Failed to fetch leave requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveRequests();
  }, [userData]);

  const handleView = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
  };

  const handleEdit = (request: LeaveRequest) => {
    setEditingRequest(request);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (requestId: string) => {
    if (!window.confirm("Are you sure you want to delete this request?")) {
      return;
    }

    try {
      const docRef = doc(db, "leave-requests", requestId);
      await deleteDoc(docRef);
      await fetchLeaveRequests();
    } catch (error) {
      console.error("Error deleting request:", error);
      alert("Failed to delete request");
    }
  };

  // Export handlers
  const handleExportPDF = async () => {
    if (filteredRequests.length === 0) return;
    const data = filteredRequests.map(({ request_id, name, department, type, days, from, to, status }) => ({
      'Request ID': request_id,
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
    link.download = 'leave-management.pdf';
    link.click();
  };

  const handleExportExcel = async () => {
    if (filteredRequests.length === 0) return;
    const data = filteredRequests.map(({ request_id, name, department, type, days, from, to, status }) => ({
      'Request ID': request_id,
      Name: name,
      Department: department,
      Type: type,
      Days: days,
      Period: `${from} - ${to}`,
      Status: status,
    }));
    await downloadExcel(data, 'leave-management');
  };

  const renderTableRow = (request: LeaveRequest) => (
    <tr key={request.id}>
      <td className="px-6 py-4 text-sm text-gray-900">{request.request_id}</td>
      <td className="px-6 py-4 text-sm text-gray-900">{request.name}</td>
      <td className="px-6 py-4 text-sm text-gray-900">{request.department}</td>
      <td className="px-6 py-4 text-sm text-gray-900">{request.type}</td>
      <td className="px-6 py-4 text-sm text-gray-900">
        <div>
          <p>{request.days} days</p>
          <p className="text-xs text-gray-500">
            {request.from} - {request.to}
          </p>
        </div>
      </td>
      <td className="px-6 py-4">
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            request.status === "PENDING"
              ? "bg-amber-50 text-amber-700 border border-amber-100"
              : request.status === "CONFIRMED"
              ? "bg-blue-50 text-blue-700 border border-blue-100"
              : request.status === "APPROVED"
              ? "bg-green-50 text-green-700 border border-green-100"
              : request.status === "REJECTED"
              ? "bg-red-50 text-red-700 border border-red-100"
              : "bg-purple-50 text-purple-700 border border-purple-100"
          }`}>
          {request.status}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleView(request)}
            className="p-1 text-gray-600 hover:bg-gray-100 rounded"
            title="View">
            <Eye className="w-4 h-4" />
          </button>

          {request.status === "PENDING" && request.name === userData?.name && (
            <>
              <button
                onClick={() => handleEdit(request)}
                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                title="Edit">
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(request.id)}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
                title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}

          {request.status === "PENDING" && userData?.role === "Lab Manager" && (
            <>
              <button
                onClick={() => handleApprove(request.id)}
                className="p-1 text-green-600 hover:bg-green-50 rounded"
                title="Approve">
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleReject(request.id)}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
                title="Reject">
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );

  const renderActionButtons = (request: LeaveRequest) => {
    return (
      <div className="flex items-center space-x-2">
        <button
          onClick={() => {
            setSelectedRequest(request);
            setShowDetailModal(true);
          }}
          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
          title="View Details">
          <Eye className="w-4 h-4" />
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
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

          {/* Status Tabs */}
          <div className="px-4 border-b border-gray-200">
            <nav className="-mb-px flex space-x-6">
              {statusTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveStatus(tab.id)}
                  className={`
                py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                    ${
                      activeStatus === tab.id
                        ? "border-primary-500 text-primary-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }
                  `}>
                  {tab.label}
                  <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100">
                    {
                      leaveRequests.filter((r) =>
                        tab.id === "All" ? true : r.status === tab.id
                      ).length
                    }
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Request ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedRequests.map(renderTableRow)}
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
        </div>
      </div>

      {isEditModalOpen && editingRequest && (
        <LeaveRequestForm
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingRequest(null);
          }}
          employeeId={editingRequest.id}
          employeeName={editingRequest.name}
          department={editingRequest.department}
          initialData={editingRequest}
        />
      )}

      {showDetailModal && selectedRequest && (
        <LeaveRequestDetailModal
          request={selectedRequest}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedRequest(null);
          }}
          mode="view"
        />
      )}
    </>
  );
}
