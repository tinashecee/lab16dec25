import { db } from "../../config/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  getDoc,
  writeBatch,
  runTransaction,
  increment,
} from "firebase/firestore";
import { emailService } from "../../services/emailService";
import { auth } from "../../config/firebase";

// Types
export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  lastUpdated: Timestamp;
  createdAt: Timestamp;
  createdBy: string;
}

export interface Requisition {
  id: string;
  requestDate: Timestamp;
  department: string;
  products: {
    productId: string;
    name: string;
    requestedQuantity: number;
    approvedQuantity?: number;
    unit: string;
    approvalNotes?: string;
  }[];
  status: "Pending" | "Confirmed" | "Approved" | "Issued" | "Delivered" | "Completed" | "Rejected";
  requestedBy: string;
  requesterEmail: string;
  comments?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  approver1?: string;
  approver2?: string;
  dispatchNumber: string;
  approvedBy?: string;
  approvedAt?: Timestamp;
  issuedBy?: string;
  issuedAt?: Timestamp;
  rejectionReason?: string;
  approver1Comments?: string;
  approver2Comments?: string;
  issuanceNotes?: string;
  confirmedBy?: string;
  confirmedAt?: Timestamp;
  rejectedBy?: string;
  rejectedAt?: Timestamp;
  issuedProducts?: {
    productId: string;
    name: string;
    requestedQuantity: number;
    issuedQuantity: number;
    unit: string;
  }[];
  // Driver handover fields
  driverReceivedBy?: string;
  driverReceivedAt?: Timestamp;
  driverSignature?: string;
  driverHandoverNotes?: string;
  // Final receipt confirmation fields  
  finalReceivedBy?: string;
  finalReceivedAt?: Timestamp;
  finalSignature?: string;
  receiptMethod?: "qr_scan" | "system_scan";
  finalReceiptNotes?: string;
}

// Collection References
const productsRef = collection(db, "products");
const requisitionsRef = collection(db, "requisitions");

// Product Functions
export const addProduct = async (
  product: Omit<Product, "id" | "createdAt" | "lastUpdated">
) => {
  const timestamp = Timestamp.now();
  const newProduct = {
    ...product,
    createdAt: timestamp,
    lastUpdated: timestamp,
  };

  return await addDoc(productsRef, newProduct);
};

export const updateProduct = async (id: string, updates: Partial<Product>) => {
  const productRef = doc(db, "products", id);
  const timestamp = Timestamp.now();
  await updateDoc(productRef, {
    ...updates,
    lastUpdated: timestamp,
  });
};

export const deleteProduct = async (id: string) => {
  const productRef = doc(db, "products", id);
  await deleteDoc(productRef);
};

