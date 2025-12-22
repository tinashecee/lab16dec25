import { Timestamp } from "firebase/firestore";

export interface LeaveRequest {
  id: string;
  request_id?: string;
  name: string;
  email?: string;
  department: string;
  type: string;
  from: string;
  to: string;
  days: number;
  status: "PENDING" | "CONFIRMED" | "APPROVED" | "REJECTED";
  approver1?: string;
  approver2?: string;
  comments?: string;
  rejectionReason?: string;
  contact?: string;
  leaveDaysBalance?: number;
  date_requested?: string;
  reason?: string;
  downloadLink?: string[];
  confirmedBy?: string;
  approvedBy?: string;
  rejectedBy?: string;
  confirmedAt?: Timestamp;
  approvedAt?: Timestamp;
  rejectedAt?: Timestamp;
  confirmationComments?: string;
  approvalComments?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
