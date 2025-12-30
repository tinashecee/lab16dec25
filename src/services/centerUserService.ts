import {
  collection,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

export type CenterUserStatus = "pending" | "approved" | "inactive";

export interface CenterUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  center?: string;
  status: CenterUserStatus;
  createdAt?: Timestamp;
}

const COLLECTION_NAME = "center_users";

export const centerUserService = {
  async getCenterUsers(): Promise<CenterUser[]> {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME));
    return snapshot.docs.map(
      (d) =>
        ({
          id: d.id,
          ...d.data(),
        } as CenterUser)
    );
  },

  async updateStatus(userId: string, status: CenterUserStatus): Promise<void> {
    const ref = doc(db, COLLECTION_NAME, userId);
    await updateDoc(ref, { status, updatedAt: Timestamp.now() });
  },
};

