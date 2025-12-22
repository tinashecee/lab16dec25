import React, { useState } from "react";
import { X } from "lucide-react";
import { approvalFunctions, Requisition } from "../../lib/firestore/inventory";

interface IssuanceModalProps {
  requisition: Requisition;
  issuerName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function IssuanceModal({
  requisition,
  issuerName,
  onClose,
  onSuccess,
}: IssuanceModalProps) {
  const [issuedProducts, setIssuedProducts] = useState(
    requisition.products.map((p) => ({
      productId: p.productId,
      name: p.name,
      requestedQuantity: p.quantity || 0,
      issuedQuantity: p.quantity || 0,
      unit: p.unit || '',
    }))
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleIssue = async () => {
    if (issuedProducts.some((p) => p.issuedQuantity <= 0)) {
      alert("Please enter valid quantities for all products");
      return;
    }

    setLoading(true);
    try {
      await approvalFunctions.issueRequest(
        requisition.id,
        issuerName,
        issuedProducts,
        notes
      );
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error issuing request:", error);
      alert("Failed to issue request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Issue Products
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Products</h3>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Product
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Requested
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    To Issue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {issuedProducts.map((product, index) => (
                  <tr key={product.productId}>
                    <td className="px-4 py-2">{product.name}</td>
                    <td className="px-4 py-2">
                      {product.requestedQuantity} {product.unit}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        max={product.requestedQuantity}
                        value={product.issuedQuantity || 0}
                        onChange={(e) => {
                          const newProducts = [...issuedProducts];
                          newProducts[index] = {
                            ...product,
                            issuedQuantity: parseInt(e.target.value) || 0,
                          };
                          setIssuedProducts(newProducts);
                        }}
                        className="w-20 px-2 py-1 border border-gray-300 rounded-md"
                      />
                      <span className="ml-2">{product.unit}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about the issuance..."
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleIssue}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? "Processing..." : "Issue Products"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
