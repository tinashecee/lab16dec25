import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  Timestamp,
  serverTimestamp,
  doc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";

export interface LoanRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  amount: number;
  purpose: string;
  approver1: string;
  approver2: string;
  dateRequested: string;
  email: string;
  repaymentMonths: number;
  status: "PENDING" | "CONFIRMED" | "APPROVED" | "REJECTED";
  createdAt: number;
  approvedAt?: number;
  approvedBy?: string;
  rejectedAt?: number;
  rejectedBy?: string;
  rejectionReason?: string;
}

const COLLECTION_NAME = "loanRequests";

export const loanService = {
  async getUsersWithRole(role: string): Promise<string[] | null> {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("role", "==", role));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const emails = snapshot.docs
          .map((doc) => doc.data().email)
          .filter(Boolean);
        return emails;
      }
      return null;
    } catch (error) {
      console.error("Error fetching users with role:", error);
      return null;
    }
  },
  async createLoanRequest(
    data: Omit<LoanRequest, "id" | "status" | "createdAt">
  ): Promise<string> {
    try {
      const today = new Date();
      const dateRequested = today.toISOString().split("T")[0]; // Extract the date part

      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...data,
        status: "PENDING",
        dateRequested: dateRequested,
        createdAt: serverTimestamp(),
      });
      await updateDoc(docRef, {
        requestId: docRef.id,
      });
      // Send email notification
      this.getUsersWithRole(data.approver1).then(async (emails) => {
        if (emails) {
          const response = await fetch(
            "https://app.labpartners.co.zw/send-loan-req-email",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                a: data.approver1,
                b: data.employeeName,
                c: docRef.id,
                d: data.amount,
                e: dateRequested,
                f: data.repaymentMonths,
                g: data.purpose,
                h: emails,
              }),
            }
          );
          // Check if the response is OK (status code 200–299)
          if (response.ok) {
            const data = await response.json(); // Parse JSON if the response body contains JSON
            console.log("Email sent successfully:");
            // Navigate to the HR approvals page
            window.location.href = "/app/hr-approvals";
            // Handle success (e.g., show a notification or update UI)
          } else {
            const errorDetails = await response.text(); // Get the error details
            console.error("Failed to send email:", errorDetails);
            // Handle error (e.g., show an error message to the user)
          }
        }
      });
    } catch (error) {
      console.error("Error creating loan request:", error);
      throw new Error("Failed to create loan request");
    }
  },

  async getLoanRequestsByEmployee(employeeId: string): Promise<LoanRequest[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where("employeeId", "==", employeeId),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp).toMillis(),
        approvedAt: doc.data().approvedAt
          ? (doc.data().approvedAt as Timestamp).toMillis()
          : undefined,
        rejectedAt: doc.data().rejectedAt
          ? (doc.data().rejectedAt as Timestamp).toMillis()
          : undefined,
      })) as LoanRequest[];
    } catch (error) {
      console.error("Error fetching loan requests:", error);
      throw new Error("Failed to fetch loan requests");
    }
  },

  async getPendingLoanRequests(): Promise<LoanRequest[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where("status", "==", "PENDING"),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp).toMillis(),
      })) as LoanRequest[];
    } catch (error) {
      console.error("Error fetching pending loan requests:", error);
      throw new Error("Failed to fetch pending loan requests");
    }
  },

  async getLoanRequestsByDepartment(
    department: string
  ): Promise<LoanRequest[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where("department", "==", department),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp).toMillis(),
        approvedAt: doc.data().approvedAt
          ? (doc.data().approvedAt as Timestamp).toMillis()
          : undefined,
        rejectedAt: doc.data().rejectedAt
          ? (doc.data().rejectedAt as Timestamp).toMillis()
          : undefined,
      })) as LoanRequest[];
    } catch (error) {
      console.error("Error fetching loan requests by department:", error);
      throw new Error("Failed to fetch loan requests by department");
    }
  },

  async deleteLoanRequest(requestId: string) {
    const requestRef = doc(db, "loanRequests", requestId);
    await deleteDoc(requestRef);
  },

  async getApprovalsToday() {
    // Logic to fetch approvals made today
  },

  async getRejectionsToday() {
    // Logic to fetch rejections made today
  },

  async getTotalLoanRequests() {
    // Logic to fetch total loan requests
  },

  async getAllLoanRequests(): Promise<LoanRequest[]> {
    try {
      const q = query(
        collection(db, "loanRequests"),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: (data.createdAt as Timestamp).toMillis(),
          approvedAt:
            data.approvedAt instanceof Timestamp
              ? (data.approvedAt as Timestamp).toMillis()
              : undefined,
          rejectedAt:
            data.rejectedAt instanceof Timestamp
              ? (data.rejectedAt as Timestamp).toMillis()
              : undefined,
        } as LoanRequest;
      });
    } catch (error) {
      console.error("Error fetching all loan requests:", error);
      throw new Error("Failed to fetch all loan requests");
    }
  },

  async updateLoanRequestStatus(
    requestId: string,
    status: string,
    additionalData?: {
      approvedBy?: string;
      approvedAt?: number;
      rejectionReason?: string;
    }
  ): Promise<void> {
    const requestRef = doc(db, "loanRequests", requestId);
    await updateDoc(requestRef, {
      status,
      ...(additionalData?.approvedBy && {
        approvedBy: additionalData.approvedBy,
      }),
      ...(additionalData?.approvedAt && {
        approvedAt: additionalData.approvedAt,
      }),
      ...(additionalData?.rejectionReason && {
        rejectionReason: additionalData.rejectionReason,
      }),
    });
    // Fetch the document
    const requestSnap = await getDoc(requestRef);

    // Access the document data
    const requestData = requestSnap.data();

    // Send email notification
    const response = await fetch("https://app.labpartners.co.zw/send-loan-res-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        a: requestData?.employeeName,
        b: requestData?.requestId,
        c: requestData?.amount,
        d: requestData?.dateRequested,
        e: requestData?.repaymentMonths,
        f: requestData?.purpose,
        g: requestData?.status,
        h: requestData?.email,
        i: requestData?.rejectionReason,
      }),
    });
    if (response.ok) {
      const data = await response.json(); // Parse JSON if the response body contains JSON
      console.log("Email sent successfully:");
      // Handle success (e.g., show a notification or update UI)
    } else {
      const errorDetails = await response.text(); // Get the error details
      console.error("Failed to send email:", errorDetails);
      // Handle error (e.g., show an error message to the user)
    }
  },
};
