declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: { head: string[][]; body: string[][] }) => void;
  }
}

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import BarcodeScannerModal from "./BarcodeScannerModal";
import {
  sampleCollectionService,
  type SampleCollection,
} from "@/services/sampleCollectionService";
import {
  Timestamp,
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  where,
  serverTimestamp,
  getDoc,
  getDocs,
  collection as fbCollection,
  query as fbQuery,
  where as fbWhere,
  getDocs as fbGetDocs,
} from "firebase/firestore";
import SampleDetailsModal from "./SampleDetailsModal";
import { db } from "@/config/firebase";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  FiSearch,
  FiDownload,
  FiChevronLeft,
  FiChevronRight,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { FaBarcode } from "react-icons/fa";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";
import { useLocation } from "react-router-dom";
import { useSampleCollectionsInfinite } from "../../../hooks/queries/samples/useSampleCollectionsInfinite";
import type { SampleCollection as SampleCollectionType } from "../../../services/sampleCollectionService";

// Add type for status
type StatusType =
  | "pending"
  | "accepted collection"
  | "collected"
  | "registered"
  | "received"
  | "completed" // This stays as is for the UI
  | "delivered"
  | "cancelled"
  | "Consolidated All Report Submit" // Add actual statuses
  | "Consolidated All Report Submit Accepted";

// Add type for headers
type HeaderType = {
  label: string;
  field: string;
  render?: (row: Record<string, unknown>) => string;
};

type Headers = {
  [K in StatusType]: HeaderType[];
};

const statuses = [
  "pending",
  "accepted collection",
  "collected",
  "registered",
  "received",
  "completed",
  "delivered",
  "cancelled",
];