export const getProducts = async () => {
  const q = query(productsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Product[];
};

// Requisition Functions
export const addRequisition = async (
  requisition: Omit<
    Requisition,
    | "id"
    | "createdAt"
    | "updatedAt"
    | "dispatchNumber"
    | "approver1"
    | "approver2"
  >
) => {
  try {
    // Get department head from departments collection
    const departmentsRef = collection(db, "departments");
    const q = query(
      departmentsRef,
      where("name", "==", requisition.department)
    );
    const deptSnapshot = await getDocs(q);
    const departmentHead = deptSnapshot.docs[0]?.data()?.head || "";

    const timestamp = Timestamp.now();
    const dispatchNumber = await generateSequentialDispatchNumber();
    const newRequisition = {
      ...requisition,
      dispatchNumber,
      approver1: departmentHead,
      approver2: "Finance Manager",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const docRef = await addDoc(requisitionsRef, newRequisition);

    // Send email notification to department head
    try {
      const { emailService } = await import("../../services/emailService");
      const approverEmail = await emailService.getApproverEmail(departmentHead);
      
      if (approverEmail) {
        await emailService.sendApprovalEmail({
          requisitionId: docRef.id,
          approverEmail,
          requesterName: requisition.requestedBy,
          department: requisition.department,
        });
        console.log("Approval email sent to department head:", approverEmail);
      } else {
        console.warn("Could not find email for department head:", departmentHead);
      }
    } catch (error) {
      console.error("Failed to send approval email:", error);
      // Don't throw error as this shouldn't block requisition creation
    }

    return docRef;
  } catch (error) {
    console.error("Error in addRequisition:", error);
    throw error;
  }
};

export const updateRequisition = async (
  id: string,
  updates: Partial<Requisition>
) => {
  const requisitionRef = doc(db, "requisitions", id);
  const timestamp = Timestamp.now();
  await updateDoc(requisitionRef, {
    ...updates,
    updatedAt: timestamp,
  });
};

export const deleteRequisition = async (id: string) => {
  const requisitionRef = doc(db, "requisitions", id);
  await deleteDoc(requisitionRef);
};

export const getRequisitions = async (
  status?: Requisition["status"],
  requesterId?: string
) => {
  try {
    let q = query(requisitionsRef, orderBy("createdAt", "desc"));

    if (status) {
      q = query(q, where("status", "==", status));
    }

    if (requesterId) {
      q = query(q, where("requestedBy", "==", requesterId));
    }

    const snapshot = await getDocs(q);
    const requisitions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Requisition[];
    
    console.log("getRequisitions: Fetched", requisitions.length, "requisitions");
    console.log("getRequisitions: Statuses:", requisitions.map(r => ({ id: r.id, status: r.status, dispatchNumber: r.dispatchNumber })));
    
    return requisitions;
  } catch (error) {
    console.error("Error getting requisitions:", error);
    throw error;
  }
};

// Helper function to remove undefined values from objects (for Firebase compatibility)
const removeUndefinedValues = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedValues(item)).filter(item => item !== undefined);
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = removeUndefinedValues(obj[key]);
        if (value !== undefined) {
          cleaned[key] = value;
        }
      }
    }
    return cleaned;
  }
  
  return obj;
};

