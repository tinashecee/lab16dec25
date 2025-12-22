import React from "react";
import { X } from "lucide-react";
import { loanService } from "../../services/loanService";
import { User } from "../../hooks/useAuth";

interface ApprovalModalProps {
  requisitionId: string;
  userData: User;
  onClose: () => void;
  onSuccess: () => void;
}

const ApprovalModal: React.FC<ApprovalModalProps> = ({
  requisitionId,
  userData,
  onClose,
  onSuccess,
}) => {
  const handleApprove = async () => {
    try {
      // Logic to approve the request
      await loanService.updateLoanRequestStatus(requisitionId, "CONFIRMED", {
        approvedBy: userData.name,
        approvedAt: new Date().getTime(),
      });
      onSuccess(); // Call onSuccess to refresh the requests
    } catch (error) {
      console.error("Error approving loan request:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Confirm Approval
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p>Are you sure you want to approve this request?</p>
        <div className="mt-4">
          <button
            onClick={handleApprove}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            Confirm
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

export default ApprovalModal;
