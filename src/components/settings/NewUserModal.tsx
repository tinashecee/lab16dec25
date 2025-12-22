import { useState } from "react";
import { X } from "lucide-react";
import NewUserForm from "./NewUserForm";
import { User, userService } from "../../services/userService";

interface NewUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: User;
  departments: string[];
  roles: string[];
  departmentRolesMap: Record<string, string[]>;
}

export default function NewUserModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  departments,
  roles,
  departmentRolesMap,
}: NewUserModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateForm = (formData: Partial<User>) => {
    if (!formData.name?.trim()) {
      throw new Error("Name is required");
    }
    if (!formData.email?.trim()) {
      throw new Error("Email is required");
    }
    if (!formData.department?.trim()) {
      throw new Error("Department is required");
    }
    if (!formData.role?.trim()) {
      throw new Error("Role is required");
    }
    if (!formData.phoneNumber?.trim()) {
      throw new Error("Phone number is required");
    }
    if (!formData.dateJoined?.trim()) {
      throw new Error("Date joined is required");
    }
  };

  const handleSubmit = async (formData: Partial<User>) => {
    try {
      setError(null);
      setLoading(true);
      validateForm(formData);

      if (initialData?.id) {
        // Update existing user
        await userService.updateUser(initialData.id, {
          ...formData,
          status: formData.status || initialData.status,
        });
      } else {
        // Create new user
        await userService.createUser({
          ...formData,
          status: "Active",
        } as User);
      }

      await onSuccess();
      onClose();
    } catch (err) {
      console.error("Form submission error:", err);
      setError(err instanceof Error ? err.message : "Failed to submit form");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {initialData ? "Edit User" : "Add New User"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-red-600">
            {error}
          </div>
        )}

        <NewUserForm
          onSubmit={handleSubmit}
          initialData={initialData}
          departments={departments}
          roles={roles}
          departmentRolesMap={departmentRolesMap}
          isSubmitting={loading}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
