import React, { useState, useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";
import { approvalFunctions, getProduct, Product } from "../../lib/firestore/inventory";

interface ApprovalModalProps {
  requisitionId: string;
  approverName: string;
  onClose: () => void;
  onSuccess: () => void;
  type: "confirm" | "approve";
  requisition?: any; // Add requisition data to get products
}

export function ApprovalModal({
  requisitionId,
  approverName,
  onClose,
  onSuccess,
  type,
  requisition,
}: ApprovalModalProps) {
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);
  const [productDetails, setProductDetails] = useState<Record<string, Product>>({});
  const [loadingStock, setLoadingStock] = useState(true);

  // Fetch product details to check stock availability
  useEffect(() => {
    const fetchProductDetails = async () => {
      if (!requisition?.products) {
        setLoadingStock(false);
        return;
      }

      try {
        setLoadingStock(true);
        const productDetailsMap: Record<string, Product> = {};
        await Promise.all(
          requisition.products.map(async (product: any) => {
            try {
              const productData = await getProduct(product.productId);
              if (productData) {
                productDetailsMap[product.productId] = productData;
              }
            } catch (error) {
              console.error(`Error fetching product ${product.productId}:`, error);
            }
          })
        );
        setProductDetails(productDetailsMap);
      } catch (error) {
        console.error("Error fetching product details:", error);
      } finally {
        setLoadingStock(false);
      }
    };

    fetchProductDetails();
  }, [requisition]);

  // Check for insufficient stock
  const insufficientStockProducts = requisition?.products?.filter((product: any) => {
    const productData = productDetails[product.productId];
    if (!productData) return false;
    const requestedQty = product.requestedQuantity || product.approvedQuantity || 0;
    return productData.quantity < requestedQty;
  }) || [];

  const handleApprove = async () => {
    setLoading(true);
    try {
      if (type === "confirm") {
        // Create approved products array from requisition products
        const approvedProducts = requisition?.products?.map((product: any) => ({
          productId: product.productId,
          approvedQuantity: product.requestedQuantity || 0, // Default to requested quantity
          approvalNotes: comments || "" // Ensure it's never undefined
        })) || [];
        
        await approvalFunctions.confirmRequest(
          requisitionId,
          approverName,
          approvedProducts,
          comments
        );
      } else {
        console.log("Calling approveRequest with:", {
          requisitionId,
          approverName,
          comments,
          type
        });
        await approvalFunctions.approveRequest(
          requisitionId,
          approverName,
          comments
        );
        console.log("approveRequest completed successfully");
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error approving request:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to approve request. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl max-w-lg w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {type === "confirm" ? "Confirm Request" : "Approve Request"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Stock Availability Warning */}
          {!loadingStock && insufficientStockProducts.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-amber-800 mb-2">
                    Insufficient Stock Warning
                  </h3>
                  <p className="text-xs text-amber-700 mb-2">
                    The following products have insufficient stock available:
                  </p>
                  <ul className="list-disc list-inside text-xs text-amber-700 space-y-1">
                    {insufficientStockProducts.map((product: any) => {
                      const productData = productDetails[product.productId];
                      const requestedQty = product.requestedQuantity || product.approvedQuantity || 0;
                      return (
                        <li key={product.productId}>
                          <strong>{product.name}</strong>: Requested {requestedQty} {product.unit}, 
                          Available {productData?.quantity || 0} {product.unit}
                        </li>
                      );
                    })}
                  </ul>
                  <p className="text-xs text-amber-700 mt-2 font-medium">
                    You can still approve this requisition. The Accounts Clerk will be notified during issuance.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="comments"
              className="block text-sm font-medium text-gray-700 mb-1">
              Comments (Optional)
            </label>
            <textarea
              id="comments"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add any comments or notes..."
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleApprove}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading
                ? "Processing..."
                : type === "confirm"
                ? "Confirm"
                : "Approve"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
