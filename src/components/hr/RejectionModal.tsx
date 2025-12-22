import React, { useState } from "react";
import { X } from "lucide-react";
import { loanService } from "../../services/loanService";

interface RejectionModalProps {
  requisitionId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const RejectionModal: React.FC<RejectionModalProps> = ({
  requisitionId,
  onClose,
  onSuccess,
}) => {
  const [comments, setComments] = useState("");

  const handleReject = async () => {
    try {
      // Logic to reject the request with comments
      await loanService.updateLoanRequestStatus(
        requisitionId,
        "REJECTED",
        comments
      ); // Update status to REJECTED
      onSuccess(); // Call onSuccess to refresh the requests
    } catch (error) {
      console.error("Error rejecting loan request:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Confirm Rejection
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Add comments (optional)"
          className="w-full border border-gray-300 rounded p-2"
        />
        <div className="mt-4">
          <button
            onClick={handleReject}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
            Reject
          </button>
          <button
            onClick={onClose}
            className="ml-2 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectionModal;
