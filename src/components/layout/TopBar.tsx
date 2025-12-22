import React, { useState } from "react";
import { Search, Filter, User, LogOut } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import NotificationCenter from "../notifications/NotificationCenter";

export default function TopBar() {
  const { user, userData, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Debug log to see what data we're getting
  console.log('Current user:', user, 'User data:', userData);

  // Get user display name with fallbacks
  const displayName = userData?.name || user?.displayName || user?.email?.split('@')[0] || 'User';
  
  // Get department with fallback
  const department = userData?.department || 'Department';
  
  // Get role with fallback
  const role = userData?.role || 'Role';

  const handleLogout = async () => {
    try {
      await logout();
      // Redirect will be handled by your auth context/router
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-8 py-4">
      <div className="flex items-center justify-between">
        <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            className="w-72 pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-lg text-secondary-600">
            <Filter className="w-5 h-5" />
          </button>
          
          {/* NotificationCenter replaces the previous Bell icon */}
          <NotificationCenter />
          
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <User className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium text-gray-900">
                  {displayName}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">
                    Dept: {department}
                  </span>
                  {department && role && (
                    <span className="text-xs text-gray-500">•</span>
                  )}
                  <span className="text-xs text-gray-500">
                    Role: {role}
                  </span>
                </div>
              </div>
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50 border border-gray-200">
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">{displayName}</p>
                  <p className="text-xs text-gray-500 mt-1">{user?.email}</p>
                  <p className="text-xs text-gray-500 mt-1">Department: {department}</p>
                  <p className="text-xs text-gray-500 mt-1">Role: {role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay to close menu when clicking outside */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </div>
  );
}
