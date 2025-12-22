import React, { useState } from "react";
import { ChevronDown, Settings, LogOut } from "lucide-react";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function UserMenu() {
  const { name, role, department } = useCurrentUser();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const allowedSettingsRoles = [
    "Finance Manager",
    "Admin Manager",
    "Lab Manager",
    "IT Specialist",
    "Finance Executive",
    "Managing Pathologist"
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg">
        <img
          src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=40&h=40"
          alt="User"
          className="w-8 h-8 rounded-full object-cover"
        />
        <div className="text-left">
          <p className="text-sm font-medium text-secondary-900">{name}</p>
          <p className="text-xs text-secondary-500">{role}</p>
          <p className="text-xs text-secondary-400">{department}</p>
        </div>
        <ChevronDown className="w-4 h-4 text-secondary-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
          {allowedSettingsRoles.includes(role) && (
            <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-secondary-700 hover:bg-gray-50">
              <Settings className="w-4 h-4" />
              Settings
            </button>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-secondary-700 hover:bg-gray-50">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
