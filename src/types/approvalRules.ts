export interface Approver {
  userId: string;
  userName: string;
  order: number;
  role?: string;
}

export interface ApprovalRule {
  id?: string;
  type: 'leave' | 'loan' | 'inventory';
  threshold?: number;
  numberOfApprovers: number;
  approvers: Approver[];
  requireAllApprovers: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  status: 'active' | 'inactive';
}

export interface ApprovalRuleFormData {
  type: ApprovalRule['type'];
  threshold?: number;
  numberOfApprovers: number;
  approvers: Approver[];
  requireAllApprovers: boolean;
} 