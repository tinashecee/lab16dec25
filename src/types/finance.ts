export interface VPSettings {
  id?: string;
  defaultAmountPerSample: number;
  currency: string;
  updatedByUserId?: string;
  updatedAt?: import('firebase/firestore').Timestamp;
  createdAt?: import('firebase/firestore').Timestamp;
}

export interface DriverFloat {
  id?: string;
  driverId: string;
  driverName?: string;
  allocatedAmount: number;
  remainingBalance: number;
  currency: string;
  status: 'active' | 'closed';
  allocatedByUserId: string;
  allocatedByUserName?: string;
  createdAt?: import('firebase/firestore').Timestamp;
  updatedAt?: import('firebase/firestore').Timestamp;
}

export interface DriverFloatTransaction {
  id?: string;
  floatId: string;
  driverId: string;
  type: 'credit' | 'debit';
  amount: number;
  reason: 'allocation' | 'vp_disbursement' | 'adjustment' | 'return' | 'refund';
  referenceId?: string; // e.g., vpDisbursementId or manual adjustment ref
  createdAt?: import('firebase/firestore').Timestamp;
  createdByUserId: string;
  createdByUserName?: string;
  notes?: string; // Additional notes for returns/refunds
}

export interface DriverStatementEntry {
  id: string;
  date: Date;
  type: 'allocation' | 'disbursement' | 'return' | 'refund';
  description: string;
  amount: number;
  currency: string;
  balance: number; // Running balance after this transaction
}

export interface VPDisbursement {
  id?: string;
  sampleId: string;
  nurseId: string;
  nurseName?: string;
  driverId: string;
  driverName?: string;
  amount: number;
  currency: string;
  notes?: string;
  disbursedAt?: import('firebase/firestore').Timestamp;
  createdByUserId: string;
  createdByUserName?: string;
  floatId?: string; // the driver float used
}


