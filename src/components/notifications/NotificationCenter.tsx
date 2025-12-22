import React, { useState, useRef } from 'react';
import { Bell, CheckCircle, Clock, Check, FileText, Calendar, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useNotifications, Notification } from '../../contexts/NotificationContext';
import { useClickOutside } from '../../hooks/useClickOutside';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('unread');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  useClickOutside(dropdownRef, () => setIsOpen(false));

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    navigate(notification.linkTo);
    setIsOpen(false);
  };

  const getNotificationIcon = (notification: Notification) => {
    switch (notification.type) {
      case 'task':
        return <Clock className="w-5 h-5 text-primary-600" />;
      case 'message':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'leave':
        return <Calendar className="w-5 h-5 text-green-600" />;
      case 'loan':
        return <Briefcase className="w-5 h-5 text-amber-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getNotificationColor = (notification: Notification) => {
    switch (notification.type) {
      case 'task':
        return 'bg-primary-100';
      case 'message':
        return 'bg-blue-100';
      case 'leave':
        return 'bg-green-100';
      case 'loan':
        return 'bg-amber-100';
      default:
        return 'bg-gray-100';
    }
  };

  // Check if notification requires action
  const requiresAction = (notification: Notification): boolean => {
    if (notification.type === 'leave' || notification.type === 'loan') {
      return notification.requiresAction;
    }
    return false;
  };

  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter(notification => 
    activeTab === 'all' || !notification.read
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={() => markAllAsRead()}
                className="text-xs text-primary-600 hover:text-primary-800 flex items-center"
              >
                <CheckCircle className="w-3 h-3 mr-1" /> Mark all as read
              </button>
            )}
          </div>

          <div className="flex border-b border-gray-200">
            <button
              className={`flex-1 py-2 text-sm font-medium ${activeTab === 'unread' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('unread')}
            >
              Unread ({unreadCount})
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium ${activeTab === 'all' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('all')}
            >
              All ({notifications.length})
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 italic">
                No {activeTab === 'unread' ? 'unread ' : ''}notifications
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className="w-full p-4 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-start"
                >
                  <div className={`w-8 h-8 rounded-full ${getNotificationColor(notification)} flex items-center justify-center flex-shrink-0 mr-3`}>
                    {getNotificationIcon(notification)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(notification.timestamp, 'MMM d, yyyy h:mm a')}
                    </p>
                    {notification.type === 'task' && (
                      <span className={`inline-block px-2 py-0.5 rounded text-xs mt-1 ${notification.priority === 'High' || notification.priority === 'Urgent' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                        {notification.priority}
                      </span>
                    )}
                    {(notification.type === 'leave' || notification.type === 'loan') && (
                      <span className={`inline-block px-2 py-0.5 rounded text-xs mt-1 ${
                        notification.status === 'approved' 
                          ? 'bg-green-100 text-green-800' 
                          : notification.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                      }`}>
                        {notification.status.charAt(0).toUpperCase() + notification.status.slice(1)}
                      </span>
                    )}
                  </div>
                  {requiresAction(notification) && (
                    <span className="inline-block px-2 py-0.5 rounded text-xs bg-red-100 text-red-800 whitespace-nowrap">
                      Action Required
                    </span>
                  )}
                  {!notification.read ? (
                    <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2 mt-2" />
                  ) : (
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0 ml-2" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
} 