// Helper function to update product quantity when requisition is issued
export const issueRequisition = async (
  requisitionId: string,
  issueData: {
    issuedProducts: Array<{
      productId: string;
      name: string;
      requestedQuantity: number;
      issuedQuantity: number;
      unit: string;
    }>;
    receivedBy: string;
    signature: string;
    isDriver?: boolean;
  }
) => {
  try {
    const requisitionRef = doc(db, 'requisitions', requisitionId);
    const requisitionDoc = await getDoc(requisitionRef);
    
    if (!requisitionDoc.exists()) {
      throw new Error('Requisition not found');
    }

    const requisition = requisitionDoc.data() as Requisition;

    // Check if requisition can be issued
    if (requisition.status === 'Issued') {
      throw new Error('Requisition has already been issued');
    }

    if (requisition.status !== 'Approved') {
      throw new Error('Requisition must be approved before issuing');
    }

    const batch = writeBatch(db);

    // Validate all products exist before processing any updates
    const productValidations = await Promise.all(
      issueData.issuedProducts.map(async (product) => {
        const productRef = doc(db, 'products', product.productId);
        const productDoc = await getDoc(productRef);
        
        if (!productDoc.exists()) {
          return {
            isValid: false,
            product,
            error: `Product ${product.name} not found in the system`
          };
        }

        const currentQuantity = productDoc.data().quantity;
        // Allow issuing even if stock is insufficient, but mark it
        const isInsufficient = currentQuantity < product.issuedQuantity;
        
        // Only mark as invalid if product doesn't exist
        if (!productDoc.exists()) {
          return {
            isValid: false,
            product,
            error: `Product ${product.name} not found in the system`
          };
        }
        
        return {
          isValid: true,
          product,
          productRef,
          currentQuantity,
          isInsufficient,
          shortage: isInsufficient ? product.issuedQuantity - currentQuantity : 0
        };
      })
    );

    // Check for products that don't exist
    const missingProducts = productValidations
      .filter(validation => !validation.isValid)
      .map(validation => validation.error);

    if (missingProducts.length > 0) {
      throw new Error(`Validation failed:\n${missingProducts.join('\n')}`);
    }

    // Check for insufficient stock (warn but allow)
    const insufficientStockProducts = productValidations
      .filter(validation => validation.isValid && validation.isInsufficient)
      .map(validation => ({
        name: validation.product.name,
        requested: validation.product.issuedQuantity,
        available: validation.currentQuantity,
        shortage: validation.shortage,
        unit: validation.product.unit
      }));

    // Process all updates after validation - allow negative quantities if needed
    productValidations.forEach(validation => {
      if (validation.isValid) {
        // Allow stock to go negative if needed (for backorders/shortages)
        const newQuantity = validation.currentQuantity - validation.product.issuedQuantity;
        batch.update(validation.productRef, {
          quantity: newQuantity,
          lastUpdated: Timestamp.now()
        });
      }
    });

    // Clean issuedProducts array to remove any undefined values
    const cleanedIssuedProducts = issueData.issuedProducts
      .map(product => {
        const cleaned: any = {};
        if (product.productId !== undefined && product.productId !== null) cleaned.productId = product.productId;
        if (product.name !== undefined && product.name !== null) cleaned.name = product.name;
        if (product.requestedQuantity !== undefined && product.requestedQuantity !== null) cleaned.requestedQuantity = product.requestedQuantity;
        if (product.issuedQuantity !== undefined && product.issuedQuantity !== null) cleaned.issuedQuantity = product.issuedQuantity;
        if (product.unit !== undefined && product.unit !== null) cleaned.unit = product.unit;
        return cleaned;
      })
      .filter(product => 
        product.productId && 
        product.name && 
        product.requestedQuantity !== undefined && 
        product.issuedQuantity !== undefined &&
        product.unit
      );

    // Prepare issuance notes (including stock shortage info if any)
    let issuanceNotes = issueData.notes || '';
    if (insufficientStockProducts.length > 0) {
      const shortageNotes = insufficientStockProducts.map(p => 
        `${p.name}: Requested ${p.requested} ${p.unit}, Available ${p.available} ${p.unit} (Shortage: ${p.shortage} ${p.unit})`
      ).join('\n');
      
      // Add to issuance notes
      issuanceNotes = issuanceNotes 
        ? `${issuanceNotes}\n\nStock Shortage:\n${shortageNotes}`
        : `Stock Shortage:\n${shortageNotes}`;
    }

    // Update requisition status - build update object with only defined values
    // If isDriver is true (driver receives), mark as Issued (driver handover flow applies)
    // If isDriver is false (requester receives directly), mark as Delivered
    const isDriverReceiver = issueData.isDriver === true; // Default to false (requester) if not specified
    const updateData: any = {
      status: isDriverReceiver ? 'Issued' : 'Delivered',
      issuedProducts: cleanedIssuedProducts,
      issuedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    // Add issuance notes if present
    if (issuanceNotes) {
      updateData.issuanceNotes = issuanceNotes;
    }

    // Only add fields if they have values
    const issuedBy = auth.currentUser?.displayName || auth.currentUser?.email;
    if (issuedBy) {
      updateData.issuedBy = issuedBy;
    }

    if (issueData.receivedBy) {
      updateData.receivedBy = issueData.receivedBy;
    }

    if (issueData.signature) {
      updateData.signature = issueData.signature;
    }

    // If requester receives directly (isDriver = false), set final receipt fields
    if (!isDriverReceiver) {
      updateData.finalReceivedBy = issueData.receivedBy;
      updateData.finalReceivedAt = Timestamp.now();
      updateData.finalSignature = issueData.signature;
      updateData.receiptMethod = 'system_scan';
    }

    // Remove any undefined values from the update object (recursive cleanup)
    const cleanedUpdateData = removeUndefinedValues(updateData);

    batch.update(requisitionRef, cleanedUpdateData);

    await batch.commit();
  } catch (error) {
    console.error('Error issuing requisition:', error);
    throw error;
  }
};

/**
 * Sequential Numbering System for Requisitions
 * 
 * This system provides ordered, sequential numbering for all requisitions to ensure
 * proper tracking and audit trails. The numbering format is: REQ-YYYY-NNNNNN
 * 
 * Features:
 * - Atomic transactions prevent race conditions
 * - Year-based numbering (resets annually)
 * - 6-digit padded sequence numbers (000001, 000002, etc.)
 * - Fallback to timestamp-based numbering if counter fails
 * - Admin functions for counter management
 * 
 * Examples:
 * - REQ-2024-000001 (first requisition of 2024)
 * - REQ-2024-000002 (second requisition of 2024)
 * - REQ-2025-000001 (first requisition of 2025)
 * 
 * Counter Storage:
 * - Firestore collection: "counters"
 * - Document ID: "requisitionCounter"
 * - Field: { count: number }
 */
const generateSequentialDispatchNumber = async (): Promise<string> => {
  try {
    // Check and reset counter if needed for new year
    await checkAndResetYearlyCounter();
    
    const counterRef = doc(db, "counters", "requisitionCounter");
    
    // Use a transaction to ensure atomic increment
    const result = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      
      let currentCount = 1;
      if (counterDoc.exists()) {
        currentCount = counterDoc.data().count + 1;
      }
      
      // Update the counter
      transaction.set(counterRef, { count: currentCount }, { merge: true });
      
      return currentCount;
    });
    
    // Format: REQ-YYYY-NNNNNN (e.g., REQ-2024-000001)
    const year = new Date().getFullYear();
    const paddedNumber = result.toString().padStart(6, '0');
    return `REQ-${year}-${paddedNumber}`;
  } catch (error) {
    console.error("Error generating sequential dispatch number:", error);
    // Fallback to timestamp-based number if counter fails
    return `REQ-${Date.now()}`;
  }
};

