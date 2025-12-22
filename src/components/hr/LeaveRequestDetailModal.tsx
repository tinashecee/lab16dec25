import React, { useState } from "react";
import { X, Paperclip, ExternalLink, Clock } from "lucide-react";
import { LeaveRequest } from "../../types/leave";
import moment from "moment";

interface LeaveRequestDetailModalProps {
  request: LeaveRequest;
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (requestId: string, comments: string) => Promise<void>;
  onReject?: (requestId: string, reason: string) => Promise<void>;
  onApprove?: (requestId: string, comments: string) => Promise<void>;
  mode?: "view" | "confirm" | "approve";
}

const statusColors = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-100",
  CONFIRMED: "bg-blue-50 text-blue-700 border-blue-100",
  APPROVED: "bg-green-50 text-green-700 border-green-100",
  REJECTED: "bg-red-50 text-red-700 border-red-100",
};

export default function LeaveRequestDetailModal({
  request,
  isOpen,
  onClose,
  onConfirm,
  onReject,
  onApprove,
  mode = "view",
}: LeaveRequestDetailModalProps) {
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAction = async (action: "confirm" | "reject" | "approve") => {
    setLoading(true);
    try {
      switch (action) {
        case "confirm":
          await onConfirm?.(request.id, comments);
          break;
        case "reject":
          await onReject?.(request.id, comments);
          break;
        case "approve":
          await onApprove?.(request.id, comments);
          break;
      }
      
      // Reset comments after successful action
      setComments("");
      onClose();
    } catch (error) {
      console.error(`Error processing ${action} request:`, error);
      // Don't close the modal on error so user can retry
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl max-w-3xl w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Leave Request Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500">
                Request ID
              </label>
              <p className="mt-1 text-sm text-gray-900">{request.request_id}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">
                Status
              </label>
              <span
                className={`mt-1 inline-block px-2 py-1 text-xs rounded-full border ${
                  statusColors[request.status]
                }`}>
                {request.status}
              </span>
            </div>
          </div>

          {/* Employee Information */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500">
                Employee Name
              </label>
              <p className="mt-1 text-sm text-gray-900">{request.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">
                Department
              </label>
              <p className="mt-1 text-sm text-gray-900">{request.department}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">
                Email
              </label>
              <p className="mt-1 text-sm text-gray-900">{request.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">
                Contact Number
              </label>
              <p className="mt-1 text-sm text-gray-900">{request.contact}</p>
            </div>
          </div>

          {/* Leave Details */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500">
                Leave Type
              </label>
              <p className="mt-1 text-sm text-gray-900">{request.type}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">
                Duration
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {request.days} days ({request.from} - {request.to})
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">
                Leave Balance
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {request.leaveDaysBalance} days
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">
                Date Requested
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {moment(request.date_requested).format("MMMM D, YYYY")}
              </p>
            </div>
          </div>

          {/* Reason and Comments */}
          <div>
            <label className="block text-sm font-medium text-gray-500">
              Reason for Leave
            </label>
            <p className="mt-1 text-sm text-gray-900">{request.reason}</p>
          </div>

          {request.comments && (
            <div>
              <label className="block text-sm font-medium text-gray-500">
                Additional Comments
              </label>
              <p className="mt-1 text-sm text-gray-900">{request.comments}</p>
            </div>
          )}

          {/* Attachments */}
          {request.downloadLink && request.downloadLink.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-500">
                Attachments
              </label>
              <div className="mt-2 space-y-2">
                {request.downloadLink.map((url, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Attachment {index + 1}
                      </span>
                    </div>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700">
                      View
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approval Timeline */}
          {(request.confirmedAt ||
            request.approvedAt ||
            request.rejectedAt) && (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Approval Timeline
              </label>
              <div className="space-y-3">
                {request.confirmedAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span>
                      Confirmed on{" "}
                      {moment(request.confirmedAt.toDate()).format(
                        "MMMM D, YYYY [at] h:mm A"
                      )}
                    </span>
                  </div>
                )}
                {request.approvedAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-green-500" />
                    <span>
                      Approved on{" "}
                      {moment(request.approvedAt.toDate()).format(
                        "MMMM D, YYYY [at] h:mm A"
                      )}
                    </span>
                  </div>
                )}
                {request.rejectedAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-red-500" />
                    <span>
                      Rejected on{" "}
                      {moment(request.rejectedAt.toDate()).format(
                        "MMMM D, YYYY [at] h:mm A"
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Comments Section */}
          {mode !== "view" && (
            <div>
              <label className="block text-sm font-medium text-gray-500">
                {mode === "confirm"
                  ? "Confirmation Comments"
                  : mode === "approve"
                  ? "Approval Comments"
                  : "Rejection Reason"}
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholder={
                  mode === "confirm"
                    ? "Add any comments (optional)"
                    : "Provide a reason..."
                }
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              {mode === "view" ? "Close" : "Cancel"}
            </button>
            {mode === "confirm" && (
              <>
                <button
                  onClick={() => handleAction("reject")}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50">
                  Reject
                </button>
                <button
                  onClick={() => handleAction("confirm")}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50">
                  Confirm
                </button>
              </>
            )}
            {mode === "approve" && (
              <>
                <button
                  onClick={() => handleAction("reject")}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50">
                  Reject
                </button>
                <button
                  onClick={() => handleAction("approve")}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50">
                  Approve
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
