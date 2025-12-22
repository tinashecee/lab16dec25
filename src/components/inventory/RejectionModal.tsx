import React, { useState } from "react";
import { X } from "lucide-react";
import { approvalFunctions } from "../../lib/firestore/inventory";

interface RejectionModalProps {
  requisitionId: string;
  rejectorName: string;
  stage: "Department Head" | "Finance Manager";
  onClose: () => void;
  onSuccess: () => void;
}

export function RejectionModal({
  requisitionId,
  rejectorName,
  stage,
  onClose,
  onSuccess,
}: RejectionModalProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReject = async () => {
    if (!reason.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }

    setLoading(true);
    try {
      await approvalFunctions.rejectRequest(
        requisitionId,
        rejectorName,
        reason,
        stage
      );
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error rejecting request:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to reject request. Please try again."
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
            Reject Request
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="reason"
              className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Rejection
            </label>
            <textarea
              id="reason"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a reason for rejecting this request..."
              required
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={loading || !reason.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? "Rejecting..." : "Reject Request"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
