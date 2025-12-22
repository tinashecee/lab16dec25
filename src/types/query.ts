import { Timestamp } from "firebase/firestore";

export interface QueryAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: Timestamp;
  uploadedBy: string;
  uploadedByName: string;
}

export interface QueryComment {
  id: string;
  text: string;
  userId: string;
  userName: string;
  createdAt: Timestamp;
}

export interface QuerySolution {
  id: string;
  text: string;
  providedBy: string;
  providedByName: string;
  createdAt: Timestamp;
}

export interface Query {
  id: string;
  title: string;
  description: string;
  category: 'Equipment' | 'Sample Processing' | 'Reporting' | 'Safety' | 'Quality Control' | 'General';
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  submittedBy: string;
  submittedByName: string;
  assignedTo?: string;
  assignedToName?: string;
  solution?: QuerySolution;
  comments?: QueryComment[];
  attachments?: QueryAttachment[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  resolvedAt?: Timestamp;
}

export interface NewQuery {
  title: string;
  description: string;
  category: Query['category'];
  priority: Query['priority'];
  submittedBy: string;
  submittedByName: string;
  attachments?: QueryAttachment[];
}

