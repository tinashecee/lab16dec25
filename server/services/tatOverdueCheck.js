import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../index.js";

/**
 * Checks all processing tests in testTATTracking and marks them as overdue if their TAT is exceeded.
 */
export async function markOverdueTests() {
  const now = new Date();
  const q = query(collection(db, "testTATTracking"), where("status", "==", "processing"));
  const snapshot = await getDocs(q);

  for (const docSnap of snapshot.docs) {
    const { accessionDate, targetTATMinutes } = docSnap.data();
    if (!accessionDate || !targetTATMinutes) continue;
    const dueTime = new Date(accessionDate).getTime() + targetTATMinutes * 60000;
    if (now.getTime() > dueTime) {
      await updateDoc(doc(db, "testTATTracking", docSnap.id), { status: "overdue" });
    }
  }
  console.log("Periodic TAT overdue check complete.");
} 