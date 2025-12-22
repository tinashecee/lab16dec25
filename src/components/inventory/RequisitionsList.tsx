import React, { useState } from "react";
import { Plus, Filter, Download, Eye, Edit, Trash2, QrCode, Printer } from "lucide-react";
import { Requisition, deleteRequisition } from "../../lib/firestore/inventory";
import NewRequisitionModal from "./NewRequisitionModal";
import ViewRequisitionModal from "./ViewRequisitionModal";
import EditRequisitionModal from "./EditRequisitionModal";
import { useAuth } from "../../hooks/useAuth";
import QRModal from './RequisitionQRModal';
import { useRequisitionsForUser } from "../../hooks/queries/inventory/useRequisitions";
import { useQueryClient } from "@tanstack/react-query";

interface RequisitionsListProps {
  searchQuery: string;
}

export default function RequisitionsList({
  searchQuery,
}: RequisitionsListProps) {
  const { userData } = useAuth();
  const { data: requisitions = [], isLoading: loading, isError } = useRequisitionsForUser(userData?.name);
  const [error, setError] = useState<string | null>(null);
  const [isNewRequisitionModalOpen, setIsNewRequisitionModalOpen] =
    useState(false);
  const [activeStatus, setActiveStatus] =
    useState<Requisition["status"]>("Pending");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedRequisition, setSelectedRequisition] =
    useState<Requisition | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const queryClient = useQueryClient();
  const refetchRequisitions = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory', 'requisitions'] });
  };

  const statusTabs: Requisition["status"][] = [
    "Pending",
    "Confirmed",
    "Approved",
    "Issued",
    "Rejected",
  ];

  const filteredRequisitions = requisitions.filter(
    (req) =>
      req.status === activeStatus &&
      (!dateFilter ||
        req.requestDate.toDate().toISOString().split("T")[0] === dateFilter) &&
      (searchQuery
        ? req.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
          req.products.some((p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : true)
  );

  const handleView = (requisition: Requisition) => {
    setSelectedRequisition(requisition);
    setIsViewModalOpen(true);
  };

  const handleEdit = (requisition: Requisition) => {
    setSelectedRequisition(requisition);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this requisition?")) {
      return;
    }

    try {
      await deleteRequisition(id);
      // Refresh the requisitions list
      refetchRequisitions();
    } catch (error) {
      console.error("Error deleting requisition:", error);
      alert("Failed to delete requisition. Please try again.");
    }
  };

  const handlePrintQR = (requisition: Requisition) => {
    // Implementation for printing QR code
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Status Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {statusTabs.map((status) => (
            <button
              key={status}
              onClick={() => setActiveStatus(status)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                ${
                  activeStatus === status
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300"
                }
              `}>
              {status}
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100">
                {requisitions.filter((r) => r.status === status).length}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button className="inline-flex items-center gap-2 px-4 py-2 text-secondary-600 hover:text-secondary-700">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsNewRequisitionModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            <Plus className="w-4 h-4" />
            New Request
          </button>
        </div>
      </div>

      {/* Requisitions Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Requisition No.
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Request Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Products
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
            {filteredRequisitions.map((req) => (
              <tr 
                key={req.id} 
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => handleView(req)}
              >
                <td className="px-6 py-4 text-sm text-secondary-900 font-medium">
                  {req.dispatchNumber}
                </td>
                <td className="px-6 py-4 text-sm text-secondary-900">
                  {req.requestDate.toDate().toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm text-secondary-900">
                  {req.department}
                </td>
                <td className="px-6 py-4 text-sm text-secondary-600">
                  <ul className="list-disc list-inside">
                    {req.products.map((product, index) => (
                      <li key={index}>
                        {product.name} ({product.requestedQuantity} {product.unit})
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`
                    inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${
                      req.status === "Approved"
                        ? "bg-green-100 text-green-800"
                        : req.status === "Rejected"
                        ? "bg-red-100 text-red-800"
                        : req.status === "Pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-blue-100 text-blue-800"
                    }
                  `}>
                    {req.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleView(req)}
                      className="p-1 text-secondary-400 hover:text-secondary-600 rounded"
                      title="View Details">
                      <Eye className="w-4 h-4" />
                    </button>
                    {req.status === "Pending" && (
                      <>
                        <button
                          onClick={() => handleEdit(req)}
                          className="p-1 text-secondary-400 hover:text-secondary-600 rounded"
                          title="Edit Requisition">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(req.id)}
                          className="p-1 text-red-400 hover:text-red-600 rounded"
                          title="Delete Requisition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {req.status === "Approved" && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedRequisition(req);
                            setShowQRModal(true);
                          }}
                          className="p-1 text-primary-600 hover:bg-primary-50 rounded"
                          title="View QR Code"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePrintQR(req)}
                          className="p-1 text-primary-600 hover:bg-primary-50 rounded"
                          title="Print QR Code"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Requisition Modal */}
      {isNewRequisitionModalOpen && (
        <NewRequisitionModal
          onClose={() => setIsNewRequisitionModalOpen(false)}
        />
      )}

      {/* View Modal */}
      {isViewModalOpen && selectedRequisition && (
        <ViewRequisitionModal
          requisition={selectedRequisition}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedRequisition(null);
          }}
        />
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedRequisition && (
        <EditRequisitionModal
          requisition={selectedRequisition}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedRequisition(null);
          }}
          onSave={async () => {
            // Refresh the requisitions list after edit
            refetchRequisitions();
          }}
        />
      )}

      {showQRModal && selectedRequisition && (
        <QRModal
          requisition={selectedRequisition}
          onClose={() => {
            setShowQRModal(false);
            setSelectedRequisition(null);
          }}
        />
      )}
    </div>
  );
}
