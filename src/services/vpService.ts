import { db } from '../config/firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  runTransaction,
  updateDoc,
  where
} from 'firebase/firestore';
import { DriverFloat, DriverFloatTransaction, VPDisbursement, VPSettings } from '../types/finance';

const SETTINGS_COLLECTION = 'vpSettings';
const FLOATS_COLLECTION = 'driverFloats';
const FLOAT_TX_COLLECTION = 'driverFloatTransactions';
const DISBURSEMENTS_COLLECTION = 'vpDisbursements';

export type VPSettingsUpdate = Pick<VPSettings, 'defaultAmountPerSample' | 'currency'> & {
  updatedByUserId: string;
  updatedByUserName?: string;
};

export const vpService = {
  // Settings
  async getSettings(): Promise<VPSettings | null> {
    const q = query(collection(db, SETTINGS_COLLECTION), orderBy('createdAt', 'desc'), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...(d.data() as any) } as VPSettings;
  },

  async setSettings(update: VPSettingsUpdate): Promise<string> {
    const data: Omit<VPSettings, 'id'> = {
      defaultAmountPerSample: update.defaultAmountPerSample,
      currency: update.currency,
      updatedByUserId: update.updatedByUserId,
      updatedAt: serverTimestamp() as Timestamp,
      createdAt: serverTimestamp() as Timestamp
    };
    const ref = await addDoc(collection(db, SETTINGS_COLLECTION), data);
    return ref.id;
  },

  // Floats
  async allocateDriverFloat(input: {
    driverId: string;
    driverName?: string;
    amount: number;
    currency: string;
    allocatedByUserId: string;
    allocatedByUserName?: string;
  }): Promise<{ floatId: string; transactionId: string; }> {
    return await runTransaction(db, async (tx) => {
      const floatRef = doc(collection(db, FLOATS_COLLECTION));
      const floatData: Omit<DriverFloat, 'id'> = {
        driverId: input.driverId,
        driverName: input.driverName,
        allocatedAmount: input.amount,
        remainingBalance: input.amount,
        currency: input.currency,
        status: 'active',
        allocatedByUserId: input.allocatedByUserId,
        allocatedByUserName: input.allocatedByUserName,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
      };
      tx.set(floatRef, floatData);

      const txRef = doc(collection(db, FLOAT_TX_COLLECTION));
      const txData: Omit<DriverFloatTransaction, 'id'> = {
        floatId: floatRef.id,
        driverId: input.driverId,
        type: 'credit',
        amount: input.amount,
        reason: 'allocation',
        createdAt: serverTimestamp() as Timestamp,
        createdByUserId: input.allocatedByUserId,
        createdByUserName: input.allocatedByUserName
      };
      tx.set(txRef, txData);

      return { floatId: floatRef.id, transactionId: txRef.id };
    });
  },

  async listActiveDriverFloats(): Promise<DriverFloat[]> {
    const q = query(collection(db, FLOATS_COLLECTION), where('status', '==', 'active'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as DriverFloat[];
  },

  async closeDriverFloat(floatId: string): Promise<void> {
    const ref = doc(db, FLOATS_COLLECTION, floatId);
    await updateDoc(ref, { status: 'closed', updatedAt: serverTimestamp() as Timestamp });
  },

  // Disbursements
  async recordVPDisbursement(input: {
    sampleId: string;
    nurseId: string;
    nurseName?: string;
    driverId: string;
    driverName?: string;
    amount: number;
    currency: string;
    notes?: string;
    createdByUserId: string;
    createdByUserName?: string;
    floatId?: string; // optional - if not provided, use most recent active float for driver
  }): Promise<{ disbursementId: string; transactionId: string; floatId: string; }> {
    return await runTransaction(db, async (tx) => {
      // Determine float
      let floatId = input.floatId;
      if (!floatId) {
        const floatsQ = query(
          collection(db, FLOATS_COLLECTION),
          where('driverId', '==', input.driverId),
          where('status', '==', 'active'),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        const floatsSnap = await getDocs(floatsQ);
        if (floatsSnap.empty) {
          throw new Error('No active float found for driver');
        }
        floatId = floatsSnap.docs[0].id;
      }
      const floatRef = doc(db, FLOATS_COLLECTION, floatId!);
      const floatDoc = await tx.get(floatRef);
      if (!floatDoc.exists()) {
        throw new Error('Float not found');
      }
      const floatData = floatDoc.data() as DriverFloat;
      if (floatData.status !== 'active') {
        throw new Error('Float is not active');
      }
      if ((floatData.remainingBalance || 0) < input.amount) {
        throw new Error('Insufficient float balance');
      }

      // Create disbursement
      const disbRef = doc(collection(db, DISBURSEMENTS_COLLECTION));
      const disbData: Omit<VPDisbursement, 'id'> = {
        sampleId: input.sampleId,
        nurseId: input.nurseId,
        nurseName: input.nurseName,
        driverId: input.driverId,
        driverName: input.driverName,
        amount: input.amount,
        currency: input.currency,
        notes: input.notes,
        disbursedAt: serverTimestamp() as Timestamp,
        createdByUserId: input.createdByUserId,
        createdByUserName: input.createdByUserName,
        floatId
      };
      tx.set(disbRef, disbData);

      // Create float transaction (debit)
      const txRef = doc(collection(db, FLOAT_TX_COLLECTION));
      const floatTx: Omit<DriverFloatTransaction, 'id'> = {
        floatId: floatId!,
        driverId: input.driverId,
        type: 'debit',
        amount: input.amount,
        reason: 'vp_disbursement',
        referenceId: disbRef.id,
        createdAt: serverTimestamp() as Timestamp,
        createdByUserId: input.createdByUserId,
        createdByUserName: input.createdByUserName
      };
      tx.set(txRef, floatTx);

      // Update float remaining balance
      const newBalance = (floatData.remainingBalance || 0) - input.amount;
      tx.update(floatRef, { remainingBalance: newBalance, updatedAt: serverTimestamp() as Timestamp });

      return { disbursementId: disbRef.id, transactionId: txRef.id, floatId: floatId! };
    });
  },

  async listDisbursements(filters?: {
    driverId?: string;
    nurseId?: string;
    start?: Date;
    end?: Date;
  }): Promise<VPDisbursement[]> {
    const constraints: any[] = [orderBy('disbursedAt', 'desc')];
    if (filters?.driverId) constraints.push(where('driverId', '==', filters.driverId));
    if (filters?.nurseId) constraints.push(where('nurseId', '==', filters.nurseId));
    const q = query(collection(db, DISBURSEMENTS_COLLECTION), ...constraints);
    const snap = await getDocs(q);
    let results = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as VPDisbursement[];
    if (filters?.start || filters?.end) {
      results = results.filter(d => {
        const ts = (d.disbursedAt as unknown as Timestamp)?.toDate?.() ?? new Date(0);
        if (filters.start && ts < filters.start) return false;
        if (filters.end && ts > filters.end) return false;
        return true;
      });
    }
    return results;
  },

  // Statement
  async getDriverStatement(floatId: string): Promise<import('../types/finance').DriverStatementEntry[]> {
    // Get all transactions for this float
    let transactions: DriverFloatTransaction[];
    try {
      const txQuery = query(
        collection(db, FLOAT_TX_COLLECTION),
        where('floatId', '==', floatId),
        orderBy('createdAt', 'asc')
      );
      const txSnap = await getDocs(txQuery);
      transactions = txSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as DriverFloatTransaction[];
    } catch (error: any) {
      // If index doesn't exist, fetch without orderBy and sort in memory
      if (error?.code === 'failed-precondition') {
        const txQuery = query(
          collection(db, FLOAT_TX_COLLECTION),
          where('floatId', '==', floatId)
        );
        const txSnap = await getDocs(txQuery);
        transactions = txSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as DriverFloatTransaction[];
        // Sort by createdAt in memory
        transactions.sort((a, b) => {
          const aDate = (a.createdAt as unknown as Timestamp)?.toDate?.() ?? new Date(0);
          const bDate = (b.createdAt as unknown as Timestamp)?.toDate?.() ?? new Date(0);
          return aDate.getTime() - bDate.getTime();
        });
      } else {
        throw error;
      }
    }

    // Get all disbursements for this float to get nurse names and sample IDs
    const disbQuery = query(
      collection(db, DISBURSEMENTS_COLLECTION),
      where('floatId', '==', floatId)
    );
    const disbSnap = await getDocs(disbQuery);
    const disbursements = disbSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as VPDisbursement[];
    const disbMap = new Map(disbursements.map(d => [d.id, d]));

    // Build statement entries
    const entries: import('../types/finance').DriverStatementEntry[] = [];
    let runningBalance = 0;

    for (const tx of transactions) {
      const date = (tx.createdAt as unknown as Timestamp)?.toDate?.() ?? new Date();
      let description = '';
      let type: 'allocation' | 'disbursement' | 'return' | 'refund' = 'allocation';

      if (tx.reason === 'allocation') {
        type = 'allocation';
        description = `Allocation (${tx.createdByUserName || tx.createdByUserId})`;
        runningBalance += tx.amount;
      } else if (tx.reason === 'vp_disbursement' && tx.referenceId) {
        type = 'disbursement';
        const disb = disbMap.get(tx.referenceId);
        if (disb) {
          description = `Disbursement (${disb.nurseName || disb.nurseId}) - Sample: ${disb.sampleId}`;
        } else {
          description = `Disbursement - Sample: ${tx.referenceId}`;
        }
        runningBalance -= tx.amount;
      } else if (tx.reason === 'return') {
        type = 'return';
        description = `Return${tx.notes ? ` - ${tx.notes}` : ''} (${tx.createdByUserName || tx.createdByUserId})`;
        runningBalance += tx.amount;
      } else if (tx.reason === 'refund') {
        type = 'refund';
        description = `Refund${tx.notes ? ` - ${tx.notes}` : ''} (${tx.createdByUserName || tx.createdByUserId})`;
        runningBalance += tx.amount;
      } else {
        // adjustment or other
        description = `Adjustment${tx.notes ? ` - ${tx.notes}` : ''} (${tx.createdByUserName || tx.createdByUserId})`;
        if (tx.type === 'credit') {
          runningBalance += tx.amount;
        } else {
          runningBalance -= tx.amount;
        }
      }

      entries.push({
        id: tx.id!,
        date,
        type,
        description,
        amount: tx.amount,
        currency: '', // Will be filled from float
        balance: runningBalance
      });
    }

    return entries;
  },

  // Subscriptions
  onSettingsChange(callback: (settings: VPSettings | null) => void) {
    const qy = query(collection(db, SETTINGS_COLLECTION), orderBy('createdAt', 'desc'), limit(1));
    return onSnapshot(qy, (snap) => {
      if (snap.empty) {
        callback(null);
      } else {
        const d = snap.docs[0];
        callback({ id: d.id, ...(d.data() as any) } as VPSettings);
      }
    });
  }
};


