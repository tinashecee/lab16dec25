import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { format } from 'date-fns';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useClickOutside } from '@/hooks/useClickOutside';

interface Notification {
  id: string;
  messageId: string;
  subject: string;
  senderName: string;
  content: string;
  timestamp: Date;
  read: boolean;
}

export default function MessageNotifications() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useClickOutside(dropdownRef, () => setIsOpen(false));

  const fetchNotifications = async () => {
    if (!user?.uid) return;

    try {
      const messagesRef = collection(db, 'messages');
      const q = query(
        messagesRef,
        where(`recipients.users.${user.uid}`, '==', true),
        where('read', '==', false),
        orderBy('createdAt', 'desc'),
        limit(5)
      );

      const snapshot = await getDocs(q);
      const fetchedNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        messageId: doc.id,
        subject: doc.data().subject,
        senderName: doc.data().senderName,
        content: doc.data().content,
        timestamp: doc.data().createdAt?.toDate() || new Date(),
        read: doc.data().read
      }));

      setNotifications(fetchedNotifications);
      setUnreadCount(fetchedNotifications.length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Set up real-time updates if needed
    const interval = setInterval(fetchNotifications, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [user]);

  const handleNotificationClick = (notification: Notification) => {
    // Navigate to the message
    // You'll need to implement this based on your routing setup
    window.location.href = `/communication?message=${notification.messageId}`;
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No new notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className="w-full p-4 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-primary-700">
                        {notification.senderName.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {notification.senderName}
                      </p>
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {notification.subject}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {notification.content}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {format(notification.timestamp, 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    {!notification.read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200">
              <button
                onClick={() => window.location.href = '/communication'}
                className="w-full text-center text-sm text-primary-600 hover:text-primary-700"
              >
                View all messages
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 