// Get current requisition counter value
export const getRequisitionCounter = async (): Promise<number> => {
  try {
    const counterRef = doc(db, "counters", "requisitionCounter");
    const counterDoc = await getDoc(counterRef);
    
    if (counterDoc.exists()) {
      return counterDoc.data().count || 0;
    }
    return 0;
  } catch (error) {
    console.error("Error getting requisition counter:", error);
    return 0;
  }
};

// Reset requisition counter (admin function)
export const resetRequisitionCounter = async (newValue: number = 0): Promise<void> => {
  try {
    const counterRef = doc(db, "counters", "requisitionCounter");
    await updateDoc(counterRef, { count: newValue });
    console.log(`Requisition counter reset to ${newValue}`);
  } catch (error) {
    console.error("Error resetting requisition counter:", error);
    throw error;
  }
};

// Check if counter needs yearly reset and handle it
const checkAndResetYearlyCounter = async (): Promise<void> => {
  try {
    const counterRef = doc(db, "counters", "requisitionCounter");
    const counterDoc = await getDoc(counterRef);
    
    if (counterDoc.exists()) {
      const data = counterDoc.data();
      const lastResetYear = data.lastResetYear || new Date().getFullYear();
      const currentYear = new Date().getFullYear();
      
      // Reset counter if we're in a new year
      if (currentYear > lastResetYear) {
        await updateDoc(counterRef, { 
          count: 0, 
          lastResetYear: currentYear 
        });
        console.log(`Requisition counter reset for new year ${currentYear}`);
      }
    } else {
      // Initialize counter for first time
      const currentYear = new Date().getFullYear();
      await updateDoc(counterRef, { 
        count: 0, 
        lastResetYear: currentYear 
      });
    }
  } catch (error) {
    console.error("Error checking yearly counter reset:", error);
    // Don't throw error as this is a background operation
  }
};

