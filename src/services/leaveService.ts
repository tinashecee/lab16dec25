import {
  collection,
  addDoc,
  Timestamp,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { v4 as uuidv4 } from "uuid";
import moment from "moment";

import { LeaveRequest } from "../types/leave";
interface LeaveRequestData {
  employeeId: string;
  employeeName: string;
  email: string;
  department: string;
  type: string;
  from: string;
  to: string;
  days: number;
  contact: string;
  comments: string;
  attachments?: string[];
  userRole?: string;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
}

export const leaveService = {
  async getUserDetails(userId: string) {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (!userDoc.exists()) {
        throw new Error("User not found");
      }
      return userDoc.data();
    } catch (error) {
      console.error("Error fetching user details:", error);
      throw error;
    }
  },

  calculateLeaveDays(dateJoined: string, todayDate: string): number {
    const start = moment(dateJoined);
    const end = moment(todayDate);

    // Calculate months between dates
    const months = end.diff(start, "months");

    // Each month gives 1.84 days of leave
    return months * 1.84;
  },

  async updateUserLeaveAccrual(userId: string): Promise<void> {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (!userDoc.exists()) {
        throw new Error("User not found");
      }

      const userData = userDoc.data();
      const dateJoined = userData.dateJoined;
      if (!dateJoined) {
        throw new Error("User joining date not found");
      }

      // Calculate accrued leave
      const today = moment().format("YYYY-MM-DD");
      const accruedLeave = this.calculateLeaveDays(dateJoined, today);

      // Update user document with accrued leave
      await updateDoc(doc(db, "users", userId), {
        leave_accrued: accruedLeave,
        leave_last_calculated: today
      });
    } catch (error) {
      console.error("Error updating user leave accrual:", error);
      throw error;
    }
  },

  async getDepartmentHead(departmentName: string): Promise<string | null> {
    try {
      const departmentsRef = collection(db, "departments");
      const q = query(departmentsRef, where("name", "==", departmentName));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const departmentData = snapshot.docs[0].data();
        return departmentData.head || null;
      }
      return null;
    } catch (error) {
      console.error("Error fetching department head:", error);
      return null;
    }
  },
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

  async createLeaveRequest(data: LeaveRequestData) {
    try {
      const leaveRequestsRef = collection(db, "leave-requests");
      const request_id = uuidv4().substring(0, 12);

      // Get user details including dateJoined
      const userDetails = await this.getUserDetails(data.employeeId);

      if (!userDetails.dateJoined) {
        throw new Error("User joining date not found");
      }

      // Calculate leave days balance using dateJoined
      const today = moment().format("YYYY-MM-DD");
      const leaveDays = this.calculateLeaveDays(userDetails.dateJoined, today);
      const leaveDaysBalance = leaveDays - (userDetails.leaveDaysTaken || 0);

      // Determine approvers based on department and role
      let approver1 = "";
      let approver2 = "";
      let departmentHead: string | null = null;

      // Check if user is a manager (excluding Finance Manager to prevent self-approval)
      const isManager = ["Admin Manager", "Lab Manager", "IT Specialist"].includes(data.userRole || "");
      
      // Check if user is Finance Manager (special case to prevent self-approval)
      const isFinanceManager = data.userRole === "Finance Manager";
      
      // Check if user is in finance department (excluding finance manager and executive)
      const isFinanceUser = data.department === "Finance" &&
                          !["Finance Manager", "Finance Executive"].includes(data.userRole || "");

      if (isFinanceManager) {
        // For Finance Manager: approver1 = Admin Manager, approver2 = Finance Executive (no self-approval)
        approver1 = "Admin Manager";
        approver2 = "Finance Executive";
      } else if (isManager) {
        // For other managers: approver1 = Finance Manager, approver2 = Finance Executive
        approver1 = "Finance Manager";
        approver2 = "Finance Executive";
      } else if (isFinanceUser) {
        // For finance department users: approver1 = Admin Manager, approver2 = Finance Manager
        approver1 = "Admin Manager";
        approver2 = "Finance Manager";
      } else {
        // For all other users: approver1 = Department Head, approver2 = Finance Manager
        departmentHead = await this.getDepartmentHead(data.department);
        if (!departmentHead) {
          throw new Error(`No department head found for ${data.department}`);
        }
        approver1 = departmentHead;
        approver2 = "Finance Manager";
      }

      await addDoc(leaveRequestsRef, {
        request_id,
        name: data.employeeName,
        email: data.email,
        department: data.department,
        type: data.type,
        from: data.from,
        to: data.to,
        days: data.days,
        contact: data.contact,
        comments: data.comments,
        date_requested: moment().format("YYYY-MM-DD"),
        status: "PENDING",
        approver1,
        approver2,
        doctors_note: "",
        downloadLink: data.attachments || [],
        leaveDaysBalance,
        preapproval: "true",
        reason: data.comments,
        userRole: data.userRole,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Only send email if departmentHead exists (for non-manager users)
      if (departmentHead) {
        this.getUsersWithRole(departmentHead).then(async (emails) => {
          if (emails) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const response = await fetch("https://app.labpartners.co.zw/send-leave-req-email",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  a: departmentHead,
                  b: data.employeeName,
                  c: request_id,
                  d: data.type,
                  e: moment().format("YYYY-MM-DD"),
                  f: data.from,
                  g: data.to,
                  h: data.days,
                  emails,
                }),
              }
            );

            if (response.ok) {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const data = await response.json(); // Parse JSON if the response body contains JSON
              console.log("Email sent successfully:");
              // Navigate to the HR approvals page
              window.location.href = "/app/hr";
              // Handle success (e.g., show a notification or update UI)
            } else {
              const errorDetails = await response.text(); // Get the error details
              console.error("Failed to send email:", errorDetails);
              // Handle error (e.g., show an error message to the user)
            }
          } else {
            console.log(`No users found with role: ${departmentHead}`);
          }
        });
      }
    } catch (error) {
      console.error("Error creating leave request:", error);
      throw error;
    }
  },

  async getHolidaysBetweenDates(
    startDate: string,
    endDate: string
  ): Promise<Holiday[]> {
    try {
      const holidaysRef = collection(db, "holidays");
      const q = query(
        holidaysRef,
        where("date", ">=", startDate),
        where("date", "<=", endDate)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Holiday[];
    } catch (error) {
      console.error("Error fetching holidays:", error);
      return [];
    }
  },

  // Continuous day count (includes weekends/holidays) for leave types like Maternity
  calculateCalendarDays(startDate: string, endDate: string): number {
    const start = moment(startDate);
    const end = moment(endDate);
    if (!start.isValid() || !end.isValid() || end.isBefore(start)) {
      return 0;
    }
    return end.diff(start, "days") + 1; // inclusive
  },

  async calculateBusinessDays(
    startDate: string,
    endDate: string
  ): Promise<number> {
    const start = moment(startDate);
    const end = moment(endDate);

    // Get holidays between these dates
    const holidays = await this.getHolidaysBetweenDates(startDate, endDate);
    const holidayDates = holidays.map((h) =>
      moment(h.date).format("YYYY-MM-DD")
    );

    let days = 0;
    const current = start;

    while (current.isSameOrBefore(end)) {
      // Check if it's not a weekend and not a holiday
      if (
        current.day() !== 0 && // Sunday
        current.day() !== 6 && // Saturday
        !holidayDates.includes(current.format("YYYY-MM-DD"))
      ) {
        days++;
      }
      current.add(1, "days");
    }

    return days;
  },

  async updateLeaveRequest(
    requestId: string,
    data: Partial<LeaveRequestData>
  ): Promise<void> {
    try {
      const docRef = doc(db, "leave-requests", requestId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Error updating leave request:", error);
      throw error;
    }
  },

  async getPendingLeaveRequests(approverRole: string): Promise<LeaveRequest[]> {
    try {
      const leaveRequestsRef = collection(db, "leave-requests");
      let q;

      // For Finance Manager and Finance Executive - show all requests (PENDING, CONFIRMED, APPROVED, REJECTED)
      if (approverRole === "Finance Manager" || approverRole === "Finance Executive") {
        q = query(
          leaveRequestsRef,
          where("status", "in", ["PENDING", "CONFIRMED", "APPROVED", "REJECTED"])
        );
      }
      // For all other roles - get all requests where they are approver1 OR approver2
      else {
        // First get requests where they are approver1
        const q1 = query(leaveRequestsRef, where("approver1", "==", approverRole));
        // Then get requests where they are approver2 (for additional visibility)
        const q2 = query(leaveRequestsRef, where("approver2", "==", approverRole));
        
        const [snapshot1, snapshot2] = await Promise.all([
          getDocs(q1),
          getDocs(q2)
        ]);
        
        // Combine results and remove duplicates
        const docs1 = snapshot1.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as LeaveRequest[];
        
        const docs2 = snapshot2.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as LeaveRequest[];
        
        // Remove duplicates by id
        const combinedDocs = [...docs1];
        docs2.forEach(doc => {
          if (!combinedDocs.find(existing => existing.id === doc.id)) {
            combinedDocs.push(doc);
          }
        });
        
        return combinedDocs;
      }

      const snapshot = await getDocs(q);
      
      // For Finance Manager, apply filtering logic
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as LeaveRequest[];
      
      if (approverRole === "Finance Manager") {
        return docs.filter(request => 
          request.status === "CONFIRMED" || // Show confirmed requests that need Finance Manager approval
          request.status === "APPROVED" || // Show approved requests
          request.status === "REJECTED" || // Show rejected requests
          (request.status === "PENDING" && request.approver1 === "Finance Manager") // Show pending requests from managers
        );
      }
      
      if (approverRole === "Finance Executive") {
        return docs.filter(request => 
          request.status === "CONFIRMED" || // Show confirmed requests that need Finance Executive approval
          request.status === "APPROVED" || // Show approved requests
          request.status === "REJECTED" || // Show rejected requests
          (request.status === "PENDING" && request.approver1 === "Finance Executive") // Show pending requests from Finance Manager
        );
      }
      
      return docs;
    } catch (error) {
      console.error("Error fetching pending leave requests:", error);
      throw error;
    }
  },

  async confirmLeaveRequest(
    requestId: string,
    approverId: string,
    comments?: string
  ): Promise<void> {
    try {
      const requestRef = doc(db, "leave-requests", requestId);
      await updateDoc(requestRef, {
        status: "CONFIRMED",
        confirmedBy: approverId,
        confirmedAt: Timestamp.now(),
        confirmationComments: comments || "",
      });
      // Fetch the document
      const requestSnap = await getDoc(requestRef);

      // Access the document data
      const requestData = requestSnap.data();

      // Send email notification
      const response = await fetch(
        "https://app.labpartners.co.zw/send-leave-res-email",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            a: requestData?.name,
            b: "CONFIRMED",
            c: requestData?.request_id,
            d: requestData?.type,
            e: requestData?.date_requested,
            f: requestData?.from,
            g: requestData?.to,
            h: requestData?.days,
            i: requestData?.email,
            j: comments,
          }),
        }
      );
      if (response.ok) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const data = await response.json(); // Parse JSON if the response body contains JSON
        console.log("Leave confirmation email sent successfully:");
        // Handle success (e.g., show a notification or update UI)
      } else {
        const errorDetails = await response.text(); // Get the error details
        console.error("Failed to send leave confirmation email:", errorDetails);
        // Handle error (e.g., show an error message to the user)
      }
    } catch (error) {
      console.error("Error confirming leave request:", error);
      throw error;
    }
  },

  async rejectLeaveRequest(
    requestId: string,
    rejectorId: string,
    reason: string
  ): Promise<void> {
    try {
      const requestRef = doc(db, "leave-requests", requestId);
      await updateDoc(requestRef, {
        status: "REJECTED",
        rejectedBy: rejectorId,
        rejectedAt: Timestamp.now(),
        rejectionReason: reason,
      });

      // Send email notification
      // Fetch the document
      const requestSnap = await getDoc(requestRef);

      // Access the document data
      const requestData = requestSnap.data();

      // Send email notification
      const response = await fetch(
        "https://app.labpartners.co.zw/send-leave-res-email",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            a: requestData?.name,
            b: "REJECTED",
            c: requestData?.request_id,
            d: requestData?.type,
            e: requestData?.date_requested,
            f: requestData?.from,
            g: requestData?.to,
            h: requestData?.days,
            i: requestData?.email,
            j: reason,
          }),
        }
      );
      
      // Check if the response is OK (status code 200–299)
      if (response.ok) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const data = await response.json(); // Parse JSON if the response body contains JSON
        console.log("Leave rejection email sent successfully:");
      } else {
        const errorDetails = await response.text(); // Get the error details
        console.error("Failed to send leave rejection email:", errorDetails);
      }
    } catch (error) {
      console.error("Error rejecting leave request:", error);
      throw error;
    }
  },

  async approveLeaveRequest(
    requestId: string,
    approverId: string,
    comments?: string
  ): Promise<void> {
    try {
      const requestRef = doc(db, "leave-requests", requestId);
      await updateDoc(requestRef, {
        status: "APPROVED",
        approvedBy: approverId,
        approvedAt: Timestamp.now(),
        approvalComments: comments || "",
      });

      // Send email notification

      // Fetch the document
      const requestSnap = await getDoc(requestRef);

      // Access the document data
      const requestData = requestSnap.data();

      // Send email notification
      const response = await fetch(
        "https://app.labpartners.co.zw/send-leave-res-email",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            a: requestData?.name, // userName
            b: "APPROVED", // response
            c: requestData?.request_id, // requestId
            d: requestData?.type, // leaveType
            e: requestData?.date_requested, // dateRequested
            f: requestData?.from, // startDate
            g: requestData?.to, // endDate
            h: requestData?.days, // leaveDays
            i: requestData?.email, // email
            j: comments, // comments
          }),
        }
      );
      
      if (response.ok) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const data = await response.json(); // Parse JSON if the response body contains JSON
        console.log("Leave approval email sent successfully:");
      } else {
        const errorDetails = await response.text(); // Get the error details
        console.error("Failed to send leave approval email:", errorDetails);
      }
    } catch (error) {
      console.error("Error approving leave request:", error);
      throw error;
    }
  },

  async getAllLeaveRequests(): Promise<LeaveRequest[]> {
    try {
      const leaveRequestsRef = collection(db, "leave-requests");
      const snapshot = await getDocs(leaveRequestsRef);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as LeaveRequest[];
    } catch (error) {
      console.error("Error fetching all leave requests:", error);
      throw error;
    }
  },
};
