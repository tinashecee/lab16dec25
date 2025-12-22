import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  LogOut, 
  Settings as SettingsIcon,
  Sun,
  Moon
} from 'lucide-react';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useClickOutside } from '../../hooks/useClickOutside';
import TaskNotifications from '../notifications/TaskNotifications';
import { useTheme } from '../../hooks/useTheme';

export default function Header() {
  const { name, role } = useCurrentUser();
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const menuRef = React.useRef(null);

  useClickOutside(menuRef, () => setIsUserMenuOpen(false));

  const handleLogout = async () => {
    try {
      navigate('/login');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  const allowedSettingsRoles = [
    "Finance Manager",
    "Admin Manager",
    "Lab Manager",
    "IT Specialist",
    "Finance Executive",
    "Managing Pathologist"
  ];

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side */}
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {/* You can add page title here */}
            </h1>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <TaskNotifications />
            
            {/* User menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100"
              >
                <div className="flex items-center">
                  <div className="mr-3 text-right">
                    <p className="text-sm font-medium text-gray-700">{name}</p>
                    <p className="text-xs text-gray-500">{role}</p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                </div>
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{name}</p>
                    <p className="text-xs text-gray-500">{role}</p>
                  </div>

                  {allowedSettingsRoles.includes(role) && (
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        navigate('/app/settings');
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <SettingsIcon className="w-4 h-4" />
                      Settings
                    </button>
                  )}

                  <button
                    onClick={() => {
                      toggleTheme();
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {theme === 'dark' ? (
                      <>
                        <Sun className="w-4 h-4" />
                        Light Mode
                      </>
                    ) : (
                      <>
                        <Moon className="w-4 h-4" />
                        Dark Mode
                      </>
                    )}
                  </button>

                  <div className="border-t border-gray-100 mt-1">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
