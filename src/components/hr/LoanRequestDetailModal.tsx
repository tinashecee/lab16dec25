import React from "react";
import { X } from "lucide-react";
import { LoanRequest } from "../../services/loanService";

interface LoanRequestDetailModalProps {
  request: LoanRequest;
  isOpen: boolean;
  onClose: () => void;
}

const LoanRequestDetailModal: React.FC<LoanRequestDetailModalProps> = ({
  request,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Loan Request Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500">
              Amount
            </label>
            <p className="mt-1 text-sm text-gray-900">
              ${request.amount.toLocaleString()}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">
              Purpose
            </label>
            <p className="mt-1 text-sm text-gray-900">{request.purpose}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">
              Repayment Period
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {request.repaymentMonths} months
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">
              Status
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">
              Submitted On
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {new Date(request.createdAt).toLocaleString()}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">
              Approver 1
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {request.approver1 || "N/A"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">
              Approver 2
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {request.approver2 || "N/A"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">
              Approver Email
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {request.approverEmail || "N/A"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">
              Department
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {request.department || "N/A"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">
              Employee ID
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {request.employeeId || "N/A"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">
              Employee Name
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {request.employeeName || "N/A"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">
              Preapproval
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {request.preapproval ? "Yes" : "No"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanRequestDetailModal;
