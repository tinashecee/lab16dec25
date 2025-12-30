import {
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

export interface AttendanceRecord {
  id: string;
  user_id: string;
  user_name: string;
  user_email?: string;
  status: "ACTIVE" | "COMPLETED" | string;
  clock_in_time?: Timestamp | null;
  clock_out_time?: Timestamp | null;
  date?: string;
  total_hours?: number | null;
  notes?: string | null;
  location?: {
    lat?: number;
    lng?: number;
  } | null;
  created_at?: Timestamp;
  updated_at?: Timestamp;
}

export const attendanceService = {
  async getAttendanceRecords(): Promise<AttendanceRecord[]> {
    const attendanceRef = collection(db, "attendance");
    const q = query(attendanceRef, orderBy("created_at", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(
      (d) =>
        ({
          id: d.id,
          ...d.data(),
        } as AttendanceRecord)
    );
  },
};

