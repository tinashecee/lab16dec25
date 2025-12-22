import { 
  collection, 
  addDoc,
  query,
  orderBy,
  getDocs,
  where,
  serverTimestamp,
  Timestamp,
  QueryConstraint,
  limit as firestoreLimit
} from 'firebase/firestore';
import { db } from '../config/firebase';

export type ActivityType = 
  | 'STATUS_CHANGE' 
  | 'LOGIN' 
  | 'LOGOUT'
  | 'PROFILE_UPDATE'
  | 'PASSWORD_CHANGE'
  | 'ROLE_CHANGE'
  | 'DEPARTMENT_CHANGE'
  | 'ACCOUNT_CREATED'
  | 'ACCOUNT_DEACTIVATED'
  | 'SETTINGS_UPDATE'
  | 'SAMPLE_ACCEPTED'
  | 'SAMPLE_COLLECTED'
  | 'SAMPLE_DELIVERED'
  | 'SAMPLE_HANDOVER'
  | 'TASK_ASSIGNMENT'
  | 'TASK_ACCEPTANCE'
  | 'TASK_COMPLETION'
  | 'SAMPLE_COLLECTION'
  | 'WALKIN_CLIENT'
  | 'SAMPLE_REGISTRATION'
  | 'LEAVE_REQUEST'
  | 'LEAVE_APPROVAL'
  | 'LOAN_REQUEST'
  | 'LOAN_APPROVAL';

export interface ActivityLog {
  id?: string;
  userId: string;
  userName: string;
  action: ActivityType;
  details: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  timestamp?: Timestamp;
}

const COLLECTION_NAME = 'activityLogs';

export const activityLogService = {
  async logActivity(log: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<string> {
    try {
      // Debug log
      console.debug('[ActivityLog] Logging activity:', { userId: log.userId, action: log.action, userName: log.userName });
      // Get IP address from a service like ipify
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const { ip } = await ipResponse.json();

      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...log,
        ipAddress: ip,
        userAgent: navigator.userAgent,
        timestamp: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error logging activity:', error);
      throw error;
    }
  },

  async getUserActivities(
    userId: string, 
    options?: { 
      limit?: number;
      activityTypes?: ActivityType[];
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<ActivityLog[]> {
    try {
      // Debug log
      console.debug('[ActivityLog] Fetching activities for userId:', userId, options);
      const constraints: QueryConstraint[] = [
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      ];
      
      if (options?.activityTypes?.length) {
        constraints.push(where('action', 'in', options.activityTypes));
      }

      if (options?.startDate) {
        constraints.push(where('timestamp', '>=', Timestamp.fromDate(options.startDate)));
      }

      if (options?.endDate) {
        constraints.push(where('timestamp', '<=', Timestamp.fromDate(options.endDate)));
      }

      if (options?.limit) {
        constraints.push(firestoreLimit(options.limit));
      }

      const q = query(collection(db, COLLECTION_NAME), ...constraints);
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ActivityLog[];
    } catch (error) {
      console.error('Error fetching user activities:', error);
      throw error;
    }
  },

  async getRecentActivities(
    options?: {
      limit?: number;
      activityTypes?: ActivityType[];
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<ActivityLog[]> {
    try {
      const constraints: QueryConstraint[] = [
        orderBy('timestamp', 'desc')
      ];

      if (options?.activityTypes?.length) {
        constraints.push(where('action', 'in', options.activityTypes));
      }

      if (options?.startDate) {
        constraints.push(where('timestamp', '>=', Timestamp.fromDate(options.startDate)));
      }

      if (options?.endDate) {
        constraints.push(where('timestamp', '<=', Timestamp.fromDate(options.endDate)));
      }

      if (options?.limit) {
        constraints.push(firestoreLimit(options?.limit || 50));
      }

      const q = query(collection(db, COLLECTION_NAME), ...constraints);
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ActivityLog[];
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      throw error;
    }
  }
};

// Helper function to format activity details
export const formatActivityDetails = (
  action: ActivityType,
  metadata?: Record<string, unknown>
): string => {
  switch (action) {
    case 'LOGIN':
      return 'User logged in to the system';
    case 'LOGOUT':
      return 'User logged out of the system';
    case 'PROFILE_UPDATE':
      return `Updated profile information: ${
        Object.entries(metadata || {})
          .map(([key, value]) => `${key.replace('_', ' ')} to "${value}"`)
          .join(', ')
      }`;
    case 'PASSWORD_CHANGE':
      return 'Changed account password';
    case 'STATUS_CHANGE':
      return `Account status changed to ${metadata?.status}`;
    case 'ROLE_CHANGE':
      return `Role changed from "${metadata?.oldRole}" to "${metadata?.newRole}"`;
    case 'DEPARTMENT_CHANGE':
      return `Department changed from "${metadata?.oldDepartment}" to "${metadata?.newDepartment}"`;
    case 'ACCOUNT_CREATED':
      return 'New account created';
    case 'ACCOUNT_DEACTIVATED':
      return 'Account deactivated';
    case 'SETTINGS_UPDATE':
      return `Updated settings: ${
        Object.entries(metadata || {})
          .map(([key, value]) => `${key.replace('_', ' ')} to "${value}"`)
          .join(', ')
      }`;
    case 'SAMPLE_ACCEPTED':
      return `Accepted sample collection request ${metadata?.sampleId}`;
    case 'SAMPLE_COLLECTED':
      return `Collected sample ${metadata?.sampleId} from ${metadata?.location}`;
    case 'SAMPLE_DELIVERED':
      return `Delivered sample ${metadata?.sampleId} to ${metadata?.location}`;
    case 'SAMPLE_HANDOVER':
      return `Handed over sample ${metadata?.sampleId} to ${metadata?.recipient}`;
    case 'TASK_ASSIGNMENT':
      return `Assigned task "${metadata?.taskTitle}" to ${metadata?.assignedTo}`;
    case 'TASK_ACCEPTANCE':
      return `Accepted task "${metadata?.taskTitle}"`;
    case 'TASK_COMPLETION':
      return `Completed task "${metadata?.taskTitle}"`;
    case 'SAMPLE_COLLECTION':
      return `Logged sample collection for patient ${metadata?.patientName || ''}`;
    case 'WALKIN_CLIENT':
      return `Logged walk-in client: ${metadata?.patientName || ''}`;
    case 'SAMPLE_REGISTRATION':
      return `Registered sample with ID ${metadata?.sampleId || ''}`;
    case 'LEAVE_REQUEST':
      return `Submitted leave request (${metadata?.type}) from ${metadata?.from} to ${metadata?.to}`;
    case 'LEAVE_APPROVAL':
      return `Approved leave request for ${metadata?.employeeName || ''}`;
    case 'LOAN_REQUEST':
      return `Submitted loan request for $${metadata?.amount || ''}`;
    case 'LOAN_APPROVAL':
      return `Approved loan request for ${metadata?.employeeName || ''}`;
    default:
      return 'Unknown activity';
  }
}; 