// Updated headers to include checkbox column for cancellable statuses
const headers: Headers = {
  pending: [
    { label: "Select", field: "select" },
    { label: "Requested At", field: "requested_at" },
    { label: "Time Lapsed", field: "time_lapsed" },
    { label: "Center Name", field: "center_name" },
    { label: "Driver Dispatched", field: "assigned_driver.name" },
    { label: "Priority", field: "priority" }
  ],
  collected: [
    { label: "Select", field: "select" },
    { label: "Time Requested", field: "requested_at" },
    { label: "Time Lapsed", field: "time_lapsed" },
    { label: "Collected At", field: "collected_at" },
    { label: "Patient Name", field: "patient_name" },
    { label: "Center", field: "center_name" },
    { label: "Priority", field: "priority" },
    { label: "Scan", field: "scan" }
  ],
  registered: [
    { label: "Select", field: "select" },
    { label: "Accession #", field: "accession_number" },
    { label: "Patient Name", field: "patient_name" },
    { label: "Center", field: "center_name" },
    { label: "Time Requested", field: "requested_at" },
    { label: "Time Lapsed", field: "time_lapsed" },
    { label: "Priority", field: "priority" },
    { label: "Registered By", field: "registered_by" }
  ],
  received: [
    { label: "Select", field: "select" },
    { label: "Accession #", field: "accession_number" },
    { label: "Patient Name", field: "patient_name" },
    { label: "Referral Name", field: "billReferral" },
    { label: "Sample Date", field: "sampleDate" },
    { label: "Time Lapsed", field: "time_lapsed" }
  ],
  completed: [
    { label: "Select", field: "select" },
    { label: "Accession #", field: "accession_number" },
    { label: "Patient Name", field: "patientName" },
    { label: "Referral Name", field: "ReferralName" },
    {
      label: "Bill Date",
      field: "billDate",
      render: (row: Record<string, unknown>) => {
        if (!row.billDate) return "N/A";
        const date = new Date(row.billDate as string);
        return format(date, "MMM d, yyyy 'at' h:mm:ss a");
      },
    },
    {
      label: "Completed Date",
      field: "date_created",
      render: (row: Record<string, unknown>) => {
        if (!row.date_created) return "N/A";
        const date = new Date(row.date_created as string);
        return format(date, "MMM d, yyyy 'at' h:mm:ss a");
      },
    },
    {
      label: "Time Lapsed",
      field: "time_lapsed",
      render: (row: Record<string, unknown>) => {
        if (!row.billDate || !row.date_created) return "N/A";
        const startDate = new Date(row.billDate as string);
        const endDate = new Date(row.date_created as string);
        const diffInSeconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);
        const hours = Math.floor(diffInSeconds / 3600);
        const minutes = Math.floor((diffInSeconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
      },
    },
    { 
      label: "Actions", 
      field: "actions" 
    },
  ],
  delivered: [
    { label: "Accession #", field: "accession_number" },
    { label: "Patient Name", field: "patientName" },
    { label: "Center", field: "center_name" },
    { label: "Driver", field: "delivered_by" },
    {
      label: "Time Requested",
      field: "requested_at",
      render: (row: Record<string, unknown>) => formatTimestamp(row.requested_at),
    },
    {
      label: "Time Delivered",
      field: "delivered_at",
      render: (row: Record<string, unknown>) => formatTimestamp(row.delivered_at),
    },
    {
      label: "Total Time Lapsed",
      field: "total_time_lapsed",
      render: (row: Record<string, unknown>) => {
        if (!row.requested_at || !row.delivered_at) return "N/A";
        const startDate =
          typeof row.requested_at === "string"
            ? new Date(row.requested_at as string)
            : new Date((row.requested_at as { seconds: number }).seconds * 1000);
        const endDate =
          typeof row.delivered_at === "string"
            ? new Date(row.delivered_at as string)
            : new Date((row.delivered_at as { seconds: number }).seconds * 1000);
        const diffInSeconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);
        const hours = Math.floor(diffInSeconds / 3600);
        const minutes = Math.floor((diffInSeconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
      },
    },
    { label: "Received by", field: "received_by" }
  ],
  cancelled: [
    { label: "Accession #", field: "accession_number" },
    { label: "Patient Name", field: "caller_name" },
    { label: "Center", field: "center_name" },
    { label: "Reason for Cancellation", field: "reason_for_cancellation" },
    { label: "Time Lapsed", field: "time_lapsed" }
  ],
  "accepted collection": [
    { label: "Requested At", field: "requested_at" },
    { label: "Time Lapsed", field: "time_lapsed" },
    { label: "Center Name", field: "center_name" },
    { label: "Driver Dispatched", field: "assigned_driver.name" },
    { label: "Priority", field: "priority" }
  ],
  "Consolidated All Report Submit": [
    { label: "Accession #", field: "accession_number" },
    { label: "Patient Name", field: "patientName" },
    { label: "Center", field: "center_name" },
    { label: "Time Lapsed", field: "time_lapsed" }
  ],
  "Consolidated All Report Submit Accepted": [
    { label: "Accession #", field: "accession_number" },
    { label: "Patient Name", field: "patientName" },
    { label: "Center", field: "center_name" },
    { label: "Time Lapsed", field: "time_lapsed" }
  ]
};

// Add proper type for date strings and timestamps
type DateType = string | Timestamp | { seconds: number; nanoseconds: number };

// Import formatDateCAT for standardized date formatting
import { formatDateCAT } from "../../../utils/timeUtils";

const formatDate = (dateString: DateType): string => {
  return formatDateCAT(dateString);
};

const formatTimeField = (timestamp: unknown): string => {
  return formatDateCAT(timestamp);
};

const calculateTimeLapsed = (requestedAt: string) => {
  const start = new Date(requestedAt).getTime();
  const now = new Date().getTime();

  const diffInSeconds = Math.floor((now - start) / 1000);
  const days = Math.floor(diffInSeconds / (3600 * 24));
  const hours = Math.floor((diffInSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((diffInSeconds % 3600) / 60);
  const seconds = diffInSeconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(" ");
};

const formatTimestamp = (timestamp: unknown): string => {
  return formatDateCAT(timestamp);
};

export default function SamplesTable() {
  const { userData } = useAuth();
  const location = useLocation();
  const [collections, setCollections] = useState<SampleCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<SampleCollection["status"] | "all">(
    "pending"
  );
  const [selectedSample, setSelectedSample] = useState<SampleCollection | null>(null);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);
  const [overdueSampleIds, setOverdueSampleIds] = useState<Set<string>>(new Set());
  const [isBulkDelivering, setIsBulkDelivering] = useState(false);

  // Bulk selection state
  const [selectedSamples, setSelectedSamples] = useState<Set<string>>(new Set());
  const [showBulkCancelModal, setShowBulkCancelModal] = useState(false);
  const [bulkCancelReason, setBulkCancelReason] = useState("");
  const [isBulkCancelling, setIsBulkCancelling] = useState(false);
  const [bulkCancelError, setBulkCancelError] = useState<string | null>(null);

  // Use cached paginated query for heavy non-realtime statuses
  const isPaginatedStatus = status === "completed" || status === "received";
  const {
    data: pagedCollections,
    isLoading: pagedLoading,
    isError: pagedError,
    error: pagedErrorDetails,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSampleCollectionsInfinite(status as SampleCollectionType["status"], { enabled: isPaginatedStatus });

  useEffect(() => {
    if (!isPaginatedStatus) return;
    const flat = (pagedCollections?.pages ?? []).flatMap((p) => p.collections) as SampleCollection[];
    setCollections(flat);
    setLoading(pagedLoading);
    if (pagedError) {
      console.error("Error loading paginated collections:", pagedErrorDetails);
      setError("Failed to load collections");
    }
  }, [isPaginatedStatus, pagedCollections, pagedLoading, pagedError, pagedErrorDetails]);

  // Fetch overdue sample IDs on mount
  useEffect(() => {
    async function fetchOverdueSampleIds() {
      try {
        const tatQ = fbQuery(fbCollection(db, 'testTATTracking'), fbWhere('status', '==', 'overdue'));
        const tatSnap = await fbGetDocs(tatQ);
        const ids = new Set<string>();
        tatSnap.forEach(docSnap => {
          const tat = docSnap.data();
          if (tat.sampleId) ids.add(tat.sampleId);
        });
        setOverdueSampleIds(ids);
      } catch {
        setOverdueSampleIds(new Set());
      }
    }
    fetchOverdueSampleIds();
  }, []);

  const setupReceivedSamplesListener = () => {
    const q = query(
      collection(db, "received_samples"),
      orderBy("date_created", "desc")
    );

    const unsubscribeListener = onSnapshot(
      q,
      (snapshot) => {
        const receivedSamples = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          sampleID: doc.data().sampleId,
          patientName: doc.data().labPatientId,
          billReferral: doc.data().billId,
          sampleDate: doc.data().accessionDate,
          reportDate: doc.data().date_created,
          time_lapsed: calculateTimeLapsed(doc.data().date_created),
        }));

        setCollections(receivedSamples);
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to received samples:", error);
        setError("Failed to load received samples");
        setLoading(false);
      }
    );

    setUnsubscribe(() => unsubscribeListener);
  };

  const fetchCollections = async () => {
    try {
      setLoading(true);
      setError(null);

      if (unsubscribe) {
        unsubscribe();
        setUnsubscribe(null);
      }

      let result: SampleCollection[] = [];

      if (status === "collected" || status === "registered") {
        const q = query(
          collection(db, "collectionRequests"),
          where("status", "==", status),
          orderBy("created_at", "desc")
        );

        const unsubscribeListener = onSnapshot(q, (snapshot) => {
          const samples = snapshot.docs.map((doc) => {
            const data = doc.data();
            
            // For collected samples, ensure all required timestamps exist
            if (status === "collected") {
              // First ensure collected_at exists (using previous logic)
              const collectedAt = data.collected_at || 
                (data.updated_at ? new Date(data.updated_at.toDate()).toISOString() : 
                 new Date(data.created_at.toDate()).toISOString());
              
              // For samples collected directly by drivers
              const result = {
                id: doc.id,
                ...data,
                collected_at: collectedAt,
                // Ensure preceding timestamps exist, using collected_at as fallback
                requested_at: data.requested_at || collectedAt,
                driver_assigned_at: data.driver_assigned_at || collectedAt,
                accepted_collection_at: data.accepted_collection_at || collectedAt
              };
              
              // If there's a collector driver but no assigned driver, populate assigned_driver with collector info
              if (data.collector_driver && !data.assigned_driver) {
                result.assigned_driver = data.collector_driver;
              } 
              // If there's no collector_driver field but we have driver info somewhere else, use that
              else if (!data.assigned_driver && data.collected_by) {
                result.assigned_driver = {
                  id: data.collected_by.id || "direct-collection",
                  name: data.collected_by.name || data.collected_by,
                  messageToken: data.collected_by.messageToken
                };
              }
              
              return result;
            }
            
            return {
              id: doc.id,
              ...data,
            };
          }) as SampleCollection[];

          setCollections(samples);
          setLoading(false);
        });

        setUnsubscribe(() => unsubscribeListener);
        return;
      } else if (status === "received") {
        const q = query(
          collection(db, "collectionRequests"),
          where("status", "==", "received"),
          orderBy("created_at", "desc")
        );

        const snapshot = await getDocs(q);
        result = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          sampleID: doc.data().sampleId,
          patientName: doc.data().labPatientId,
          billReferral: doc.data().billId,
          sampleDate: formatDate(doc.data().received_at),
          time_lapsed: calculateTimeLapsed(doc.data().date_created),
        }));

        setCollections(result);
        setLoading(false);
        return;
      } else if (status === "completed") {
        const q = query(
          collection(db, "collectionRequests"),
          where("completed_at", "!=", null),
          orderBy("completed_at", "desc")
        );

        const snapshot = await getDocs(q);
        // Filter out samples that are already delivered or cancelled
        result = snapshot.docs
          .filter(doc => {
            const docData = doc.data();
            return docData.status !== "delivered" && docData.status !== "cancelled";
          })
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
            status: "completed", // Ensure status is set to completed for display purposes
            patientName: doc.data().patientName || doc.data().labPatientId || "Not provided",
          })) as SampleCollection[];
      } else {
        const response =
          await sampleCollectionService.getSampleCollectionsPaginated(status);
        result = response.collections;
      }

      setCollections(result);
    } catch (err) {
      console.error("Error fetching collections:", err);
      setError("Failed to load collections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isPaginatedStatus) return;
    fetchCollections();
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [status]);

  const handleModalClose = () => {
    setSelectedSample(null);
  };

  const handleRegisterSample = async (scannedBarcode: string) => {
    try {
      if (!selectedSample) {
        throw new Error("No sample selected for registration");
      }

      console.log(
        "Starting registration for sample:",
        selectedSample.id,
        "with barcode:",
        scannedBarcode
      );

      // First check if the document exists
      const sampleRef = doc(db, "collectionRequests", selectedSample.id);
      const sampleDoc = await getDoc(sampleRef);

      if (!sampleDoc.exists()) {
        throw new Error("Sample document not found");
      }

      const updateData = {
        status: "registered",
        sampleID: [scannedBarcode], // Make sure sampleID is an array
        accession_number: scannedBarcode,
        time_registered: serverTimestamp(),
        registered_by: userData?.name || "System",
        status_updated_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };

      console.log("Updating document with data:", updateData);

      await updateDoc(sampleRef, updateData);

      console.log(
        `Sample ${selectedSample.id} registered successfully with sampleID ${scannedBarcode}`
      );

      handleModalClose();

      await fetchCollections();
    } catch (error) {
      console.error("Error registering sample:", error);
      let errorMessage = "Failed to register sample";

      if (error instanceof Error) {
        if (error.message === "Sample document not found") {
          errorMessage = "Sample not found. Please refresh and try again.";
        } else {
          errorMessage = error.message;
        }
      }

      setError(errorMessage);
    }
  };

  // Filter and pagination logic
  const filterCollections = () => {
    let filtered = [...collections];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((item) =>
        Object.values(item).some((val) =>
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Date range filter
    if (startDate && endDate) {
      filtered = filtered.filter((item) => {
        const itemDate = new Date(item.requested_at);
        return itemDate >= startDate && itemDate <= endDate;
      });
    }

    return filtered;
  };

  const filteredCollections = filterCollections();
  const totalPages = itemsPerPage === -1 ? 1 : Math.ceil(filteredCollections.length / itemsPerPage);
  const paginatedCollections = itemsPerPage === -1
    ? filteredCollections
    : filteredCollections.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      );

  // Export functions
  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Samples");
    
    if (filteredCollections.length > 0) {
      const headers = Object.keys(filteredCollections[0]);
      worksheet.addRow(headers);
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      
      filteredCollections.forEach(item => {
        worksheet.addRow(Object.values(item));
      });
      
      worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell?.({ includeEmpty: true }, cell => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = maxLength < 10 ? 10 : maxLength + 2;
      });
    }
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `samples_${status}_${new Date().toISOString()}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    // Use landscape orientation
    const doc = new jsPDF({ orientation: 'landscape' });
    const primaryColor = [250, 74, 64]; // #FA4A40
    const secondaryColor = [100, 116, 139]; // #64748b
    const logoUrl = '/images/logo.png';
    // Add logo (if available)
    try {
      doc.addImage(logoUrl, 'PNG', 14, 10, 30, 15);
    } catch (e) {
      // Logo is optional
    }
    // Add title
    doc.setFontSize(18);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`Sample Collections - ${status.charAt(0).toUpperCase() + status.slice(1)}`, 50, 20);
    // Add date
    doc.setFontSize(10);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(`Generated on: ${formatDateCAT(new Date())}`, 14, 30);
    // Prepare headers and data
    const tabHeaders = headers[status as StatusType].map((h) => h.label);
    const tabFields = headers[status as StatusType];
    const data = filteredCollections.map((item) =>
      tabFields.map((h) => {
        if (h.render) {
          return h.render(item);
        }
        // Special handling for collected_at and time_lapsed to match table display
        if (h.field === 'collected_at') {
          return formatDate(item['collected_at']);
        }
        if (h.field === 'time_lapsed') {
          // Use the same logic as the table: calculateTimeLapsed(item['requested_at'])
          return calculateTimeLapsed(item['requested_at']);
        }
        if (h.field.includes('.')) {
          const [parent, child] = h.field.split('.');
          return item[parent] ? item[parent][child] : 'N/A';
        }
        return (item[h.field] !== undefined && item[h.field] !== null ? String(item[h.field]) : 'N/A');
      })
    );
    // Table
    doc.autoTable({
      startY: 35,
      head: [tabHeaders],
      body: data,
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: [248, 248, 248],
      },
      tableWidth: 'auto',
      margin: { left: 14, right: 14 },
    });
    doc.save(`samples_${status}_${new Date().toISOString()}.pdf`);
  };

  const handleMarkAsDelivered = async (sampleId: string, e: React.MouseEvent) => {
    try {
      e.stopPropagation(); // Prevent row click event
      setLoading(true);
      
      // First check if the document exists
      const sampleRef = doc(db, "collectionRequests", sampleId);
      const sampleDoc = await getDoc(sampleRef);

      if (!sampleDoc.exists()) {
        throw new Error("Sample document not found");
      }

      const now = new Date();
      const updateData = {
        status: "delivered",
        delivered_at: now.toISOString(),
        received_by: "Patient/Client", // Self-collection by patient
        delivery_location: "Front Desk",
        updated_at: serverTimestamp(),
      };

      console.log("Marking sample as delivered:", sampleId);
      await updateDoc(sampleRef, updateData);
      
      // Show success message
      setSuccessMessage("Sample marked as delivered successfully");
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
      // Refresh the collections based on current tab
      await fetchCollections();
      
    } catch (error) {
      console.error("Error marking sample as delivered:", error);
      setError("Failed to mark sample as delivered. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSampleCancelled = () => {
    setStatus("cancelled");
    setSuccessMessage("Sample cancelled successfully.");
    setSelectedSample(null);
    fetchCollections();
  };

  const handleMarkAllWalkInsAsDelivered = async () => {
    console.log('Starting bulk delivery process for walk-in samples...');
    try {
      setIsBulkDelivering(true);
      
      // Get all completed walk-in samples
      console.log('Fetching completed samples from database...');
      
      // First, let's check samples with either completed status
      const completedQuery = query(
        collection(db, "collectionRequests"),
        where("status", "==", "completed")
      );
      
      const consolidatedQuery = query(
        collection(db, "collectionRequests"),
        where("status", "==", "Consolidated All Report Submit")
      );
      
      const [completedSnapshot, consolidatedSnapshot] = await Promise.all([
        getDocs(completedQuery),
        getDocs(consolidatedQuery)
      ]);
      
      console.log(`Found ${completedSnapshot.docs.length} samples with status "completed"`);
      console.log(`Found ${consolidatedSnapshot.docs.length} samples with status "Consolidated All Report Submit"`);

      // Combine both sets of documents
      const allDocs = [...completedSnapshot.docs, ...consolidatedSnapshot.docs];
      
      if (allDocs.length > 0) {
        const sampleData = allDocs[0].data();
        console.log('Example of a completed sample:', {
          id: allDocs[0].id,
          status: sampleData.status,
          completed_at: sampleData.completed_at,
          center_name: sampleData.center_name,
          assigned_driver: sampleData.assigned_driver
        });
      }

      const walkInSamples = allDocs.filter(doc => {
        const data = doc.data();
        // Check if it's a walk-in sample (no assigned driver)
        const isWalkIn = !data.assigned_driver;
        // Make sure it has completed_at field
        const hasCompletedAt = !!data.completed_at;
        
        console.log(`Sample ${doc.id} details:`, {
          assigned_driver: data.assigned_driver ? 'present' : 'not present',
          center_name: data.center_name,
          status: data.status,
          completed_at: data.completed_at,
          isWalkIn,
          hasCompletedAt
        });
        
        return isWalkIn && hasCompletedAt;
      });

      console.log(`Filtered ${walkInSamples.length} walk-in samples to process`);

      if (walkInSamples.length === 0) {
        console.log('No walk-in samples found. Please check if:');
        console.log('1. Samples have status either "completed" or "Consolidated All Report Submit"');
        console.log('2. Samples have completed_at field');
        console.log('3. Samples have no assigned_driver');
        setError("No walk-in samples found to process. Please check the console for details.");
        return;
      }

      // Process each walk-in sample
      for (const sampleDoc of walkInSamples) {
        try {
          const sampleData = sampleDoc.data();
          console.log(`Processing sample ${sampleDoc.id}:`, sampleData);

          // Handle different timestamp formats
          let completedTime: Date;
          if (sampleData.completed_at) {
            if (typeof sampleData.completed_at === 'string') {
              completedTime = new Date(sampleData.completed_at);
            } else if (sampleData.completed_at.seconds) {
              // Handle Firestore Timestamp
              completedTime = new Date(sampleData.completed_at.seconds * 1000);
            } else if (sampleData.completed_at.toDate) {
              // Handle Firestore Timestamp object
              completedTime = sampleData.completed_at.toDate();
            } else {
              completedTime = new Date();
            }
          } else {
            completedTime = new Date();
          }

          console.log('Completed time:', completedTime);
          const deliveryTime = new Date(completedTime.getTime() + 10 * 60000); // Add 10 minutes
          console.log('Delivery time:', deliveryTime);

          const updateData = {
            status: "delivered",
            delivered_at: deliveryTime.toISOString(),
            received_by: "Patient/Client",
            delivery_location: "Front Desk",
            updated_at: serverTimestamp(),
          };

          console.log(`Updating sample ${sampleDoc.id} with data:`, updateData);
          await updateDoc(doc(db, "collectionRequests", sampleDoc.id), updateData);
          console.log(`Successfully updated sample ${sampleDoc.id}`);
        } catch (sampleError) {
          console.error(`Error processing individual sample ${sampleDoc.id}:`, sampleError);
          if (sampleError instanceof Error) {
            console.error('Error details:', sampleError.message);
            if (sampleError.stack) {
              console.error('Stack trace:', sampleError.stack);
            }
          }
          // Continue with other samples even if one fails
        }
      }

      console.log('Bulk delivery process completed successfully');
      setSuccessMessage(`Successfully marked ${walkInSamples.length} walk-in samples as delivered`);
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Refresh the collections
      console.log('Refreshing collections...');
      await fetchCollections();
      console.log('Collections refreshed');

    } catch (error) {
      console.error("Error in bulk delivery process:", error);
      setError("Failed to mark all walk-in samples as delivered. Please try again.");
    } finally {
      setIsBulkDelivering(false);
      console.log('Bulk delivery process finished');
    }
  };

  // Check if user can perform bulk actions (Finance Manager or IT Specialist)
  const canPerformBulkActions = userData?.role === "Finance Manager" || userData?.role === "IT Specialist";

  // Statuses that allow cancellation
  const cancellableStatuses: StatusType[] = ["pending", "collected", "registered", "received", "completed"];

  // Check if current status allows bulk cancellation
  const canCancelInCurrentStatus = canPerformBulkActions && cancellableStatuses.includes(status as StatusType);

  // Bulk selection functions
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(paginatedCollections.map(c => c.id));
      setSelectedSamples(allIds);
    } else {
      setSelectedSamples(new Set());
    }
  };

  const handleSelectSample = (sampleId: string, checked: boolean) => {
    const newSelected = new Set(selectedSamples);
    if (checked) {
      newSelected.add(sampleId);
    } else {
      newSelected.delete(sampleId);
    }
    setSelectedSamples(newSelected);
  };

  const handleBulkCancel = async () => {
    if (!bulkCancelReason.trim()) {
      setBulkCancelError("Please provide a reason for cancellation.");
      return;
    }

    setIsBulkCancelling(true);
    setBulkCancelError(null);

    try {
      // Format reason based on current status
      const reasonPrefix = status === "completed" ? "Bulk cancel completed sample - " : "";
      const finalReason = reasonPrefix + bulkCancelReason;

      console.log("Starting bulk cancellation for", selectedSamples.size, "samples with status:", status);
      console.log("Selected sample IDs:", Array.from(selectedSamples));

      // First, let's check what samples we're trying to cancel
      const samplePromises = Array.from(selectedSamples).map(async (sampleId) => {
        try {
          const docRef = doc(db, "collectionRequests", sampleId);
          const docSnap = await getDoc(docRef);
          
          if (!docSnap.exists()) {
            console.error("Sample document not found:", sampleId);
            return { success: false, sampleId, error: "Document not found" };
          }

          const currentData = docSnap.data();
          console.log(`Sample ${sampleId} current data:`, {
            id: sampleId,
            status: currentData.status,
            completed_at: currentData.completed_at,
            patient_name: currentData.patient_name || currentData.patientName
          });

          // Check if sample is already cancelled
          if (currentData.status === "cancelled") {
            console.warn(`Sample ${sampleId} is already cancelled, skipping...`);
            return { success: false, sampleId, error: "Sample already cancelled" };
          }

          return { success: true, sampleId, currentData };
        } catch (error) {
          console.error("Error checking sample:", sampleId, error);
          return { success: false, sampleId, error };
        }
      });

      const sampleChecks = await Promise.all(samplePromises);
      const validSamples = sampleChecks.filter(check => check.success);
      const invalidSamples = sampleChecks.filter(check => !check.success);

      if (invalidSamples.length > 0) {
        console.warn("Some samples could not be found:", invalidSamples);
      }

      if (validSamples.length === 0) {
        setBulkCancelError("No valid samples found to cancel.");
        return;
      }

      // Now cancel the valid samples
      const cancelPromises = validSamples.map(async ({ sampleId }) => {
        try {
          console.log("Cancelling sample:", sampleId);
          
          // Update in collectionRequests collection
          await updateDoc(doc(db, "collectionRequests", sampleId), {
            status: "cancelled",
            reason_for_cancellation: finalReason,
            cancelled_at: serverTimestamp(),
            updated_at: serverTimestamp(),
          });

          console.log("Successfully cancelled sample:", sampleId);
          return { success: true, sampleId };
        } catch (error) {
          console.error("Failed to cancel sample:", sampleId, error);
          return { success: false, sampleId, error };
        }
      });

      const results = await Promise.all(cancelPromises);
      
      // Check results
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      console.log("Cancellation results:", { successful: successful.length, failed: failed.length });

      if (failed.length > 0) {
        console.error("Some samples failed to cancel:", failed);
        setBulkCancelError(`Failed to cancel ${failed.length} sample(s). ${successful.length} sample(s) were cancelled successfully.`);
      }

      if (successful.length > 0) {
        setSuccessMessage(`Successfully cancelled ${successful.length} sample(s).`);
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000);
      }

      // Reset states
      setSelectedSamples(new Set());
      setShowBulkCancelModal(false);
      setBulkCancelReason("");
      
      // Refresh the collections
      fetchCollections();
      
    } catch (error) {
      console.error("Error in bulk cancellation:", error);
      setBulkCancelError("Failed to cancel samples. Please try again.");
    } finally {
      setIsBulkCancelling(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Sample Collections
          </h2>
          {status === "completed" && 
           (userData?.role === "IT Specialist" || userData?.role === "Finance Manager") && (
            <div className="flex space-x-3">
              <button
                onClick={handleMarkAllWalkInsAsDelivered}
                disabled={isBulkDelivering}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBulkDelivering ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  "Mark All Walk-ins as Delivered"
                )}
              </button>
              {selectedSamples.size > 0 && (
                <button
                  onClick={() => setShowBulkCancelModal(true)}
                  disabled={isBulkCancelling}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <FiTrash2 className="mr-2 w-4 h-4" />
                  {isBulkCancelling ? "Cancelling..." : `Cancel Selected (${selectedSamples.size})`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Success notification */}
      {successMessage && (
        <div className="p-4 text-center text-green-600 bg-green-50 border-b border-green-100">
          <p>{successMessage}</p>
        </div>
      )}

      {/* New filters and controls section */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 border-b border-gray-200 bg-gray-50">
        {/* Search */}
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 w-full border rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Date Range */}
        <div className="flex space-x-2">
          <DatePicker
            selected={startDate}
            onChange={setStartDate}
            placeholderText="Start Date"
            className="px-4 py-2 border rounded-lg"
          />
          <DatePicker
            selected={endDate}
            onChange={setEndDate}
            placeholderText="End Date"
            className="px-4 py-2 border rounded-lg"
          />
        </div>

        {/* Items per page */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Items per page:</span>
          <select
            value={itemsPerPage}
            onChange={e => {
              const val = e.target.value;
              setCurrentPage(1);
              if (val === 'all') {
                setItemsPerPage(-1);
              } else {
                setItemsPerPage(Number(val));
              }
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
            {[20, 40, 60, 100].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
            <option value="all">All</option>
          </select>
        </div>

        {/* Export buttons */}
        <div className="flex space-x-2">
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center">
            <FiDownload className="mr-2" />
            Excel
          </button>
          <button
            onClick={exportToPDF}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center">
            <FiDownload className="mr-2" />
            PDF
          </button>
        </div>
      </div>

      {/* Bulk Actions Panel */}
      {canCancelInCurrentStatus && selectedSamples.size > 0 && (
        <div className="p-4 bg-blue-50 border-b border-blue-200 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-blue-800">
              {selectedSamples.size} sample(s) selected
            </span>
            <button
              onClick={() => setShowBulkCancelModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
            >
              <FiTrash2 className="mr-2 w-4 h-4" />
              Cancel Selected
            </button>
          </div>
          <button
            onClick={() => setSelectedSamples(new Set())}
            className="text-blue-600 hover:text-blue-800"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Tabs for statuses */}
      <div className="flex justify-center border-b border-gray-200">
        {statuses.map((tabStatus) => (
          <button
            key={tabStatus}
            className={`px-4 py-2 text-sm font-medium ${
              status === tabStatus
                ? "text-primary-600 border-b-2 border-primary-600"
                : "text-gray-600"
            }`}
            onClick={() => {
              setStatus(tabStatus as SampleCollection["status"]);
              setCollections([]); // Clear existing data
              setSelectedSamples(new Set()); // Clear selections when changing status
            }}>
            {tabStatus.charAt(0).toUpperCase() + tabStatus.slice(1)}
          </button>
        ))}
      </div>

      {error ? (
        <div className="p-4 text-center text-red-600">
          <p>{error}</p>
          <button
            onClick={() => fetchCollections()}
            className="mt-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            Try Again
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {headers[status as StatusType]?.map(({ label, field }) => (
                    <th
                      key={label}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {field === "select" && canCancelInCurrentStatus ? (
                        <input
                          type="checkbox"
                          checked={selectedSamples.size === paginatedCollections.length && paginatedCollections.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      ) : (
                        label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedCollections.map((collection, idx) => (
                  <tr
                    key={collection.id}
                    className={`
                      ${(status === "collected" ||
                        status === "pending" ||
                        status === "completed" ||
                        status === "registered" ||
                        status === "received" ||
                        status === "delivered" ||
                        status === "accepted collection")
                        ? "cursor-pointer hover:bg-gray-50"
                        : ""
                      }
                      ${overdueSampleIds.has(collection.sampleID) ? 'bg-red-50 border-l-4 border-red-400' : ''}
                    `}
                    onClick={() => {
                      if (
                        status === "collected" ||
                        status === "pending" ||
                        status === "completed" ||
                        status === "registered" ||
                        status === "received" ||
                        status === "delivered" ||
                        status === "accepted collection"
                      ) {
                        setSelectedSample(collection);
                      }
                    }}>
                    {headers[status as StatusType]?.map(({ field, render }) => (
                      <td
                        key={`${collection.id}-${field}`}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        onClick={(e) => {
                          // Prevent row click when clicking on checkbox
                          if (field === "select") {
                            e.stopPropagation();
                          }
                        }}>
                        {field === "select" && canCancelInCurrentStatus ? (
                          <input
                            type="checkbox"
                            checked={selectedSamples.has(collection.id)}
                            onChange={(e) => handleSelectSample(collection.id, e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        ) : render
                          ? render(collection)
                          : field === "sampleID[0]"
                          ? collection.sampleID[0]
                          : field === "requested_at"
                          ? formatDate(collection[field])
                          : field === "collected_at"
                          ? formatDate(collection[field])
                          : field === "time_lapsed"
                          ? calculateTimeLapsed(collection.requested_at)
                          : field === "scan"
                          ? (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSample(collection);
                                setShowScannerModal(true);
                              }}
                              className="p-1 text-blue-600 hover:text-blue-800"
                              title="Scan sample barcode"
                            >
                              <FaBarcode className="w-5 h-5" />
                            </button>
                          )
                          // Add button for walk-in patients with no assigned driver in completed tab
                          : field === "actions" && 
                            (status === "completed" || status === "Consolidated All Report Submit") && 
                            !collection.assigned_driver
                          ? (
                            <button
                              onClick={(e) => handleMarkAsDelivered(collection.id, e)}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                              title="Mark as delivered for walk-in patient"
                            >
                              Mark as Delivered
                            </button>
                          )
                          : field.includes(".")
                          ? (() => {
                              // Safely access nested properties
                              const [parent, child] = field.split(".");
                              return collection[parent] ? collection[parent][child] : 'N/A';
                            })()
                          : collection[field]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Previous
              </button>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{" "}
                  <span className="font-medium">
                    {itemsPerPage === -1 ? 1 : (currentPage - 1) * itemsPerPage + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {itemsPerPage === -1 
                      ? filteredCollections.length 
                      : Math.min(currentPage * itemsPerPage, filteredCollections.length)
                    }
                  </span>{" "}
                  of{" "}
                  <span className="font-medium">
                    {filteredCollections.length}
                  </span>{" "}
                  results
                  {itemsPerPage !== -1 && (
                    <span className="ml-2 text-xs text-gray-500">
                      (Page {currentPage} of {totalPages})
                    </span>
                  )}
                </p>
              </div>
              {itemsPerPage !== -1 && !isPaginatedStatus && (
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                      <FiChevronLeft className="h-5 w-5" />
                    </button>
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                      {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                      <FiChevronRight className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              )}
              {isPaginatedStatus && (
                <div>
                  {hasNextPage ? (
                    <button
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
                    >
                      {isFetchingNextPage ? 'Loading more...' : 'Load More'}
                    </button>
                  ) : (
                    <span className="text-sm text-gray-500">No more records</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {loading && (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          )}

          {/* Add Modal */}
          <SampleDetailsModal
            sample={selectedSample}
            onClose={handleModalClose}
            onRegisterSample={handleRegisterSample}
            status={
              selectedSample?.status === "Consolidated All Report Submit" ||
              selectedSample?.status ===
                "Consolidated All Report Submit Accepted"
                ? "completed"
                : status
            }
            onCancelled={handleSampleCancelled}
          />
          {showScannerModal && selectedSample && (
            <BarcodeScannerModal
              onClose={() => setShowScannerModal(false)}
              onScanSuccess={(barcode) => {
                handleRegisterSample(barcode);
                setShowScannerModal(false);
              }}
            />
          )}

          {/* Bulk Cancellation Modal */}
          {showBulkCancelModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Cancel Selected Samples
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  You are about to cancel {selectedSamples.size} {status === "completed" ? "completed " : ""}sample(s). 
                  {status === "completed" && " This action will revert completed samples to cancelled status."} 
                  Please provide a reason for the cancellation.
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Cancellation
                  </label>
                  <textarea
                    value={bulkCancelReason}
                    onChange={(e) => setBulkCancelReason(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Enter reason for cancellation..."
                  />
                </div>
                {bulkCancelError && (
                  <div className="mb-4 text-sm text-red-600">
                    {bulkCancelError}
                  </div>
                )}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowBulkCancelModal(false);
                      setBulkCancelReason("");
                      setBulkCancelError(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    disabled={isBulkCancelling}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkCancel}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                    disabled={isBulkCancelling}
                  >
                    {isBulkCancelling ? "Cancelling..." : "Confirm Cancel"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
