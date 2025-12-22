import React from 'react';
import { User } from 'lucide-react';
import { MessageNotifications } from '../notifications/MessageNotifications';
import { useAuth } from '../../hooks/useAuth';

export default function TopNav() {
  const { user } = useAuth();

  return (
    <nav className="...">
      <div className="flex items-center gap-4">
        <MessageNotifications />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
            <User className="w-5 h-5 text-primary-600" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">
              {user?.name || 'User'}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">
                {user?.department}
              </span>
              {user?.department && user?.role && (
                <span className="text-xs text-gray-500">•</span>
              )}
              <span className="text-xs text-gray-500">
                {user?.role}
              </span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
} 