// Add approval functions
export const approvalFunctions = {
  async confirmRequest(
    requisitionId: string,
    approverName: string,
    approvedProducts: Array<{
      productId: string;
      approvedQuantity: number;
      approvalNotes?: string;
    }>,
    comments?: string
  ) {
    try {
      // Validate requisitionId
      if (!requisitionId || requisitionId.trim() === "") {
        throw new Error("Requisition ID is required");
      }

      const requisitionRef = doc(requisitionsRef, requisitionId);
      const requisition = (await getDoc(requisitionRef)).data() as Requisition;

      if (!requisition) {
        throw new Error("Requisition not found");
      }

      // Update products with approved quantities
      const updatedProducts = requisition.products.map(product => {
        const approvedProduct = approvedProducts.find(p => p.productId === product.productId);
        return {
          ...product,
          approvedQuantity: approvedProduct?.approvedQuantity || product.requestedQuantity || 0,
          approvalNotes: approvedProduct?.approvalNotes || ""
        };
      });

      const timestamp = Timestamp.now();
      await updateDoc(requisitionRef, {
        status: "Confirmed",
        products: updatedProducts,
        approver1Comments: comments || "",
        confirmedAt: timestamp,
        confirmedBy: approverName || "Unknown",
        updatedAt: timestamp,
      });

      // Send email notification to Finance Manager
      try {
        const { emailService } = await import("../../services/emailService");
        const financeManagerEmails = await emailService.getApproverEmail("Finance Manager");
        
        if (financeManagerEmails) {
          await emailService.sendApprovalEmail({
            requisitionId,
            approverEmail: financeManagerEmails,
            requesterName: requisition.requestedBy,
            department: requisition.department,
          });
          console.log("Approval email sent to Finance Manager:", financeManagerEmails);
        } else {
          console.warn("Could not find email for Finance Manager");
        }
      } catch (error) {
        console.error("Failed to send approval email to Finance Manager:", error);
        // Don't throw error as this shouldn't block confirmation
      }
    } catch (error) {
      console.error("Error confirming request:", error);
      throw new Error("Failed to confirm request. Please try again.");
    }
  },

  async rejectRequest(
    requisitionId: string,
    rejectorName: string,
    reason: string,
    stage: "Department Head" | "Finance Manager"
  ) {
    try {
      // Validate requisitionId
      if (!requisitionId || requisitionId.trim() === "") {
        throw new Error("Requisition ID is required");
      }

      const requisitionRef = doc(requisitionsRef, requisitionId);
      const requisition = (await getDoc(requisitionRef)).data() as Requisition;

      if (!requisition) {
        throw new Error("Requisition not found");
      }

      const timestamp = Timestamp.now();
      await updateDoc(requisitionRef, {
        status: "Rejected",
        rejectionReason: reason || "",
        rejectedAt: timestamp,
        rejectedBy: rejectorName || "Unknown",
        rejectedStage: stage || "Unknown",
        updatedAt: timestamp,
      });

      // Send email notification to requester
      try {
        const { emailService } = await import("../../services/emailService");
        await emailService.sendRejectionEmail({
          requisitionId,
          requesterEmail: requisition.requesterEmail,
          rejectorName,
          reason,
          stage,
        });
        console.log("Rejection email sent to requester:", requisition.requesterEmail);
      } catch (error) {
        console.error("Failed to send rejection email:", error);
        // Don't throw error as this shouldn't block rejection
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
      throw new Error("Failed to reject request. Please try again.");
    }
  },

  async approveRequest(
    requisitionId: string,
    approverName: string,
    comments?: string
  ) {
    try {
      // Validate requisitionId
      if (!requisitionId || requisitionId.trim() === "") {
        throw new Error("Requisition ID is required");
      }

      console.log("Starting approval process for:", requisitionId);
      const requisitionRef = doc(requisitionsRef, requisitionId);
      const requisition = (await getDoc(requisitionRef)).data() as Requisition;

      if (!requisition) {
        throw new Error("Requisition not found");
      }

      console.log("Current requisition status:", requisition.status);
      console.log("Updating to Approved status...");

      const timestamp = Timestamp.now();
      await updateDoc(requisitionRef, {
        status: "Approved",
        approver2Comments: comments || "",
        approvedAt: timestamp,
        approvedBy: approverName || "Unknown",
        updatedAt: timestamp,
      });

      console.log("Successfully updated requisition to Approved status");

      // Verify the update was successful
      const updatedRequisition = (await getDoc(requisitionRef)).data() as Requisition;
      console.log("Verification - Updated requisition status:", updatedRequisition.status);

      // Send email notification to Accounts Clerk
      try {
        const { emailService } = await import("../../services/emailService");
        const accountsClerkEmails = await emailService.getApproverEmail("Accounts Clerk");
        
        if (accountsClerkEmails) {
          await emailService.sendApprovalEmail({
            requisitionId,
            approverEmail: accountsClerkEmails,
            requesterName: requisition.requestedBy,
            department: requisition.department,
          });
          console.log("Approval email sent to Accounts Clerk:", accountsClerkEmails);
        } else {
          console.warn("Could not find email for Accounts Clerk");
        }
      } catch (error) {
        console.error("Failed to send approval email to Accounts Clerk:", error);
        // Don't throw error as this shouldn't block approval
      }
    } catch (error) {
      console.error("Error approving request:", error);
      throw new Error("Failed to approve request. Please try again.");
    }
  },

  async issueRequest(
    requisitionId: string,
    issuerName: string,
    issuedProducts: Requisition["issuedProducts"],
    notes?: string
  ) {
    try {
      // Validate requisitionId
      if (!requisitionId || requisitionId.trim() === "") {
        throw new Error("Requisition ID is required");
      }

      const requisitionRef = doc(requisitionsRef, requisitionId);
      const requisition = (await getDoc(requisitionRef)).data() as Requisition;

      if (!requisition) {
        throw new Error("Requisition not found");
      }

      const timestamp = Timestamp.now();
      const updateData: any = {
        status: "Issued",
        issuedProducts: issuedProducts || [],
        issuedAt: timestamp,
        issuedBy: issuerName || "Unknown",
        updatedAt: timestamp,
      };
      
      // Only add notes if provided
      if (notes && notes.trim()) {
        updateData.issuanceNotes = notes.trim();
      }
      
      await updateDoc(requisitionRef, updateData);

      // Send email notification to requester
      try {
        const { emailService } = await import("../../services/emailService");
        await emailService.sendIssuanceEmail({
          requisitionId,
          requesterEmail: requisition.requesterEmail,
          requesterName: requisition.requestedBy,
          issuedProducts,
        });
        console.log("Issuance email sent to requester:", requisition.requesterEmail);
      } catch (error) {
        console.error("Failed to send issuance email:", error);
        // Don't throw error as this shouldn't block issuance
      }
    } catch (error) {
      console.error("Error issuing request:", error);
      throw new Error("Failed to issue request. Please try again.");
    }
  },

  async confirmDriverHandover(
    requisitionId: string,
    driverName: string,
    signature: string,
    notes?: string
  ) {
    try {
      // Validate requisitionId
      if (!requisitionId || requisitionId.trim() === "") {
        throw new Error("Requisition ID is required");
      }

      const requisitionRef = doc(requisitionsRef, requisitionId);
      const requisition = (await getDoc(requisitionRef)).data() as Requisition;

      if (!requisition) {
        throw new Error("Requisition not found");
      }

      if (requisition.status !== "Issued") {
        throw new Error("Requisition must be issued before driver handover");
      }

      const timestamp = Timestamp.now();
      await updateDoc(requisitionRef, {
        status: "Delivered",
        driverReceivedBy: driverName,
        driverReceivedAt: timestamp,
        driverSignature: signature,
        driverHandoverNotes: notes || "",
        updatedAt: timestamp,
      });

      // Send email notification to requester
      try {
        const { emailService } = await import("../../services/emailService");
        await emailService.sendDriverHandoverEmail({
          requisitionId,
          requesterEmail: requisition.requesterEmail,
          requesterName: requisition.requestedBy,
          driverName,
          dispatchNumber: requisition.dispatchNumber,
        });
        console.log("Driver handover email sent to requester:", requisition.requesterEmail);
      } catch (error) {
        console.error("Failed to send driver handover email:", error);
        // Don't throw error as this shouldn't block handover
      }
    } catch (error) {
      console.error("Error confirming driver handover:", error);
      throw new Error("Failed to confirm driver handover. Please try again.");
    }
  },

  async confirmInventoryHandover(
    requisitionId: string,
    recipientName: string,
    signature: string,
    notes?: string
  ) {
    try {
      // Validate requisitionId
      if (!requisitionId || requisitionId.trim() === "") {
        throw new Error("Requisition ID is required");
      }

      const requisitionRef = doc(requisitionsRef, requisitionId);
      const requisition = (await getDoc(requisitionRef)).data() as Requisition;

      if (!requisition) {
        throw new Error("Requisition not found");
      }

      if (requisition.status !== "Issued") {
        throw new Error("Requisition must be issued before inventory handover");
      }

      const timestamp = Timestamp.now();
      await updateDoc(requisitionRef, {
        status: "Delivered",
        driverReceivedBy: recipientName,
        driverReceivedAt: timestamp,
        driverSignature: signature,
        driverHandoverNotes: notes || "",
        updatedAt: timestamp,
      });

      // Send email notification to requester
      try {
        const { emailService } = await import("../../services/emailService");
        await emailService.sendDriverHandoverEmail({
          requisitionId,
          requesterEmail: requisition.requesterEmail,
          requesterName: requisition.requestedBy,
          driverName: recipientName,
          dispatchNumber: requisition.dispatchNumber,
        });
        console.log("Inventory handover email sent to requester:", requisition.requesterEmail);
      } catch (error) {
        console.error("Failed to send inventory handover email:", error);
        // Don't throw error as this shouldn't block handover
      }
    } catch (error) {
      console.error("Error confirming inventory handover:", error);
      throw new Error("Failed to confirm inventory handover. Please try again.");
    }
  },

  async confirmFinalReceipt(
    requisitionId: string,
    receiverName: string,
    signature: string,
    receiptMethod: "qr_scan" | "system_scan",
    notes?: string
  ) {
    try {
      // Validate requisitionId
      if (!requisitionId || requisitionId.trim() === "") {
        throw new Error("Requisition ID is required");
      }

      const requisitionRef = doc(requisitionsRef, requisitionId);
      const requisition = (await getDoc(requisitionRef)).data() as Requisition;

      if (!requisition) {
        throw new Error("Requisition not found");
      }

      if (requisition.status !== "Delivered") {
        throw new Error("Requisition must be delivered before final receipt confirmation");
      }

      const timestamp = Timestamp.now();
      await updateDoc(requisitionRef, {
        status: "Completed",
        finalReceivedBy: receiverName,
        finalReceivedAt: timestamp,
        finalSignature: signature,
        receiptMethod: receiptMethod,
        finalReceiptNotes: notes || "",
        updatedAt: timestamp,
      });

      // Send completion notification
      try {
        const { emailService } = await import("../../services/emailService");
        await emailService.sendReceiptConfirmationEmail({
          requisitionId,
          requesterEmail: requisition.requesterEmail,
          requesterName: requisition.requestedBy,
          dispatchNumber: requisition.dispatchNumber,
        });
        console.log("Receipt confirmation email sent to requester:", requisition.requesterEmail);
      } catch (error) {
        console.error("Failed to send receipt confirmation email:", error);
        // Don't throw error as this shouldn't block completion
      }
    } catch (error) {
      console.error("Error confirming final receipt:", error);
      throw new Error("Failed to confirm final receipt. Please try again.");
    }
  },
};

interface IssueRecord {
  productId: string;
  quantity: number;
  department: string;
  issuedTo: string;
  signature: string;
  timestamp: Date;
}

export const saveIssueRecord = async (record: IssueRecord) => {
  try {
    await addDoc(collection(db, 'issueRecords'), record);
  } catch (error) {
    console.error('Error saving issue record:', error);
    throw new Error('Failed to save issue record');
  }
};

export const updateProductQuantity = async (productId: string, newQuantity: number) => {
  try {
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, {
      quantity: newQuantity,
      lastUpdated: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating product quantity:', error);
    throw new Error('Failed to update product quantity');
  }
};

export const getProduct = async (productId: string): Promise<Product | null> => {
  try {
    const productRef = doc(db, 'products', productId);
    const productDoc = await getDoc(productRef);
    
    if (!productDoc.exists()) {
      return null;
    }

    return {
      id: productDoc.id,
      ...productDoc.data()
    } as Product;
  } catch (error) {
    console.error('Error getting product:', error);
    throw new Error('Failed to get product');
  }
};

export const getRequisition = async (requisitionId: string): Promise<Requisition | null> => {
  try {
    const requisitionRef = doc(db, 'requisitions', requisitionId);
    const requisitionDoc = await getDoc(requisitionRef);
    
    if (!requisitionDoc.exists()) {
      return null;
    }

    return {
      id: requisitionDoc.id,
      ...requisitionDoc.data()
    } as Requisition;
  } catch (error) {
    console.error('Error getting requisition:', error);
    throw new Error('Failed to get requisition');
  }
};
