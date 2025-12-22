import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { taskService } from '../services/taskService';

// Define notification types
export interface BaseNotification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type: 'task' | 'message' | 'leave' | 'loan';
  linkTo: string;
}

interface TaskNotification extends BaseNotification {
  type: 'task';
  taskId: string;
  priority: string;
  dueDate: Date;
}

interface MessageNotification extends BaseNotification {
  type: 'message';
  messageId: string;
  senderName: string;
}

interface LeaveNotification extends BaseNotification {
  type: 'leave';
  leaveId: string;
  applicantName: string;
  status: 'pending' | 'approved' | 'rejected';
  requiresAction: boolean;
}

interface LoanNotification extends BaseNotification {
  type: 'loan';
  loanId: string;
  applicantName: string;
  status: 'pending' | 'approved' | 'rejected';
  requiresAction: boolean;
}

export type Notification = TaskNotification | MessageNotification | LeaveNotification | LoanNotification;

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    console.warn('useNotifications must be used within a NotificationProvider');
    // Return default values instead of throwing an error
    return {
      notifications: [],
      unreadCount: 0,
      markAsRead: async () => {},
      markAllAsRead: async () => {},
      fetchNotifications: async () => {}
    };
  }
  return context;
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, userData } = useAuth();

  const fetchTaskNotifications = async () => {
    if (!user?.uid) return [];
    
    try {
      const userTasks = await taskService.getTasksByAssignedUser(user.uid);
      return userTasks.map(task => ({
        id: task.id,
        taskId: task.id,
        title: 'Task Assignment',
        message: task.title,
        timestamp: task.createdAt?.toDate ? task.createdAt.toDate() : new Date(),
        read: task.read || false,
        type: 'task' as const,
        priority: task.priority,
        dueDate: new Date(task.dueDate),
        linkTo: `/app/tasks?taskId=${task.id}`
      }));
    } catch (error) {
      console.error('Error fetching task notifications:', error);
      return [];
    }
  };

  const fetchMessageNotifications = async () => {
    if (!user?.uid || !userData?.id) return [];
    
    try {
      const messagesRef = collection(db, 'messages');
      
      // Query for messages where the user is a recipient using recipientIds array
      const q = query(
        messagesRef,
        where('recipientIds', 'array-contains', userData.id),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      const snapshot = await getDocs(q);
      const messageNotifications: MessageNotification[] = [];

      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        
        // Check if message has been read by this user
        const readBy = data.readBy || [];
        const isRead = readBy.some((read: any) => read.userId === userData.id);
        
        // Check for unread replies on messages where user is a recipient
        const replies = data.replies || [];
        const unreadReplies = replies.filter((reply: any) => {
          // Check if reply is from someone else and not read by this user
          return reply.senderId !== userData.id && !isRead;
        });

        // Add notification for the message itself if unread
        if (!isRead) {
          messageNotifications.push({
            id: docSnapshot.id,
            messageId: docSnapshot.id,
            title: `New Message: ${data.subject || '(No subject)'}`,
            message: `From ${data.senderName}: ${data.content?.substring(0, 100) || ''}`,
            timestamp: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            read: false,
            type: 'message' as const,
            senderName: data.senderName,
            linkTo: `/app/communication?message=${docSnapshot.id}`
          });
        }

        // Add notifications for unread replies
        unreadReplies.forEach((reply: any, index: number) => {
          const replyTimestamp = reply.timestamp?.toDate ? reply.timestamp.toDate() : 
                                 reply.timestamp instanceof Date ? reply.timestamp : 
                                 new Date();
          
          messageNotifications.push({
            id: `${docSnapshot.id}-reply-${reply.id || index}`,
            messageId: docSnapshot.id,
            title: `New Reply: ${data.subject || '(No subject)'}`,
            message: `${reply.senderName} replied: ${reply.content?.substring(0, 100) || ''}`,
            timestamp: replyTimestamp,
            read: false,
            type: 'message' as const,
            senderName: reply.senderName,
            linkTo: `/app/communication?message=${docSnapshot.id}`
          });
        });
      }

      return messageNotifications;
    } catch (error) {
      console.error('Error fetching message notifications:', error);
      return [];
    }
  };

  const fetchLeaveNotifications = async () => {
    if (!user?.uid) return [];
    
    try {
      const leavesRef = collection(db, 'leaveApplications');
      // For regular users, get their own leave applications
      let q = query(
        leavesRef,
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(10)
      );

      // For approvers, get leave applications that need approval
      if (userData?.role === 'manager' || userData?.role === 'hr' || userData?.role === 'admin') {
        q = query(
          leavesRef,
          where('status', '==', 'pending'),
          where('department', '==', userData.department),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        const isApprover = userData?.role === 'manager' || userData?.role === 'hr' || userData?.role === 'admin';
        return {
          id: doc.id,
          leaveId: doc.id,
          title: isApprover ? 'Leave Approval Required' : `Leave Application ${data.status}`,
          message: isApprover ? `${data.userName} has requested leave` : `Your leave application has been ${data.status}`,
          timestamp: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          read: data.notificationRead || false,
          type: 'leave' as const,
          applicantName: data.userName,
          status: data.status,
          requiresAction: isApprover && data.status === 'pending',
          linkTo: isApprover ? `/app/hr-approvals?leaveId=${doc.id}` : `/app/hr?tab=leave&id=${doc.id}`
        };
      });
    } catch (error) {
      console.error('Error fetching leave notifications:', error);
      return [];
    }
  };

  const fetchLoanNotifications = async () => {
    if (!user?.uid) return [];
    
    try {
      const loansRef = collection(db, 'loanApplications');
      // For regular users, get their own loan applications
      let q = query(
        loansRef,
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(10)
      );

      // For approvers, get loan applications that need approval
      if (userData?.role === 'finance' || userData?.role === 'hr' || userData?.role === 'admin') {
        q = query(
          loansRef,
          where('status', '==', 'pending'),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        const isApprover = userData?.role === 'finance' || userData?.role === 'hr' || userData?.role === 'admin';
        return {
          id: doc.id,
          loanId: doc.id,
          title: isApprover ? 'Loan Approval Required' : `Loan Application ${data.status}`,
          message: isApprover ? `${data.userName} has requested a loan` : `Your loan application has been ${data.status}`,
          timestamp: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          read: data.notificationRead || false,
          type: 'loan' as const,
          applicantName: data.userName,
          status: data.status,
          requiresAction: isApprover && data.status === 'pending',
          linkTo: isApprover ? `/app/hr-approvals?loanId=${doc.id}` : `/app/hr?tab=loans&id=${doc.id}`
        };
      });
    } catch (error) {
      console.error('Error fetching loan notifications:', error);
      return [];
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const [taskNotifications, messageNotifications, leaveNotifications, loanNotifications] = await Promise.all([
        fetchTaskNotifications(),
        fetchMessageNotifications(),
        fetchLeaveNotifications(),
        fetchLoanNotifications()
      ]);

      // Merge all notifications and sort by timestamp (newest first)
      const allNotifications = [
        ...taskNotifications,
        ...messageNotifications,
        ...leaveNotifications,
        ...loanNotifications
      ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      setNotifications(allNotifications);
      setUnreadCount(allNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const notification = notifications.find(n => n.id === notificationId);
      if (!notification) return;

      // Update in Firestore based on notification type
      if (notification.type === 'task') {
        await taskService.updateTask(notification.taskId, { read: true });
      } else if (notification.type === 'message') {
        const messageRef = doc(db, 'messages', notification.messageId);
        await updateDoc(messageRef, { read: true });
      } else if (notification.type === 'leave') {
        const leaveRef = doc(db, 'leaveApplications', notification.leaveId);
        await updateDoc(leaveRef, { notificationRead: true });
      } else if (notification.type === 'loan') {
        const loanRef = doc(db, 'loanApplications', notification.loanId);
        await updateDoc(loanRef, { notificationRead: true });
      }

      // Update local state
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      // Get all unread notifications
      const unreadNotifications = notifications.filter(n => !n.read);
      
      // Update each notification in Firestore
      await Promise.all(unreadNotifications.map(notification => {
        if (notification.type === 'task') {
          return taskService.updateTask(notification.taskId, { read: true });
        } else if (notification.type === 'message') {
          const messageRef = doc(db, 'messages', notification.messageId);
          return updateDoc(messageRef, { read: true });
        } else if (notification.type === 'leave') {
          const leaveRef = doc(db, 'leaveApplications', notification.leaveId);
          return updateDoc(leaveRef, { notificationRead: true });
        } else if (notification.type === 'loan') {
          const loanRef = doc(db, 'loanApplications', notification.loanId);
          return updateDoc(loanRef, { notificationRead: true });
        }
      }));

      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  useEffect(() => {
    if (user && userData) {
      fetchNotifications();
      
      // Set up real-time listener for new messages
      const messagesRef = collection(db, 'messages');
      const messagesQuery = query(
        messagesRef,
        where('recipientIds', 'array-contains', userData.id),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      const unsubscribe = onSnapshot(messagesQuery, () => {
        // Refresh all notifications when a new message arrives
        fetchNotifications();
      }, (error) => {
        console.error('Error listening to messages:', error);
      });
      
      // Set up interval to check for new notifications as backup
      const interval = setInterval(fetchNotifications, 30000); // Check every 30 seconds
      
      return () => {
        unsubscribe();
        clearInterval(interval);
      };
    }
  }, [user, userData]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      fetchNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
}; 