import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { getRequisitions, Requisition } from "../../lib/firestore/inventory";
import { ApprovalModal } from "./ApprovalModal";
import { RejectionModal } from "./RejectionModal";
import InventoryHandoverModal from "./InventoryHandoverModal";
import { Eye } from "lucide-react";
import ViewRequisitionModal from "./ViewRequisitionModal";

export default function RequisitionApprovals() {
  const { userData } = useAuth();
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [selectedRequisition, setSelectedRequisition] =
    useState<Requisition | null>(null);
  const [modalType, setModalType] = useState<
    "approve" | "reject" | "view" | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");

  const isFinanceManager = userData?.role === "Finance Manager";
  const isAccountsClerk = userData?.role === "Accounts Clerk";

  // Debug logging
  console.log("Current user role:", userData?.role);
  console.log("Is Finance Manager:", isFinanceManager);
  console.log("Is Accounts Clerk:", isAccountsClerk);

  const fetchRequisitions = async () => {
    try {
      setLoading(true);
      console.log("Fetching requisitions...");
      const allRequisitions = await getRequisitions();
      console.log("Fetched requisitions:", allRequisitions.map(r => ({ id: r.id, status: r.status, dispatchNumber: r.dispatchNumber })));
      
      // Check if our specific requisition is in the fetched data
      const specificReq = allRequisitions.find(r => r.dispatchNumber === "REQ-2025-000001");
      if (specificReq) {
        console.log("Found REQ-2025-000001 in fetched data:", { 
          id: specificReq.id, 
          status: specificReq.status, 
          dispatchNumber: specificReq.dispatchNumber,
          updatedAt: specificReq.updatedAt 
        });
      } else {
        console.log("REQ-2025-000001 NOT found in fetched data");
      }

      // Filter requisitions based on role
      let userRequisitions;
      if (isFinanceManager || isAccountsClerk) {
        // Finance Manager and Accounts Clerk see all requisitions
        userRequisitions = allRequisitions;
      } else {
        // Other roles only see requisitions where they are approver1
        userRequisitions = allRequisitions.filter(
          (req) => userData?.role === req.approver1
        );
      }

      console.log("Filtered requisitions for user:", userRequisitions.map(r => ({ id: r.id, status: r.status, dispatchNumber: r.dispatchNumber })));
      setRequisitions(userRequisitions);
    } catch (error) {
      console.error("Error fetching requisitions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequisitions();
  }, [userData?.role]);

  // Filter requisitions by status for each tab
  // Note: Completed status requisitions are included in Delivered tab for backward compatibility
  const filteredRequisitions = {
    pending: requisitions.filter((req) => req.status === "Pending"),
    confirmed: requisitions.filter((req) => req.status === "Confirmed"),
    approved: requisitions.filter((req) => req.status === "Approved"),
    issued: requisitions.filter((req) => req.status === "Issued"),
    delivered: requisitions.filter((req) => req.status === "Delivered" || req.status === "Completed"),
    rejected: requisitions.filter((req) => req.status === "Rejected"),
  };

  // Determine if user can action a requisition
  const canAction = (requisition: Requisition) => {
    const canAct = (() => {
      // Finance Manager can approve Confirmed requests
      if (isFinanceManager && requisition.status === "Confirmed") {
        return true;
      }
      // Department Head (approver1) can confirm Pending requests
      if (userData?.role === requisition.approver1 && requisition.status === "Pending") {
        return true;
      }
      // Driver can confirm handover for Issued requests
      if (userData?.role === "Driver" && requisition.status === "Issued") {
        return true;
      }
      return false;
    })();
    
    // Debug logging
    console.log(`Requisition ${requisition.dispatchNumber}:`, {
      status: requisition.status,
      approver1: requisition.approver1,
      userRole: userData?.role,
      isFinanceManager,
      isAccountsClerk,
      canAction: canAct
    });
    
    return canAct;
  };

  const handleAction = (
    requisition: Requisition,
    action: "approve" | "reject" | "issue" | "driver_handover" | "view"
  ) => {
    // Debug logging
    console.log("handleAction called with:", { 
      action, 
      requisitionId: requisition.id, 
      dispatchNumber: requisition.dispatchNumber,
      status: requisition.status 
    });
    
    setSelectedRequisition(requisition);
    setModalType(action);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Debug Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Debug Info:</h3>
        <p className="text-sm text-blue-700">
          <strong>Current User Role:</strong> {userData?.role || "Not loaded"}
        </p>
        <p className="text-sm text-blue-700">
          <strong>Is Finance Manager:</strong> {isFinanceManager ? "Yes" : "No"}
        </p>
        <p className="text-sm text-blue-700">
          <strong>Is Accounts Clerk:</strong> {isAccountsClerk ? "Yes" : "No"}
        </p>
        <p className="text-sm text-blue-700">
          <strong>Confirmed Requests:</strong> {filteredRequisitions.confirmed.length}
        </p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {Object.keys(filteredRequisitions).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                ${
                  activeTab === tab
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300"
                }
              `}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100">
                {
                  filteredRequisitions[tab as keyof typeof filteredRequisitions]
                    .length
                }
              </span>
            </button>
          ))}
        </nav>
      </div>

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
                Requester
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Products
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredRequisitions[
              activeTab as keyof typeof filteredRequisitions
            ].map((req) => (
              <tr 
                key={req.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => handleAction(req, "view")}
              >
                <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                  {req.dispatchNumber}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {req.requestDate.toDate().toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {req.requestedBy}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {req.department}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <ul className="list-disc list-inside">
                    {req.products.map((product, index) => (
                      <li key={index}>
                        {product.name} ({product.requestedQuantity} {product.unit})
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {/* View button always available */}
                    <button
                      onClick={() => handleAction(req, "view")}
                      className="p-1 text-secondary-400 hover:text-secondary-600 rounded"
                      title="View Details">
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* Show action buttons only if user can action this requisition */}
                    {canAction(req) && (
                      <>
                        {/* Approver1 actions for Pending requests */}
                        {userData?.role === req.approver1 &&
                          req.status === "Pending" && (
                            <>
                              <button
                                onClick={() => handleAction(req, "approve")}
                                className="text-green-600 hover:text-green-900">
                                Confirm
                              </button>
                              <button
                                onClick={() => handleAction(req, "reject")}
                                className="text-red-600 hover:text-red-900">
                                Reject
                              </button>
                            </>
                          )}

                        {/* Finance Manager actions for Confirmed requests */}
                        {isFinanceManager && req.status === "Confirmed" && (
                          <>
                            <button
                              onClick={() => handleAction(req, "approve")}
                              className="text-green-600 hover:text-green-900">
                              Approve
                            </button>
                            <button
                              onClick={() => handleAction(req, "reject")}
                              className="text-red-600 hover:text-red-900">
                              Reject
                            </button>
                          </>
                        )}


                        {/* Driver actions for Issued requests */}
                        {userData?.role === "Driver" && req.status === "Issued" && (
                          <button
                            onClick={() => handleAction(req, "driver_handover")}
                            className="text-blue-600 hover:text-blue-900">
                            Confirm Handover
                          </button>
                        )}

                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {selectedRequisition && modalType === "approve" && (
        <ApprovalModal
          requisitionId={selectedRequisition.id}
          approverName={userData?.name || ""}
          type={
            userData?.role === selectedRequisition.approver1
              ? "confirm"
              : "approve"
          }
          requisition={selectedRequisition}
          onClose={() => {
            setSelectedRequisition(null);
            setModalType(null);
          }}
          onSuccess={async () => {
            await fetchRequisitions(); // Wait for the fetch to complete
            setSelectedRequisition(null);
            setModalType(null);
          }}
        />
      )}

      {selectedRequisition && modalType === "reject" && (
        <RejectionModal
          requisitionId={selectedRequisition.id}
          rejectorName={userData?.name || ""}
          stage={
            userData?.role === selectedRequisition.approver1
              ? "Department Head"
              : "Finance Manager"
          }
          onClose={() => {
            setSelectedRequisition(null);
            setModalType(null);
          }}
          onSuccess={async () => {
            await fetchRequisitions(); // Wait for the fetch to complete
            setSelectedRequisition(null);
            setModalType(null);
          }}
        />
      )}

      {selectedRequisition && modalType === "driver_handover" && (
        <InventoryHandoverModal
          requisition={selectedRequisition}
          onClose={() => {
            setSelectedRequisition(null);
            setModalType(null);
          }}
          onSuccess={async () => {
            await fetchRequisitions();
            setSelectedRequisition(null);
            setModalType(null);
          }}
        />
      )}


      {selectedRequisition && modalType === "view" && (
        <ViewRequisitionModal
          requisition={selectedRequisition}
          onClose={() => {
            setSelectedRequisition(null);
            setModalType(null);
          }}
        />
      )}
    </div>
  );
}
