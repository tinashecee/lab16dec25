import React, { useState, useRef } from "react";
import { X, Upload, Paperclip } from "lucide-react";
import { leaveService } from "../../services/leaveService";
import { storage } from "../../config/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "../../contexts/AuthContext";

interface LeaveRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  department: string;
  initialData?: LeaveRequest;
}

export default function LeaveRequestForm({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  department,
  initialData,
}: LeaveRequestFormProps) {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    type: initialData?.type || "",
    from: initialData?.from || "",
    to: initialData?.to || "",
    days: initialData?.days || 0,
    contact: initialData?.contact || "",
    comments: initialData?.comments || "",
    reason: initialData?.reason || "",
  });
  const [calculatedDays, setCalculatedDays] = useState(0);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  const uploadFiles = async (): Promise<string[]> => {
    if (!selectedFiles.length) return [];

    try {
      const uploadPromises = selectedFiles.map(async (file) => {
        const fileExtension = file.name.split(".").pop();
        const fileName = `${uuidv4()}.${fileExtension}`;
        const filePath = `leave-requests/${employeeId}/${fileName}`;

        const storageRef = ref(storage, filePath);

        const metadata = {
          contentType: file.type,
          customMetadata: {
            "uploaded-by": employeeId,
            "original-name": file.name,
          },
        };

        try {
          const snapshot = await uploadBytes(storageRef, file, metadata);
          const downloadURL = await getDownloadURL(snapshot.ref);
          return downloadURL;
        } catch (error) {
          console.error("Error uploading file:", error);
          throw new Error(`Failed to upload ${file.name}`);
        }
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error("Error in uploadFiles:", error);
      throw error;
    }
  };

  const calculateDays = async (start: string, end: string) => {
    if (!start || !end) return 0;
    try {
      const days = await leaveService.calculateBusinessDays(start, end);
      return days;
    } catch (error) {
      console.error("Error calculating days:", error);
      return 0;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const fileUrls = await uploadFiles();

      if (initialData) {
        await leaveService.updateLeaveRequest(initialData.id, {
          ...formData,
          attachments: fileUrls,
        });
      } else {
        await leaveService.createLeaveRequest({
          employeeId,
          employeeName,
          email: userData?.email || "",
          department,
          ...formData,
          attachments: fileUrls,
          userRole: userData?.role,
        });
      }

      onClose();
    } catch (error) {
      console.error("Error submitting leave request:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to submit leave request"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Submit Leave Request
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Leave Type
              </label>
              <select
                required
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                <option value="">Select type</option>
                <option value="Annual">Annual Leave</option>
                <option value="Sick">Sick Leave</option>
                <option value="Maternity">Maternity Leave</option>
                <option value="Study">Study Leave</option>
                <option value="Compassionate">Compassionate Leave</option>
                <option value="Special">Special Leave</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact During Leave
              </label>
              <input
                type="tel"
                required
                value={formData.contact}
                onChange={(e) =>
                  setFormData({ ...formData, contact: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                required
                value={formData.from}
                onChange={async (e) => {
                  const newStartDate = e.target.value;
                  const days = await calculateDays(newStartDate, formData.to);
                  setCalculatedDays(days);
                  setFormData({
                    ...formData,
                    from: newStartDate,
                    days: days,
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                required
                value={formData.to}
                onChange={async (e) => {
                  const newEndDate = e.target.value;
                  const days = await calculateDays(formData.from, newEndDate);
                  setCalculatedDays(days);
                  setFormData({
                    ...formData,
                    to: newEndDate,
                    days: days,
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Days
              </label>
              <input
                type="text"
                readOnly
                value={calculatedDays}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comments
            </label>
            <textarea
              value={formData.comments}
              onChange={(e) =>
                setFormData({ ...formData, comments: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Any additional information..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
              <div className="space-y-1 text-center">
                <Paperclip className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label className="relative cursor-pointer rounded-md font-medium text-primary-600 hover:text-primary-500">
                    <span>Upload files</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="sr-only"
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">
                  PDF, DOC up to 10MB each
                </p>
              </div>
            </div>
            {selectedFiles.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Selected files: {selectedFiles.map((f) => f.name).join(", ")}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {loading ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
