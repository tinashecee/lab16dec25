import { Requisition } from "../lib/firestore/inventory";
import { emailApi } from "../api/emailApi";

export const emailService = {
  async sendApprovalEmail(params: {
    requisitionId: string;
    approverEmail: string;
    requesterName: string;
    department: string;
  }) {
    try {
      await emailApi.sendApprovalEmail(params);
      console.log("Approval email sent successfully:", params.requisitionId);
    } catch (error) {
      console.error("Failed to send approval email:", error);
      // Don't throw error - email failures shouldn't block operations
      // Email server may be down or unavailable
    }
  },

  async sendRejectionEmail(params: {
    requisitionId: string;
    requesterEmail: string;
    rejectorName: string;
    reason: string;
    stage: string;
  }) {
    try {
      await emailApi.sendRejectionEmail(params);
      console.log("Rejection email sent successfully:", params.requisitionId);
    } catch (error) {
      console.error("Failed to send rejection email:", error);
      // Don't throw error - email failures shouldn't block operations
    }
  },

  async sendIssuanceEmail(params: {
    requisitionId: string;
    requesterEmail: string;
    requesterName: string;
    issuedProducts: Requisition["issuedProducts"];
    notes?: string;
  }) {
    try {
      await emailApi.sendIssuanceEmail(params);
      console.log("Issuance email sent successfully:", params.requisitionId);
    } catch (error) {
      console.error("Failed to send issuance email:", error);
      // Don't throw error - email failures shouldn't block operations
    }
  },

  async getApproverEmail(approverName: string): Promise<string> {
    try {
      const { collection, query, where, getDocs } = await import("firebase/firestore");
      const { db } = await import("../config/firebase");
      
      const usersRef = collection(db, "users");
      
      // First try to find by name
      let q = query(usersRef, where("name", "==", approverName));
      let snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data();
        return userData.email || "";
      }
      
      // If not found by name, try to find by role
      q = query(usersRef, where("role", "==", approverName));
      snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        // Return the first user's email for this role
        const userData = snapshot.docs[0].data();
        return userData.email || "";
      }
      
      return "";
    } catch (error) {
      console.error("Error getting approver email:", error);
      return "";
    }
  },

  async sendDriverHandoverEmail(params: {
    requisitionId: string;
    requesterEmail: string;
    requesterName: string;
    driverName: string;
    dispatchNumber: string;
  }) {
    try {
      await emailApi.sendDriverHandoverEmail(params);
      console.log("Driver handover email sent successfully:", params.requisitionId);
    } catch (error) {
      console.error("Failed to send driver handover email:", error);
      // Don't throw error - email failures shouldn't block operations
    }
  },

  async sendReceiptConfirmationEmail(params: {
    requisitionId: string;
    requesterEmail: string;
    requesterName: string;
    dispatchNumber: string;
  }) {
    try {
      await emailApi.sendReceiptConfirmationEmail(params);
      console.log("Receipt confirmation email sent successfully:", params.requisitionId);
    } catch (error) {
      console.error("Failed to send receipt confirmation email:", error);
      // Don't throw error - email failures shouldn't block operations
    }
  },

  async sendTaskAssignmentEmail(params: {
    taskId: string;
    assignedToEmail: string;
    assignedToName: string;
    assignedByName: string;
    taskTitle: string;
    taskDescription?: string;
    dueDate: string;
    priority?: string;
  }) {
    try {
      await emailApi.sendTaskAssignmentEmail(params);
      console.log("Task assignment email sent successfully:", params.taskId);
    } catch (error) {
      console.error("Failed to send task assignment email:", error);
      // Don't throw error - email failures shouldn't block operations
    }
  },

  async sendTaskCompletionEmail(params: {
    taskId: string;
    assignerEmail: string;
    assignerName: string;
    completedByName: string;
    taskTitle: string;
    completedAt?: string;
  }) {
    try {
      await emailApi.sendTaskCompletionEmail(params);
      console.log("Task completion email sent successfully:", params.taskId);
    } catch (error) {
      console.error("Failed to send task completion email:", error);
      // Don't throw error - email failures shouldn't block operations
    }
  },
};
