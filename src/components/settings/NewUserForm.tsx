import React, { useState, useEffect } from "react";
import { User, Mail, Building2, UserCircle, Phone } from "lucide-react";
import {
  Department,
  departmentService,
} from "../../services/departmentService";

export interface NewUserData {
  name: string;
  email: string;
  phoneNumber: string;
  department: string;
  role: string;
  dateJoined: string;
}

interface NewUserFormProps {
  onSubmit: (data: Partial<User>) => Promise<void>;
  onCancel?: () => void;
  departments: string[];
  roles: string[];
  departmentRolesMap: Record<string, string[]>;
  initialData?: User;
  isLoading?: boolean;
  isSubmitting?: boolean;
}

const validatePhoneNumber = (phone: string) => {
  // Remove all non-digit characters except + for country code
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  
  // Allow + only at the start
  if (cleanPhone.includes('+') && !cleanPhone.startsWith('+')) {
    return false;
  }
  
  // Get just the digits
  const digits = cleanPhone.replace(/\+/g, '');
  
  // Should have between 10-15 digits
  if (digits.length < 10 || digits.length > 15) {
    return false;
  }
  
  return true;
};

export default function NewUserForm({
  onSubmit,
  onCancel = () => {},
  departments,
  roles,
  departmentRolesMap,
  initialData,
  isLoading,
  isSubmitting,
}: NewUserFormProps) {
  const [formData, setFormData] = useState<NewUserData>(() => ({
    name: initialData?.name || "",
    email: initialData?.email || "",
    phoneNumber: initialData?.phoneNumber || "",
    department: initialData?.department || "",
    role: initialData?.role || "",
    dateJoined:
      initialData?.dateJoined || new Date().toISOString().split("T")[0],
  }));
  const [errors, setErrors] = useState<
    Partial<Record<keyof NewUserData, string>>
  >({});
  const [departmentRoles, setDepartmentRoles] = useState<string[]>([]);

  // Update roles when department changes or when departmentRolesMap changes
  useEffect(() => {
    if (
      formData.department &&
      departmentRolesMap &&
      departmentRolesMap[formData.department]
    ) {
      const roles = departmentRolesMap[formData.department];
      setDepartmentRoles(roles || []);

      // Clear role if it's not available in the new department
      if (formData.role && !roles?.includes(formData.role)) {
        setFormData((prev) => ({ ...prev, role: "" }));
      }
    } else {
      setDepartmentRoles([]);
      if (formData.role) {
        setFormData((prev) => ({ ...prev, role: "" }));
      }
    }
  }, [formData.department, departmentRolesMap]);

  const handleInputChange = (field: keyof NewUserData, value: string) => {
    if (field === 'phoneNumber') {
      // Allow digits, spaces, hyphens, plus sign, and parentheses
      const sanitizedValue = value.replace(/[^\d\s\-+()\[\]]/g, '');
      setFormData((prev) => ({
        ...prev,
        [field]: sanitizedValue,
      }));

      // Clear phone number error when user types
      if (errors.phoneNumber) {
        setErrors((prev) => ({
          ...prev,
          phoneNumber: '',
        }));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
      
      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: '',
        }));
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof NewUserData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    // Phone number validation
    const phoneValue = formData.phoneNumber.trim();
    if (!phoneValue) {
      newErrors.phoneNumber = "Phone number is required";
    } else if (!validatePhoneNumber(phoneValue)) {
      newErrors.phoneNumber = "Please enter a valid phone number (e.g., +1 234 567 8900)";
    }

    if (!formData.department) {
      newErrors.department = "Department is required";
    }

    if (!formData.role) {
      newErrors.role = "Role is required";
    }

    if (!formData.dateJoined) {
      newErrors.dateJoined = "Date joined is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const newUser = {
        name: formData.name,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        department: formData.department,
        role: formData.role,
        dateJoined: formData.dateJoined,
        status: "Active",
      };

      await onSubmit(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      setErrors((prev) => ({
        ...prev,
        submit: "Failed to save user. Please try again.",
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700">
            Name
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className={`block w-full pl-10 sm:text-sm border-gray-300 rounded-md ${
                errors.name ? "border-red-300" : ""
              }`}
              placeholder="John Doe"
            />
          </div>
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className={`block w-full pl-10 sm:text-sm border-gray-300 rounded-md ${
                errors.email ? "border-red-300" : ""
              }`}
              placeholder="john@example.com"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="phoneNumber"
            className="block text-sm font-medium text-gray-700">
            Phone Number
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Phone className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="tel"
              id="phoneNumber"
              value={formData.phoneNumber}
              onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
              className={`block w-full pl-10 sm:text-sm border-gray-300 rounded-md ${
                errors.phoneNumber ? "border-red-300 ring-red-500 focus:border-red-500 focus:ring-red-500" : ""
              }`}
              placeholder="+1 234 567 8900"
              maxLength={20}
            />
          </div>
          {errors.phoneNumber && (
            <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="department"
            className="block text-sm font-medium text-gray-700">
            Department
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Building2 className="h-5 w-5 text-gray-400" />
            </div>
            <select
              id="department"
              value={formData.department}
              onChange={(e) => handleInputChange("department", e.target.value)}
              className={`block w-full pl-10 sm:text-sm border-gray-300 rounded-md ${
                errors.department ? "border-red-300" : ""
              }`}>
              <option value="">Select Department</option>
              {departments?.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
          {errors.department && (
            <p className="mt-1 text-sm text-red-600">{errors.department}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="role"
            className="block text-sm font-medium text-gray-700">
            Role
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <UserCircle className="h-5 w-5 text-gray-400" />
            </div>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => handleInputChange("role", e.target.value)}
              className={`block w-full pl-10 sm:text-sm border-gray-300 rounded-md ${
                errors.role ? "border-red-300" : ""
              }`}
              disabled={!formData.department || !departmentRoles.length}>
              <option value="">Select Role</option>
              {departmentRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
          {errors.role && (
            <p className="mt-1 text-sm text-red-600">{errors.role}</p>
          )}
          {(!formData.department || !departmentRoles.length) && (
            <p className="mt-1 text-sm text-gray-500">
              {!formData.department
                ? "Select a department first"
                : "No roles available for this department"}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="dateJoined"
            className="block text-sm font-medium text-gray-700">
            Date Joined
          </label>
          <div className="mt-1">
            <input
              type="date"
              id="dateJoined"
              value={formData.dateJoined}
              onChange={(e) => handleInputChange("dateJoined", e.target.value)}
              className={`block w-full sm:text-sm border-gray-300 rounded-md ${
                errors.dateJoined ? "border-red-300" : ""
              }`}
            />
          </div>
          {errors.dateJoined && (
            <p className="mt-1 text-sm text-red-600">{errors.dateJoined}</p>
          )}
        </div>
      </div>

      {errors.submit && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{errors.submit}</p>
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50">
          {isLoading
            ? "Saving..."
            : initialData
            ? "Update User"
            : "Create User"}
        </button>
      </div>
    </form>
  );
}
