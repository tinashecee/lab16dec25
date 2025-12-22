// Use environment variable or fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (window.location.hostname === 'localhost' 
    ? "http://localhost:3001/api" 
    : "https://app.labpartners.co.zw/api");

export const emailApi = {
  async sendApprovalEmail(params: {
    requisitionId: string;
    approverEmail: string;
    requesterName: string;
    department: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/email/approval`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error("Failed to send approval email");
    }
  },

  async sendRejectionEmail(params: {
    requisitionId: string;
    requesterEmail: string;
    rejectorName: string;
    reason: string;
    stage: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/email/rejection`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error("Failed to send rejection email");
    }
  },

  async sendIssuanceEmail(params: {
    requisitionId: string;
    requesterEmail: string;
    requesterName: string;
    issuedProducts: any[];
    notes?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/email/issuance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error("Failed to send issuance email");
    }
  },

  async sendDriverHandoverEmail(params: {
    requisitionId: string;
    requesterEmail: string;
    requesterName: string;
    driverName: string;
    dispatchNumber: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/email/driver-handover`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error("Failed to send driver handover email");
    }
  },

  async sendReceiptConfirmationEmail(params: {
    requisitionId: string;
    requesterEmail: string;
    requesterName: string;
    dispatchNumber: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/email/receipt-confirmation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error("Failed to send receipt confirmation email");
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
    const response = await fetch(`${API_BASE_URL}/email/task-assignment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error("Failed to send task assignment email");
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
    const response = await fetch(`${API_BASE_URL}/email/task-completion`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error("Failed to send task completion email");
    }
  },
};
