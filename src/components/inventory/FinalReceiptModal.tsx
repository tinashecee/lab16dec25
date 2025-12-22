import React, { useState } from "react";
import { X, Package, CheckCircle, AlertCircle, QrCode, Monitor } from "lucide-react";
import { Requisition, approvalFunctions } from "../../lib/firestore/inventory";

interface FinalReceiptModalProps {
  requisition: Requisition;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FinalReceiptModal({
  requisition,
  onClose,
  onSuccess,
}: FinalReceiptModalProps) {
  const [receiverName, setReceiverName] = useState("");
  const [signature, setSignature] = useState("");
  const [receiptMethod, setReceiptMethod] = useState<"qr_scan" | "system_scan">("system_scan");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!receiverName.trim()) {
      setError("Receiver name is required");
      return;
    }
    
    if (!signature.trim()) {
      setError("Signature is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await approvalFunctions.confirmFinalReceipt(
        requisition.id,
        receiverName.trim(),
        signature.trim(),
        receiptMethod,
        notes.trim() || undefined
      );
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error confirming final receipt:", error);
      setError(error instanceof Error ? error.message : "Failed to confirm receipt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-8 py-6 text-white">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Package className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Final Receipt Confirmation</h2>
                <p className="text-green-100 mt-1">Requisition #{requisition.dispatchNumber}</p>
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
          {/* Delivery Summary */}
          <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <Package className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Delivery Summary</h3>
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
                <span className="font-medium text-gray-600">Driver:</span>
                <p className="text-gray-900">{requisition.driverReceivedBy}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Delivered At:</span>
                <p className="text-gray-900">
                  {requisition.driverReceivedAt?.toDate().toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Delivered Products */}
          {requisition.issuedProducts && requisition.issuedProducts.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Delivered Products
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
                          Delivered Quantity
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

          {/* Receipt Confirmation Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-6 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-green-900">Receipt Confirmation</h3>
              </div>
              <p className="text-green-800 text-sm mb-4">
                Please confirm that you have received all the items from the driver and they are in good condition.
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="receiverName" className="block text-sm font-medium text-gray-700 mb-2">
                  Receiver Name *
                </label>
                <input
                  type="text"
                  id="receiverName"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <label htmlFor="signature" className="block text-sm font-medium text-gray-700 mb-2">
                  Digital Signature *
                </label>
                <input
                  type="text"
                  id="signature"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  placeholder="Type your signature"
                  required
                />
              </div>
            </div>

            {/* Receipt Method Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                How did you access this confirmation? *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  receiptMethod === "qr_scan" 
                    ? "border-green-500 bg-green-50" 
                    : "border-gray-200 hover:border-gray-300"
                }`}>
                  <input
                    type="radio"
                    name="receiptMethod"
                    value="qr_scan"
                    checked={receiptMethod === "qr_scan"}
                    onChange={(e) => setReceiptMethod(e.target.value as "qr_scan" | "system_scan")}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-3">
                    <QrCode className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">QR Code Scan</p>
                      <p className="text-sm text-gray-600">Scanned QR code from printed document</p>
                    </div>
                  </div>
                </label>

                <label className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  receiptMethod === "system_scan" 
                    ? "border-green-500 bg-green-50" 
                    : "border-gray-200 hover:border-gray-300"
                }`}>
                  <input
                    type="radio"
                    name="receiptMethod"
                    value="system_scan"
                    checked={receiptMethod === "system_scan"}
                    onChange={(e) => setReceiptMethod(e.target.value as "qr_scan" | "system_scan")}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-3">
                    <Monitor className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">System Access</p>
                      <p className="text-sm text-gray-600">Accessed via system notification</p>
                    </div>
                  </div>
                </label>
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors resize-none"
                placeholder="Any notes about the received items or delivery..."
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
                disabled={loading}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Confirm Receipt
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
