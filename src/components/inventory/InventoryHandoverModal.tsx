import React, { useState, useEffect } from "react";
import { X, Package, CheckCircle, AlertCircle } from "lucide-react";
import SignatureCanvas from 'react-signature-canvas';
import { Requisition, approvalFunctions } from "../../lib/firestore/inventory";
import { userService, User as UserType } from "../../services/userService";

interface InventoryHandoverModalProps {
  requisition: Requisition;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InventoryHandoverModal({
  requisition,
  onClose,
  onSuccess,
}: InventoryHandoverModalProps) {
  const [recipientName, setRecipientName] = useState("");
  const [signature, setSignature] = useState<SignatureCanvas | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [departmentUsers, setDepartmentUsers] = useState<UserType[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    const fetchDepartmentUsers = async () => {
      try {
        setLoadingUsers(true);
        const users = await userService.getUsersByDepartment(requisition.department);
        setDepartmentUsers(users);
      } catch (error) {
        console.error("Error fetching department users:", error);
        setError("Failed to load department users");
      } finally {
        setLoadingUsers(false);
      }
    };

    if (requisition.department) {
      fetchDepartmentUsers();
    }
  }, [requisition.department]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!recipientName.trim()) {
      setError("Recipient name is required");
      return;
    }
    
    if (!signature || signature.isEmpty()) {
      setError("Signature is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (!requisition.id) {
        setError("Requisition ID is missing. Please try again.");
        return;
      }

      const signatureImage = signature.toDataURL();

      await approvalFunctions.confirmInventoryHandover(
        requisition.id,
        recipientName.trim(),
        signatureImage,
        notes.trim() || undefined
      );
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error confirming inventory handover:", error);
      setError(error instanceof Error ? error.message : "Failed to confirm handover");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-white">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Package className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Inventory Handover</h2>
                <p className="text-blue-100 mt-1">Requisition #{requisition.dispatchNumber}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Requisition Summary */}
          <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <Package className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Requisition Summary</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Department:</span>
                <p className="text-gray-900">{requisition.department}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Requested By:</span>
                <p className="text-gray-900">{requisition.requestedBy}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Total Items:</span>
                <p className="text-gray-900">{requisition.products.length} products</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Issued By:</span>
                <p className="text-gray-900">{requisition.issuedBy}</p>
              </div>
            </div>
          </div>

          {/* Issued Products */}
          {requisition.issuedProducts && requisition.issuedProducts.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Issued Products
              </h3>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Issued Quantity
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {requisition.issuedProducts.map((product, index) => (
                        <tr key={product.productId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {product.name}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 text-right">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {product.issuedQuantity} {product.unit}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Handover Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-6 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-blue-900">Inventory Handover Details</h3>
              </div>
              <p className="text-blue-800 text-sm mb-4">
                Please select the recipient from the requesting department and provide your signature to confirm receipt of the inventory items.
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label htmlFor="recipientName" className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Name *
                </label>
                {loadingUsers ? (
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="ml-2 text-sm text-gray-600">Loading users...</span>
                  </div>
                ) : (
                  <select
                    id="recipientName"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                  >
                    <option value="">Select recipient from {requisition.department}</option>
                    {departmentUsers.map((user) => (
                      <option key={user.id} value={user.name}>
                        {user.name} {user.email ? `(${user.email})` : ''}
                      </option>
                    ))}
                  </select>
                )}
                {!loadingUsers && departmentUsers.length === 0 && (
                  <p className="mt-1 text-sm text-gray-500">
                    No users found in {requisition.department} department
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="signature" className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Signature *
                </label>
                <div className="border border-gray-300 rounded-lg bg-white">
                  <SignatureCanvas
                    ref={(ref) => setSignature(ref)}
                    canvasProps={{
                      className: 'w-full h-40 rounded-lg'
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => signature?.clear()}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  Clear Signature
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                placeholder="Any additional notes about the handover..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || loadingUsers}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Confirm Handover
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

