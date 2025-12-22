import { User } from "../services/userService";
import { Timestamp } from "firebase/firestore";

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: Timestamp;
  uploadedBy: string;
}

export interface TaskComment {
  id: string;
  text: string;
  userId: string;
  userName: string;
  createdAt: Timestamp;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  status: 'Pending' | 'InProgress' | 'Completed' | 'Cancelled';
  dueDate: string;
  assignedUsers: User[];
  createdBy: string;
  assignedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  acceptedAt?: Timestamp;
  completedAt?: Timestamp;
  completedBy?: string;
  read?: boolean;
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
}
