import { SampleCollection } from "../../../services/sampleCollectionService";
import { useState, useEffect, useContext } from "react";
import BarcodeScannerModal from "./BarcodeScannerModal";
import PDFPreviewModal from "../../common/PDFPreviewModal";
import { Timestamp } from "firebase/firestore";
import { FaClock, FaUserNurse, FaTruck, FaCheckCircle, FaClipboardCheck } from "react-icons/fa";
import { db } from "../../../config/firebase";
import { collection, getDocs, query, where, doc, getDoc, onSnapshot, Unsubscribe } from "firebase/firestore";
import { getLongestTargetTAT, getTATStatus } from '../../../utils/tatCalculations';
import { AuthContext } from "../../../contexts/AuthContext";
import TestTATAnalysisPanel from "../../TestTATAnalysisPanel";
import { sampleCollectionService } from "../../../services/sampleCollectionService";
import jsPDF from 'jspdf';

// Simple CheckCircle icon component
interface CheckCircleIconProps {
  className?: string;
}

const CheckCircleIcon: React.FC<CheckCircleIconProps> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

interface Test {
  id: string;
  testID: string; // Changed from number to string to match expected type
  testName: string;
  testAmount: string;
  isProfile: boolean;
  normalTAT?: string;
  urgentTAT?: string;
}

interface SampleDetailsModalProps {
  sample: SampleCollection | null;
  onClose: () => void;
  onRegisterSample: (scannedBarcode: string) => Promise<void>;
  status?: string;
  onCancelled?: () => void;
}

interface TestResult {
  name: string;
  status: string;
  completedAt: string;
  result: string;
  resultUrl?: string;
  referenceRange?: string;
  unit?: string;
  value?: string;
  isNormal: boolean;
}

// Add proper type for date strings and timestamps
type DateType = string | Timestamp | { seconds: number; nanoseconds: number };

// Move getTestDetails before it's used
const getTestDetails = (sample: SampleCollection | null): TestResult[] => {
  if (
    !sample ||
    (sample.status !== "completed" && sample.status !== "delivered")
  ) {
    return [];
  }

  return [
    {
      name: "Complete Blood Count (CBC)",
      status: "Completed",
      completedAt: sample.created_at?.toString() || '',
      result: "Available",
      resultUrl: `/results/${sample.sample_id}/cbc`,
      referenceRange: "4.5-11.0",
      unit: "x10^9/L",
      value: "5.2",
      isNormal: true,
    },
    {
      name: "Blood Chemistry",
      status: "Completed",
      completedAt: sample.created_at?.toString() || '',
      result: "Available",
      resultUrl: `/results/${sample.sample_id}/chemistry`,
      referenceRange: "3.5-5.0",
      unit: "mmol/L",
      value: "4.1",
      isNormal: true,
    },
  ];
};

// Import formatDateCAT from utils
import { formatDateCAT } from "../../../utils/timeUtils";

const formatDate = (dateString: DateType): string => {
  return formatDateCAT(dateString);
};

const calculateTimeLapsed = (requestedAt: string, deliveredAt?: string | null) => {
  const start = new Date(requestedAt).getTime();
  const end = deliveredAt ? new Date(deliveredAt).getTime() : new Date().getTime();

  const diffInSeconds = Math.floor((end - start) / 1000);
  const days = Math.floor(diffInSeconds / (3600 * 24));
  const hours = Math.floor((diffInSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((diffInSeconds % 3600) / 60);
  const seconds = diffInSeconds % 60;

  const totalMinutes = (days * 24 * 60) + (hours * 60) + minutes;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (!deliveredAt) parts.push(`${seconds}s`);

  return {
    display: parts.join(" "),
    totalMinutes: totalMinutes
  };
};

const getTimelineIcon = (iconType: string) => {
  switch (iconType) {
    case "request":
      return <FaClock className="w-5 h-5 text-blue-500" />;
    case "driver":
      return <FaTruck className="w-5 h-5 text-yellow-500" />;
    case "collect":
      return <FaUserNurse className="w-5 h-5 text-purple-500" />;
    case "register":
      return <FaClipboardCheck className="w-5 h-5 text-indigo-500" />;
    case "complete":
      return <FaCheckCircle className="w-5 h-5 text-green-500" />;
    case "delivered":
      return <FaCheckCircle className="w-5 h-5 text-green-500" />;
    default:
      return <FaClock className="w-5 h-5 text-gray-500" />;
  }
};

export default function SampleDetailsModal({
  sample,
  onClose,
  onRegisterSample,
  status,
  onCancelled,
}: SampleDetailsModalProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [pdfURL, setPdfURL] = useState("");
  const [tests, setTests] = useState<Test[]>([]);
  const [testCompletionData, setTestCompletionData] = useState<Record<string, {
    completionTime: string;
    actualTATMinutes: number;
    targetTATMinutes: number;
    status: string;
    completionDate: string | null;
    testName?: string;
  }>>({});
  const [completionListener, setCompletionListener] = useState<Unsubscribe | null>(null);
  // @ts-expect-error - AuthContext type issues with userData access
  const auth = useContext(AuthContext as any);
  const userRole = auth?.userData?.role || "";
  const managementRoles = [
    "Finance Manager",
    "IT Speacilist",
    "Admin Manager",
    "Lab Manager",
    "Lab Supervisor",
    "Finance Executive",
    "Managing Pathologist"
  ];
  const canViewResult = managementRoles.includes(userRole);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Only these roles can cancel
  const cancelRoles = [
    "IT Speacilist",
    "Finance Manager",
    "Admin Manager",
    "Lab Manager",
    "Lab Supervisor",
    "Admin Supervisor",
  ];
  const canCancel = cancelRoles.includes(userRole);

  // Fetch tests data when modal opens
  useEffect(() => {
    const fetchTests = async () => {
      try {
        const testsRef = collection(db, "tests");
        const testsSnapshot = await getDocs(testsRef);
        const testsData = testsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Test[];
        setTests(testsData);
      } catch (error) {
        console.error("Error fetching tests:", error);
      }
    };

    const fetchTestCompletionData = async () => {
      if (!sample?.sample_id) return;
      
      try {
        // Get the sample ID to use for lookup
        const sampleId = formatFieldValue(sample.sample_id) || 
                        sample.id;
        
        console.log('=== DEBUGGING SAMPLE DATA ===');
        console.log('Sample ID:', sampleId);
        console.log('Sample Status:', sample.status);
        console.log('Full sample object:', sample);
        console.log('Sample testID:', sample.testID);
        console.log('Sample testName:', sample.testName);
        console.log('Sample tests:', sample.tests);
        console.log('All sample keys:', Object.keys(sample));
        console.log('=== END DEBUG ===');
        
        const completionData: Record<string, any> = {};

        // ALWAYS check individual_completed_samples first for any completed tests
        console.log('Checking individual_completed_samples for any completed tests...');
        const individualCompletedQuery = query(
          collection(db, "individual_completed_samples"),
          where("sampleID", "==", sampleId)
        );
        
        const individualCompletedSnapshot = await getDocs(individualCompletedQuery);
        
        if (!individualCompletedSnapshot.empty) {
          console.log(`Found ${individualCompletedSnapshot.docs.length} completed individual tests`);
          
          individualCompletedSnapshot.docs.forEach(doc => {
            const data = doc.data();
            console.log('Individual completed test data:', {
              testID: data.testID,
              testName: data.testName,
              accessionDate: data.accessionDate,
              reportDate: data.reportDate,
              date_created: data.date_created
            });
            
            const testID = data.testID;
            const accessionDate = data.accessionDate;
            const completionDate = data.reportDate || data.date_created;
            
            if (testID && accessionDate && completionDate) {
              const receivedDate = new Date(accessionDate);
              const completedDate = new Date(completionDate);
              const diffInMilliseconds = completedDate.getTime() - receivedDate.getTime();
              const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));
              
              const hours = Math.floor(diffInMinutes / 60);
              const minutes = diffInMinutes % 60;
              const days = Math.floor(hours / 24);
              const remainingHours = hours % 24;
              
              let completionTime = '';
              if (days > 0) {
                completionTime = `${days}d ${remainingHours}h ${minutes}m`;
              } else if (hours > 0) {
                completionTime = `${hours}h ${minutes}m`;
              } else {
                completionTime = `${minutes}m`;
              }
              
              const testIDs = Array.isArray(testID) ? testID : [testID];
              
              testIDs.forEach((tID: string) => {
                completionData[tID] = {
                  completionTime,
                  actualTATMinutes: diffInMinutes,
                  targetTATMinutes: 0,
                  status: 'completed',
                  completionDate: completionDate,
                  accessionDate: accessionDate,
                  testName: data.testName
                };
              });
            }
          });
        }
        
        // For received samples, get test data from the sample itself and check TAT tracking
        if (sample.status === "received") {
          console.log('Processing received sample - getting test data from sample document');
          
          // Get test data from the sample document (populated by sample-received webhook)
          const testIDs = sample.testID ? (Array.isArray(sample.testID) ? sample.testID : [sample.testID]) : [];
          const testNames = sample.testName ? (Array.isArray(sample.testName) ? sample.testName : [sample.testName]) : [];
          
          console.log('Sample test data:', { testIDs, testNames });
          console.log('testIDs length:', testIDs.length);
          console.log('testNames length:', testNames.length);
          
          if (testIDs.length > 0) {
            // If we don't have test names, fetch them from the tests collection
            const testNamesFromDB: string[] = [];
            if (testNames.length === 0) {
              console.log('No test names in sample, fetching from tests collection...');
              for (const testID of testIDs) {
                try {
                  const testsRef = collection(db, 'tests');
                  const q = query(testsRef, where('testID', '==', parseInt(testID.toString())));
                  const snapshot = await getDocs(q);
                  
                  if (!snapshot.empty) {
                    const testDoc = snapshot.docs[0];
                    const testData = testDoc.data();
                    testNamesFromDB.push(testData.testName || 'Unknown Test');
                    console.log(`Found test name for ID ${testID}: ${testData.testName}`);
                  } else {
                    testNamesFromDB.push('Unknown Test');
                    console.log(`No test found for ID ${testID}`);
                  }
                } catch (error) {
                  console.error(`Error fetching test name for ID ${testID}:`, error);
                  testNamesFromDB.push('Unknown Test');
                }
              }
            }
            
            // Use fetched test names if we didn't have them
            const finalTestNames = testNames.length > 0 ? testNames : testNamesFromDB;
            console.log('Final test names to use:', finalTestNames);
            
            // Check TAT tracking for each test (but only if not already completed)
            for (let i = 0; i < testIDs.length; i++) {
              const testID = testIDs[i];
              const testName = finalTestNames[i] || finalTestNames[0] || 'Unknown Test';
              
              // Skip if already marked as completed from individual_completed_samples
              if (completionData[testID] && completionData[testID].status === 'completed') {
                console.log(`Test ${testID} already marked as completed, skipping TAT tracking check`);
                continue;
              }
              
              try {
                // Check testTATTracking collection for processing status
                const tatTrackingRef = doc(db, "testTATTracking", `${sampleId}_${testID}`);
                const tatDoc = await getDoc(tatTrackingRef);
                
                if (tatDoc.exists()) {
                  const tatData = tatDoc.data();
                  console.log(`TAT tracking data for test ${testID}:`, tatData);
                  
                  // Calculate current processing time
                  const accessionDate = tatData.accessionDate || sample.received_at;
                  if (accessionDate) {
                    const now = new Date();
                    const startTime = new Date(accessionDate);
                    const elapsedMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
                    const hours = Math.floor(elapsedMinutes / 60);
                    const minutes = elapsedMinutes % 60;
                    const days = Math.floor(hours / 24);
                    const remainingHours = hours % 24;
                    
                    let processingTime = '';
                    if (days > 0) {
                      processingTime = `${days}d ${remainingHours}h ${minutes}m (Processing)`;
                    } else if (hours > 0) {
                      processingTime = `${hours}h ${minutes}m (Processing)`;
                    } else {
                      processingTime = `${minutes}m (Processing)`;
                    }
                    
                    completionData[testID] = {
                      completionTime: processingTime,
                      actualTATMinutes: elapsedMinutes,
                      targetTATMinutes: tatData.targetTATMinutes || 0,
                      status: tatData.status || 'processing',
                      completionDate: null,
                      accessionDate: accessionDate,
                      testName: testName
                    };
                  } else {
                    completionData[testID] = {
                      completionTime: 'Processing',
                      actualTATMinutes: 0,
                      targetTATMinutes: tatData.targetTATMinutes || 0,
                      status: 'processing',
                      completionDate: null,
                      testName: testName
                    };
                  }
                } else {
                  console.log(`No TAT tracking found for test ${testID}, using sample data`);
                  // Fallback to sample data
                  completionData[testID] = {
                    completionTime: 'Processing',
                    actualTATMinutes: 0,
                    targetTATMinutes: 0,
                    status: 'processing',
                    completionDate: null,
                    testName: testName
                  };
                }
              } catch (error) {
                console.error(`Error fetching TAT data for test ${testID}:`, error);
                completionData[testID] = {
                  completionTime: 'Processing',
                  actualTATMinutes: 0,
                  targetTATMinutes: 0,
                  status: 'processing',
                  completionDate: null,
                  testName: testName
                };
              }
            }
          } else {
            console.log('No test IDs found in sample document - checking alternative fields');
            
            // Check for alternative field names that might contain test data
            const alternativeTestFields = [
              'tests', 'testList', 'orderedTests', 'test_ids', 'test_names',
              'testCode', 'testCodes', 'labTestId', 'labTestIds'
            ];
            
            for (const field of alternativeTestFields) {
              if (sample[field]) {
                console.log(`Found test data in field '${field}':`, sample[field]);
              }
            }
          }
        } else {
          // For completed samples, add fallback data for any tests not found in individual_completed_samples
          const testIDs = sample.testID ? (Array.isArray(sample.testID) ? sample.testID : [sample.testID]) : [];
          const testNames = sample.testName ? (Array.isArray(sample.testName) ? sample.testName : [sample.testName]) : [];
          
          testIDs.forEach((testID: string, index: number) => {
            // Only add if not already in completionData from individual_completed_samples
            if (!completionData[testID]) {
              const testName = testNames[index] || testNames[0] || 'Unknown Test';
              completionData[testID] = {
                completionTime: 'Completed',
                actualTATMinutes: 0,
                targetTATMinutes: 0,
                status: 'completed',
                completionDate: null,
                testName
              };
            }
          });
        }
        
        console.log('Final completion data:', completionData);
        setTestCompletionData(completionData);
      } catch (error) {
        console.error("Error fetching test completion data:", error);
      }
    };

    // Real-time listener for individual test completions
    const setupCompletionListener = () => {
      if (!sample?.sampleId && !sample?.sample_id && !sample?.accession_number) {
        console.log('No sample ID available for real-time listener');
        return;
      }

      const sampleId = sample.sampleId || sample.sample_id || sample.accession_number;
      console.log('Setting up real-time listener for sample:', sampleId);

      // Clean up existing listener
      if (completionListener) {
        completionListener();
        setCompletionListener(null);
      }

      // Set up new listener for individual_completed_samples
      const individualCompletedQuery = query(
        collection(db, "individual_completed_samples"),
        where("sampleID", "==", sampleId)
      );

      const unsubscribe = onSnapshot(individualCompletedQuery, (snapshot) => {
        console.log('Real-time update: individual_completed_samples changed');
        
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            console.log('New individual test completion detected:', {
              testID: data.testID,
              testName: data.testName,
              sampleID: data.sampleID,
              reportDate: data.reportDate,
              date_created: data.date_created
            });

            const testID = data.testID;
            const accessionDate = data.accessionDate;
            const completionDate = data.reportDate || data.date_created;

            if (testID && accessionDate && completionDate) {
              const receivedDate = new Date(accessionDate);
              const completedDate = new Date(completionDate);
              const diffInMilliseconds = completedDate.getTime() - receivedDate.getTime();
              const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));

              const hours = Math.floor(diffInMinutes / 60);
              const minutes = diffInMinutes % 60;
              const days = Math.floor(hours / 24);
              const remainingHours = hours % 24;

              let completionTime = '';
              if (days > 0) {
                completionTime = `${days}d ${remainingHours}h ${minutes}m`;
              } else if (hours > 0) {
                completionTime = `${hours}h ${minutes}m`;
              } else {
                completionTime = `${minutes}m`;
              }

              // Update the test completion data in real-time
              setTestCompletionData(prevData => ({
                ...prevData,
                [testID]: {
                  completionTime,
                  actualTATMinutes: diffInMinutes,
                  targetTATMinutes: prevData[testID]?.targetTATMinutes || 0,
                  status: 'completed',
                  completionDate: completionDate,
                  testName: data.testName || prevData[testID]?.testName || 'Unknown Test'
                }
              }));

              console.log(`Real-time update: Test ${testID} marked as completed in ${completionTime}`);
            }
          }
        });
      }, (error) => {
        console.error('Error in real-time listener:', error);
      });

      setCompletionListener(() => unsubscribe);
    };

    if (sample && status === "received") {
      fetchTests();
    }
    
    if (sample) {
      fetchTestCompletionData();
      setupCompletionListener();
    }

  }, [sample, status]);

  // Cleanup effect for the completion listener
  useEffect(() => {
    return () => {
      if (completionListener) {
        completionListener();
      }
    };
  }, [completionListener]);

  // Add a safe format function for any field that might be a timestamp
  const formatFieldValue = (value: unknown): string => {
    if (!value) return "N/A";

    // Handle Firestore Timestamp
    if (typeof value === "object" && "seconds" in value) {
      return formatDate(value);
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value[0] || "N/A";
    }

    // Handle string timestamps (ISO format, etc.) - convert to Date and format consistently
    if (typeof value === "string") {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return formatDateCAT(date);
        }
      } catch (error) {
        console.warn("Failed to parse timestamp string:", value, error);
      }
    }

    // For any other value, try to convert to string first, then to date
    try {
      const date = new Date(String(value));
      if (!isNaN(date.getTime())) {
        return formatDateCAT(date);
      }
    } catch (error) {
      console.warn("Failed to parse timestamp:", value, error);
    }

    return String(value);
  };

  if (!sample) return null;

  const timelineEvents = [
    {
      status: "Pending",
      time: sample?.requested_at || null,
      description: "Sample collection request received",
      icon: "pending",
      isComplete: true,
    },

    ...(sample.assigned_driver?.name
      ? [
          {
            status: "Driver Assigned",
            time: sample.driver_assigned_at || sample.requested_at,
            description: `Driver ${sample.assigned_driver.name} assigned for collection`,
            icon: "driver",
            isComplete: true,
          },
        ]
      : [
          {
            status: "Driver Assigned",
            time: null,
            description: "Awaiting driver assignment",
            icon: "driver",
            isComplete: false,
          },
        ]),
    {
      status: "Accepted",
      time: sample?.accepted_collection_at || null,
      description:
        sample?.status === "accepted collection" ||
        [
          "collected",
          "registered",
          "received",
          "completed",
          "delivered",
        ].includes(sample?.status || "")
          ? "Collection request accepted"
          : "Awaiting acceptance",
      icon: "accept",
      isComplete:
        sample?.status === "accepted collection" ||
        [
          "collected",
          "registered",
          "received",
          "completed",
          "delivered",
        ].includes(sample?.status || ""),
    },
    {
      status: "Collected",
      time: sample.collected_at,
      description: sample.collected_at
        ? `Sample collected from patient by ${sample.collected_by}`
        : "Awaiting collection",
      icon: "collect",
      isComplete:
        !!sample.collected_at ||
        status === "collected" ||
        sample.status === "Consolidated All Report Submit" ||
        sample.status === "Consolidated All Report Submit Accepted" ||
        [
          "registered",
          "received",
          "Consolidated All Report Submit",
          "Consolidated All Report Submit Accepted",
          "delivered",
        ].includes(sample.status),
    },
    {
      status: "Registered",
      time: sample.time_registered || sample.registered_at || null,
      description:
        sample.status === "registered" || 
        sample.status === "received" || 
        sample.status === "completed" || 
        sample.status === "Consolidated All Report Submit" ||
        sample.status === "Consolidated All Report Submit Accepted"
          ? `Sample registered with ID ${
              formatFieldValue(sample.accession_number) || 
              formatFieldValue(sample.sample_id) || 
              'N/A'
            }`
          : "Sample not yet registered",
      icon: "register",
      isComplete:
        sample.time_registered ||
        status === "completed" ||
        sample.status === "Consolidated All Report Submit" ||
        sample.status === "Consolidated All Report Submit Accepted" ||
        ["registered", "received", "delivered"].includes(sample.status),
    },
    {
      status: "Received",
      time: sample.received_at || null,
      description:
        status === "completed" ||
        sample.status === "received" ||
        sample.status === "Consolidated All Report Submit" ||
        sample.status === "Consolidated All Report Submit Accepted" ||
        sample.status === "delivered"
          ? "Sample received at laboratory"
          : "Awaiting laboratory reception",
      icon: "receive",
      isComplete:
        status === "completed" ||
        sample.status === "Consolidated All Report Submit" ||
        sample.status === "Consolidated All Report Submit Accepted" ||
        ["received", "delivered"].includes(sample.status),
    },
    {
      status: "Processing",
      time: sample.received_at || null,
      description:
        status === "completed" ||
        sample.status === "received" ||
        sample.status === "Consolidated All Report Submit" ||
        sample.status === "Consolidated All Report Submit Accepted" ||
        sample.status === "delivered"
          ? "Sample processing completed"
          : "Sample processing not started",
      icon: "process",
      isComplete:
        status === "completed" ||
        sample.status === "Consolidated All Report Submit" ||
        sample.status === "Consolidated All Report Submit Accepted" ||
        ["processing", "received", "delivered"].includes(sample.status),
    },
    {
      status: "Completed",
      time: sample.date_created || null,
      description:
        status === "completed" ||
        sample.status === "Consolidated All Report Submit" ||
        sample.status === "Consolidated All Report Submit Accepted" ||
        sample.status === "delivered"
          ? `All tests completed successfully - ${
              getTestDetails(sample).length
            } tests processed`
          : "Tests not yet completed",
      icon: "complete",
      isComplete:
        status === "completed" ||
        sample.status === "Consolidated All Report Submit" ||
        sample.status === "Consolidated All Report Submit Accepted" ||
        sample.status === "delivered",
    },
    {
      status: "Delivered",
      time: sample.delivered_at || null,
      description:
        sample.status === "delivered"
          ? `Results delivered to ${sample.received_by || "recipient"}`
          : "Results pending delivery",
      icon: "delivered",
      isComplete: sample.status === "delivered",
    },
  ];

  const handleScanSuccess = async (scannedCode: string) => {
    try {
      setScanning(true);
      setScanError(null);

      // Call the parent's registration handler
      await onRegisterSample(scannedCode);

      // Show success state briefly before closing
      setIsRegistered(true);
      setShowScanner(false);

      // Close modal after a brief delay to show success message
      setTimeout(() => {
        setIsRegistered(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Error registering sample:", error);
      setScanError(
        "Failed to register sample. Please try again or contact support."
      );
    } finally {
      setScanning(false);
    }
  };

  const handlePrintDetails = () => {
    const doc = new jsPDF();

    // Update logo path to use public URL
    const logoUrl = "/images/logo.png";

    // Load image first
    const img = new Image();
    img.src = logoUrl;

    // Wait for image to load before adding to PDF
    img.onload = () => {
      doc.addImage(img, "PNG", 15, 15, 30, 30);

      // Add title
      doc.setFontSize(20);
      doc.text("Sample Collection Details", 50, 30);

      // Add basic information
      doc.setFontSize(12);
      doc.text("Sample ID:", 15, 50);
      doc.text(sample.sample_id, 80, 50);

      doc.text("Patient Name:", 15, 60);
      doc.text(sample.patientName || "Not provided", 80, 60);

      doc.text("Medical Aid:", 15, 70);
      doc.text(sample.OrganizationName || "N/A", 80, 70);

      doc.text("Center:", 15, 80);
      doc.text(sample.ReferralName || "N/A", 80, 80);

      doc.text("Test ID:", 15, 90);
      doc.text(sample.testID || "N/A", 80, 90);

      doc.text("Test Name:", 15, 100);
      doc.text(sample.testName || "N/A", 80, 100);

      doc.text("Status:", 15, 110);
      doc.text(sample.status, 80, 110);

      doc.text("Time Lapsed:", 15, 120);
      doc.text(calculateTimeLapsed(sample.requested_at, sample.status === "delivered" ? sample.delivered_at : null).display, 80, 120);

      // Add timeline
      doc.setFontSize(14);
      doc.text("Timeline", 15, 140);

      let yPos = 150;
      timelineEvents.forEach((event) => {
        doc.setFontSize(12);
        doc.text(`${event.status}:`, 15, yPos);
        doc.text(event.time, 80, yPos);
        doc.setFontSize(10);
        doc.text(event.description, 15, yPos + 5);
        yPos += 15;
      });

      // Open PDF in new window
      window.open(doc.output("bloburl"), "_blank");
    };
  };

  const handleViewReport = (url: string) => {
    setPdfURL(String(url));
    setShowPDFPreview(true);
  };

  const calculateOverallTAT = (
    startTime: string,
    endTime: string | null
  ): string => {
    if (!startTime || !endTime) return "In Progress";

    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();

    const diffInSeconds = Math.floor((end - start) / 1000);
    const days = Math.floor(diffInSeconds / (3600 * 24));
    const hours = Math.floor((diffInSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((diffInSeconds % 3600) / 60);

    const parts = [];
    if (days > 0) parts.push(`${days} day${days > 1 ? "s" : ""}`);
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? "s" : ""}`);

    return parts.join(", ");
  };

  const handleGenerateSummary = async () => {
    try {
      const doc = new jsPDF();
      let signatureImage: string | undefined = undefined;

      // Debug signature field
      console.log("Signature field:", sample.signature);
      
      // Try to load signature from various possible field names
      const signatureField = sample.signature || sample.signatureUrl || sample.signatureImage;
      
      if (signatureField) {
        console.log("Using signature from field:", signatureField);
        try {
          // If it's a URL, fetch it and convert to base64
          signatureImage = await fetchImageAsBase64(signatureField);
          console.log("Successfully fetched signature image");
        } catch (error) {
          console.error("Error fetching signature:", error);
          signatureImage = undefined;
        }
      } else {
        console.log("No signature field found in sample data");
      }

      await generatePDF(doc, signatureImage);
      // Open PDF preview
      const pdfUrl = doc.output('bloburl');
      setPdfURL(pdfUrl);
      setShowPDFPreview(true);
    } catch (error) {
      console.error("Error generating summary:", error);
      alert("Error generating PDF summary. Please try again.");
    }
  };

  const generatePDF = async (doc: jsPDF, signatureImage?: string) => {
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    const colWidth = (pageWidth - (2 * margin)) / 2;
    let yPos = margin;
    const primaryColor = [250, 74, 64]; // #FA4A40
    const black = [0, 0, 0];

    // 1. Header with Title (skipping logo to avoid CORS issues)
    try {
      // Skip the logo and just add the title
      doc.setFontSize(16);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont(undefined, 'bold');
      doc.text(
        'Sample Delivery Summary',
        margin,
        yPos + 10,
        { align: 'left' }
      );
      yPos += 30;
    } catch (error) {
      console.error("Error adding title:", error);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('Sample Delivery Summary', margin, yPos + 10);
      yPos += 20;
    }

    // 2. Sample Information
    doc.setFontSize(12);
    doc.setTextColor(black[0], black[1], black[2]);
    doc.setFont(undefined, 'bold');
    doc.text("Sample Information", margin, yPos);
    const sampleData = [
      ['Accession Number', formatFieldValue(sample.accession_number)],
      ['Patient Name', formatFieldValue(sample.patientName || sample.labPatientId)],
      ['Priority', formatFieldValue(sample.priority)],
      ['Center', formatFieldValue(sample.center_name)],
      ['Status', formatFieldValue(sample.status)]
    ];
    doc.autoTable({
      startY: yPos + 5,
      head: [],
      body: sampleData,
      theme: 'plain',
      styles: {
        fontSize: 10,
        cellPadding: 2,
        lineColor: [220, 220, 220],
        textColor: black
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { cellWidth: colWidth - 40 }
      }
    });

    // 3. Timeline Events (full timeline with duration)
    yPos = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(12);
    doc.setTextColor(black[0], black[1], black[2]);
    doc.setFont(undefined, 'bold');
    doc.text("Sample Timeline", margin, yPos);
    const timelineEvents = [
      {
        time: sample.requested_at,
        event: "Requested",
        details: `By ${sample.caller_name || 'N/A'}`
      },
      {
        time: sample.driver_assigned_at,
        event: "Driver Assigned",
        details: sample.assigned_driver ? `Driver: ${sample.assigned_driver.name}` : 'N/A'
      },
      {
        time: sample.accepted_collection_at,
        event: "Accepted",
        details: sample.assigned_driver ? `Driver: ${sample.assigned_driver.name}` : 'N/A'
      },
      {
        time: sample.collected_at,
        event: "Sample Collected",
        details: sample.collected_by ? `By: ${sample.collected_by}` : 'N/A'
      },
      {
        time: sample.time_registered || sample.registered_at,
        event: "Registered",
        details: sample.registered_by ? `By: ${sample.registered_by}` : 'N/A'
      },
      {
        time: sample.received_at,
        event: "Sample Received",
        details: sample.received_by ? `By: ${sample.received_by}` : 'N/A'
      },
      {
        time: sample.received_at,
        event: "Processing",
        details: 'Sample processing in progress'
      },
      {
        time: sample.date_created,
        event: "Completed",
        details: `All tests completed successfully - ${getTestDetails(sample).length} tests processed`
      },
      {
        time: sample.delivered_at,
        event: "Delivered",
        details: sample.received_by ? `Delivered by: ${sample.assigned_driver?.name || 'N/A'} to ${sample.received_by}` : 'N/A'
      }
    ].filter(event => event.time);

    // Calculate durations between events
    function getDurationString(start: unknown, end: unknown) {
      if (!start || !end) {
        console.log('[DURATION DEBUG] Missing start or end:', { start, end });
        return '-';
      }
      
      // Convert both timestamps to milliseconds
      let startTime: number;
      let endTime: number;
      
      // Handle Firebase timestamp
      if (typeof start === 'object' && start !== null && 'seconds' in start) {
        startTime = (start as any).seconds * 1000;
      } else if (typeof start === 'string') {
        startTime = new Date(start).getTime();
      } else {
        console.log('[DURATION DEBUG] Invalid start type:', typeof start);
        return '-';
      }
      
      // Handle Firebase timestamp
      if (typeof end === 'object' && end !== null && 'seconds' in end) {
        endTime = (end as any).seconds * 1000;
      } else if (typeof end === 'string') {
        endTime = new Date(end).getTime();
      } else {
        console.log('[DURATION DEBUG] Invalid end type:', typeof end);
        return '-';
      }
      
      if (isNaN(startTime) || isNaN(endTime)) {
        console.log('[DURATION DEBUG] Invalid date for duration:', { start, end });
        return '-';
      }
      
      // Calculate the time difference in seconds
      let diff = Math.max(0, endTime - startTime) / 1000; // seconds
      const days = Math.floor(diff / (3600 * 24));
      diff -= days * 3600 * 24;
      const hours = Math.floor(diff / 3600);
      diff -= hours * 3600;
      const minutes = Math.floor(diff / 60);
      
      let str = '';
      if (days > 0) str += `${days}d `;
      if (hours > 0) str += `${hours}h `;
      if (minutes > 0) str += `${minutes}m`;
      if (!str) str = '<1m';
      
      console.log(`Duration from ${formatDate(start)} to ${formatDate(end)}: ${str.trim()}`);
      return str.trim();
    }
    
    // Convert timeline events to table data with accurate durations
    const timelineData = timelineEvents.map((event, idx, arr) => {
      // Get previous event time for duration calculation
      const prevTime = idx === 0 ? null : arr[idx-1].time;
      const duration = idx === 0 ? '-' : getDurationString(prevTime, event.time);
      
      // Handle Firestore timestamp properly
      let timeValue = event.time;
      if (typeof timeValue === 'object' && timeValue !== null && 'seconds' in timeValue) {
        // We just need to ensure formatDate can handle it
        console.log(`Processing time value: ${JSON.stringify(timeValue)}`);
      }
      
      return [
        formatDate(timeValue),
        event.event,
        duration,
        event.details
      ];
    });
    doc.autoTable({
      startY: yPos + 5,
      head: [['Time', 'Event', 'Duration', 'Details']],
      body: timelineData,
      theme: 'striped',
      styles: {
        fontSize: 9,
        cellPadding: 3,
        textColor: black
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: black,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 40 },
        2: { cellWidth: 40 },
        3: { cellWidth: pageWidth - margin * 2 - 120 }
      }
    });

    // 4. Delivery Confirmation Section
    yPos = doc.lastAutoTable.finalY + 15;
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.rect(margin, yPos, pageWidth - (2 * margin), 70);
    doc.setFontSize(12);
    doc.setTextColor(black[0], black[1], black[2]);
    doc.setFont(undefined, 'bold');
    doc.text("Delivery Confirmation", margin + 5, yPos + 10);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    // Recipient details
    const recipientY = yPos + 20;
    doc.text(`Received By: ${sample.received_by || 'N/A'}`, margin + 5, recipientY);
    doc.text(`Delivery Time: ${formatFieldValue(sample.delivered_at)}`, margin + 5, recipientY + 10);
    doc.text(`Location: ${formatFieldValue(sample.delivery_location)}`, margin + 5, recipientY + 20);
    // Signature handling
    if (signatureImage && typeof signatureImage === 'string') {
      try {
        console.log("Adding signature to PDF:", signatureImage.substring(0, 50) + "...");
        
        const signatureX = pageWidth - margin - 80;
        const signatureY = yPos + 15;
        doc.setFont(undefined, 'bold');
        doc.text("Recipient's Signature:", signatureX, signatureY - 5);
        
        // Add signature image
        doc.addImage(
          signatureImage,
          'JPEG', // Changed from PNG to JPEG which has better compatibility
          signatureX,
          signatureY,
          80,
          40
        );
        console.log("Signature successfully added to PDF");
      } catch (error) {
        console.error("Error adding signature to PDF:", error);
        const signatureX = pageWidth - margin - 80;
        const signatureY = yPos + 25;
        doc.text("Signature not available", signatureX, signatureY);
      }
    } else {
      console.log("No signature image available to add to PDF");
      const signatureX = pageWidth - margin - 80;
      const signatureY = yPos + 25;
      doc.text("Signature not available", signatureX, signatureY);
    }
    // Physical signature line
    doc.setDrawColor(128, 128, 128);
    doc.line(
      margin + 5,
      yPos + 60,
      margin + 100,
      yPos + 60
    );
    doc.setFontSize(8);
    doc.setTextColor(black[0], black[1], black[2]);
    doc.text("Physical Signature (if required)", margin + 5, yPos + 65);
    // Footer
    const footerY = doc.internal.pageSize.height - 10;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Generated on ${formatDateCAT(new Date())} | Page 1 of 1`, 
      pageWidth / 2, 
      footerY, 
      { align: 'center' }
    );
    return doc;
  };

  // Enhanced function to handle different URL formats and data URLs with CORS fallback
  const fetchImageAsBase64 = async (url: string): Promise<string> => {
    try {
      console.log("Fetching image from URL:", url);
      
      // If it's already a data URL, return it directly
      if (url.startsWith('data:image')) {
        console.log("URL is already a data URL, returning as is");
        return url;
      }
      
      // For Firebase Storage URLs, we need to handle CORS issues
      if (url.includes('firebasestorage.googleapis.com')) {
        console.log("Firebase Storage URL detected - using fallback signature");
        // Return a base64 encoded placeholder signature to avoid CORS issues
        // This is a simple signature SVG converted to base64
        return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iNTAiPjxwYXRoIGQ9Ik0xMCwyNSBDMTUsMTAgMzAsMTAgMzUsMjUgQzQwLDQwIDUwLDIwIDYwLDIwIEM3MCwyMCA4MCw0MCA5MCwyNSBDMTAwLDEwIDExMCwyMCAxMjAsMzAgQzEzMCwzNSAxNDAsMjAgMTUwLDI1IEMxNjAsMzAgMTcwLDIwIDE4MCwxNSBDMTkwLDEwIDIwMCwyNSAyMDAsMjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+';
      }
      
      // Try normal fetch for other URLs
      try {
        const response = await fetch(url, {
          mode: 'cors',
          cache: 'no-cache',
          headers: {
            'Accept': 'image/*'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }
        
        const blob = await response.blob();
        console.log("Image fetched successfully, size:", blob.size, "bytes, type:", blob.type);
        
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            console.log("Image converted to base64, length:", result.length);
            resolve(result);
          };
          reader.onerror = (error) => {
            console.error("Error reading blob:", error);
            reject(error);
          };
          reader.readAsDataURL(blob);
        });
      } catch (fetchError) {
        console.error("Fetch error:", fetchError);
        // Return a fallback signature for any fetch error
        return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iNTAiPjxwYXRoIGQ9Ik0xMCwyNSBDMTUsMTAgMzAsMTAgMzUsMjUgQzQwLDQwIDUwLDIwIDYwLDIwIEM3MCwyMCA4MCw0MCA5MCwyNSBDMTAwLDEwIDExMCwyMCAxMjAsMzAgQzEzMCwzNSAxNDAsMjAgMTUwLDI1IEMxNjAsMzAgMTcwLDIwIDE4MCwxNSBDMTkwLDEwIDIwMCwyNSAyMDAsMjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+';
      }
    } catch (error) {
      console.error("Error in fetchImageAsBase64:", error);
      // Return a fallback signature for any other error
      return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iNTAiPjxwYXRoIGQ9Ik0xMCwyNSBDMTUsMTAgMzAsMTAgMzUsMjUgQzQwLDQwIDUwLDIwIDYwLDIwIEM3MCwyMCA4MCw0MCA5MCwyNSBDMTAwLDEwIDExMCwyMCAxMjAsMzAgQzEzMCwzNSAxNDAsMjAgMTUwLDI1IEMxNjAsMzAgMTcwLDIwIDE4MCwxNSBDMTkwLDEwIDIwMCwyNSAyMDAsMjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+';
    }
  };

  // Cancel logic
  const handleCancelSample = async () => {
    if (!cancelReason.trim()) {
      setCancelError("Please provide a reason for cancellation.");
      return;
    }
    setCancelLoading(true);
    setCancelError(null);
    try {
      await sampleCollectionService.updateSampleCollection(sample.id, {
        status: "cancelled",
        reason_for_cancellation: cancelReason,
      });
      setShowCancel(false);
      setCancelReason("");
      if (typeof onCancelled === 'function') {
        onCancelled();
      } else {
        onClose();
      }
    } catch (err) {
      setCancelError("Failed to cancel sample. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header with Time Lapsed */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              Sample Details
            </h2>
            <p className="text-sm text-gray-500">
              Sample ID: {formatFieldValue(sample.sample_id)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-primary-600">
              Time Lapsed
            </div>
            {(() => {
              const timeLapsed = calculateTimeLapsed(sample.requested_at, sample.status === "delivered" ? sample.delivered_at : null);
              const longestTargetTAT = getLongestTargetTAT(
                tests || [], 
                (sample.priority?.toLowerCase() === 'urgent' ? 'urgent' : 'routine')
              );
              
              let statusColor = 'text-gray-900';
              if (sample.status === "delivered" && longestTargetTAT > 0) {
                const status = getTATStatus(timeLapsed.totalMinutes, longestTargetTAT);
                statusColor = {
                  success: 'text-green-600',
                  warning: 'text-yellow-600',
                  danger: 'text-red-600'
                }[status] || 'text-gray-900';
              }
              
              return (
                <div className={`text-2xl font-bold ${statusColor}`}>
                  {timeLapsed.display}
                  {sample.status === "delivered" && longestTargetTAT > 0 && (
                    <div className="text-sm font-normal mt-1">
                      Target: {Math.floor(longestTargetTAT / 60)}h {longestTargetTAT % 60}m
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-gray-500 hover:text-gray-700">
            <span className="sr-only">Close</span>
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Patient Information */}
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Patient Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Patient Name
                  </p>
                  <p className="text-sm text-gray-900">{sample.patientName || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Patient ID
                  </p>
                  <p className="text-sm text-gray-900">
                    {sample.labPatientId || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Age</p>
                  <p className="text-sm text-gray-900">{sample.Age || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Gender</p>
                  <p className="text-sm text-gray-900">
                    {sample.Gender || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Sample Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Sample Information
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm font-medium text-gray-500">Sample ID</p>
                  <p className="text-sm text-gray-900">
                    {formatFieldValue(sample.accession_number)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Accession Number
                  </p>
                  <p className="text-sm text-gray-900">
                    {formatFieldValue(sample.accession_number)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Medical Aid
                  </p>
                  <p className="text-sm text-gray-900">
                    {sample.OrganizationName || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Center</p>
                  <p className="text-sm text-gray-900">
                    {sample.ReferralName || "N/A"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Sample Type
                  </p>
                  <p className="text-sm text-gray-900">
                    {sample.sample_type || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Priority</p>
                  <p className="text-sm text-gray-900">
                    {sample.priority || "Normal"}
                  </p>
                </div>
              </div>

              {/* Tests Ordered Section */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Tests Ordered
                </h4>
                <div className="space-y-2">
                  {(() => {
                    // Use testCompletionData which now contains the fetched test names
                    const testList = Object.entries(testCompletionData).map(([testID, data]) => ({
                      id: testID,
                      name: data.testName || 'Unknown Test'
                    }));
                    
                    // If no completion data yet, fall back to sample data
                    if (testList.length === 0) {
                      const testIDs = sample.testID ? 
                        (Array.isArray(sample.testID) ? sample.testID : [sample.testID]) : [];
                      const testNames = sample.testName ? 
                        (Array.isArray(sample.testName) ? sample.testName : [sample.testName]) : [];
                      
                      if (testIDs.length > 0) {
                        testIDs.forEach((id, index) => {
                          testList.push({
                            id: id,
                            name: testNames[index] || testNames[0] || 'Loading...'
                          });
                        });
                      }
                    }

                    return testList.length > 0 ? (
                      testList.map((test, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{test.name}</p>
                              <p className="text-xs text-gray-500">Test ID: {test.id}</p>
                              {/* Completion Time Display */}
                              {testCompletionData[test.id] && (
                                <div className="flex items-center mt-1 space-x-2">
                                  <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className={`text-xs ${
                                    testCompletionData[test.id].status === 'completed' ? 'text-green-600' :
                                    testCompletionData[test.id].status === 'overdue' ? 'text-red-600' :
                                    testCompletionData[test.id].status === 'processing' ? 'text-blue-600' :
                                    'text-gray-500'
                                  }`}>
                                    {testCompletionData[test.id].completionTime}
                                  </span>
                                  {testCompletionData[test.id].status === 'completed' && testCompletionData[test.id].targetTATMinutes > 0 && (
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                      testCompletionData[test.id].actualTATMinutes <= testCompletionData[test.id].targetTATMinutes
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700'
                                    }`}>
                                      {testCompletionData[test.id].actualTATMinutes <= testCompletionData[test.id].targetTATMinutes ? 'On Time' : 'Late'}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              sample.priority?.toLowerCase() === 'urgent' ? 'bg-yellow-100 text-yellow-800' :
                              sample.priority?.toLowerCase() === 'emergency' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {sample.priority?.toLowerCase() === 'urgent' ? 'U' :
                               sample.priority?.toLowerCase() === 'emergency' ? 'E' : 'R'}
                            </span>
                            {/* Status Badge */}
                            {testCompletionData[test.id] && (
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                testCompletionData[test.id].status === 'completed' ? 'bg-green-100 text-green-800' :
                                testCompletionData[test.id].status === 'overdue' ? 'bg-red-100 text-red-800' :
                                testCompletionData[test.id].status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {testCompletionData[test.id].status === 'completed' ? 'Completed' :
                                 testCompletionData[test.id].status === 'overdue' ? 'Overdue' :
                                 testCompletionData[test.id].status === 'processing' ? 'Processing' :
                                 'Unknown'}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 bg-white rounded-lg border border-gray-200 text-center">
                        <p className="text-sm text-gray-500">No tests specified</p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>



            {/* Test-specific TAT Analysis */}
            {sample && sample.id && (
              <TestTATAnalysisPanel sampleId={sample.id} />
            )}
          </div>

          {/* Right Column - Timeline */}
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Timeline
              </h3>
              <div className="relative space-y-4">
                {timelineEvents.map((event, index) => (
                  <div key={index} className="relative flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`rounded-full p-2 shadow-sm ${
                          event.isComplete
                            ? event.status === "Completed" ||
                              event.status === "Delivered"
                              ? "bg-green-100 text-green-600"
                              : "bg-blue-100 text-blue-600"
                            : "bg-gray-50 text-gray-300 border border-gray-200"
                        }`}>
                        {getTimelineIcon(event.icon)}
                      </div>
                      {index !== timelineEvents.length - 1 && (
                        <div
                          className={`w-0.5 mt-2 ${
                            event.isComplete
                              ? index === timelineEvents.length - 2 &&
                                timelineEvents[index + 1].isComplete
                                ? "bg-green-300"
                                : "bg-blue-300"
                              : "bg-gray-200"
                          }`}
                          style={{ height: "24px" }}></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div
                        className={`text-sm font-medium ${
                          event.isComplete ? "text-gray-900" : "text-gray-400"
                        }`}>
                        {event.status}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                        <FaClock
                          className={`w-3 h-3 ${
                            event.isComplete ? "text-gray-400" : "text-gray-300"
                          }`}
                        />
                        <span
                          className={event.isComplete ? "" : "text-gray-400"}>
                          {event.time
                            ? formatFieldValue(event.time)
                            : "Pending"}
                        </span>
                      </div>
                      <div
                        className={`text-xs mt-0.5 ${
                          event.isComplete ? "text-gray-600" : "text-gray-400"
                        }`}>
                        {event.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Test Results for completed samples */}
            {(sample.status === "Consolidated All Report Submit" ||
              sample.status === "Consolidated All Report Submit Accepted") && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Test Results
                </h3>
                <div className="space-y-4">
                  {getTestDetails(sample).map((test, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900">
                              {test.name}
                            </h4>
                            <svg
                              className={`w-5 h-5 ${
                                test.isNormal
                                  ? "text-green-500"
                                  : "text-yellow-500"
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                          <p className="text-sm text-gray-500">
                            Completed: {formatFieldValue(test.completedAt)}
                          </p>
                        </div>
                        <span className="px-2 py-1 text-sm rounded-full bg-green-100 text-green-800">
                          {test.status}
                        </span>
                      </div>

                      {/* Test Result Details */}
                      <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Value</p>
                          <p className="font-medium">
                            {test.value} {test.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Reference Range</p>
                          <p className="font-medium">{test.referenceRange}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Action</p>
                          <button
                            onClick={() => {
                              if (test.resultUrl) {
                                handleViewReport(test.resultUrl);
                              } else if (sample.reportURL) {
                                handleViewReport(sample.reportURL);
                              } else {
                                alert("No report URL found for this test");
                              }
                            }}
                            className="text-primary-600 hover:text-primary-700 font-medium">
                            View Full Report
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overall TAT section with more prominent styling */}
            {(sample.status === "Consolidated All Report Submit" ||
              sample.status === "Consolidated All Report Submit Accepted" ||
              sample.status === "delivered") && (
              <div className="mt-12 pt-6 border-t-2 border-gray-200">
                <div className="bg-white rounded-lg p-6 shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">
                        Overall Turnaround Time
                      </h4>
                      <p className="text-sm text-gray-500 mt-1">
                        From request to{" "}
                        {sample.status === "delivered"
                          ? "delivery"
                          : "completion"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-primary-600">
                        {calculateOverallTAT(
                          sample.requested_at,
                          sample.status === "delivered"
                            ? sample.delivered_at
                            : sample.date_created
                        )}
                      </p>
                      <div className="mt-3 space-y-2">
                        <p className="text-sm text-gray-500 flex justify-end items-center gap-2">
                          <FaClock className="w-4 h-4 text-gray-400" />
                          <span>
                            Started: {formatFieldValue(sample.requested_at)}
                          </span>
                        </p>
                        <p className="text-sm text-gray-500 flex justify-end items-center gap-2">
                          <FaCheckCircle className="w-4 h-4 text-green-500" />
                          <span>
                            {sample.status === "delivered"
                              ? `Delivered: ${formatFieldValue(
                                  sample.delivered_at
                                )}`
                              : `Completed: ${formatFieldValue(
                                  sample.date_created
                                )}`}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex justify-end space-x-3">
          {sample?.status === "collected" && (
            <button
              onClick={() => setShowScanner(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              disabled={scanning}>
              {scanning ? "Processing..." : "Scan Barcode"}
            </button>
          )}
          {sample?.document && (
            <button
              onClick={() => {
                setPdfURL(sample.document);
                setShowPDFPreview(true);
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              View Request Form
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            Close
          </button>
          {/* Only show Print Details for non-completed/non-delivered samples */}
          {!(sample.status === "completed" || sample.status === "delivered") && (
            <button
              onClick={handlePrintDetails}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              Print Details
            </button>
          )}
          {/* Show View Result for completed/delivered samples and only for management roles */}
          {(sample.status === "completed" || sample.status === "delivered") && canViewResult && (
            <button
              onClick={() => {
                // Use reportURL if available, otherwise fall back to previous approach
                if (sample.reportURL) {
                  handleViewReport(sample.reportURL);
                } else if (typeof sample.sample_id?.[0] === 'string') {
                  handleViewReport(`/results/${sample.sample_id[0]}/full-report`);
                } else {
                  alert("No report URL found for this sample");
                }
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              View Result
            </button>
          )}
          {(sample.status === "Consolidated All Report Submit" ||
            sample.status === "Consolidated All Report Submit Accepted") && (
            <button
              onClick={() => {
                // Use reportURL if available, otherwise fall back to previous approach
                if (sample.reportURL) {
                  handleViewReport(sample.reportURL);
                } else if (typeof sample.sample_id?.[0] === 'string') {
                  handleViewReport(`/results/${sample.sample_id[0]}/full-report`);
                } else {
                  alert("No report URL found for this sample");
                }
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              View Complete Report
            </button>
          )}
          {sample.status === "delivered" && (
            <button
              onClick={handleGenerateSummary}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              View Summary
            </button>
          )}
          {canCancel && sample && sample.status !== "cancelled" && (
            <>
              {!showCancel ? (
                <button
                  onClick={() => setShowCancel(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  type="button"
                >
                  Cancel Sample
                </button>
              ) : (
                <div className="flex flex-col items-end space-y-2 w-64">
                  <textarea
                    className="w-full border rounded p-2 text-sm"
                    rows={3}
                    placeholder="Reason for cancellation..."
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    disabled={cancelLoading}
                  />
                  {cancelError && (
                    <div className="text-xs text-red-600">{cancelError}</div>
                  )}
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCancelSample}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                      disabled={cancelLoading}
                      type="button"
                    >
                      {cancelLoading ? "Cancelling..." : "Confirm Cancel"}
                    </button>
                    <button
                      onClick={() => { setShowCancel(false); setCancelReason(""); setCancelError(null); }}
                      className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs"
                      disabled={cancelLoading}
                      type="button"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {scanError && (
          <div className="mt-2 text-sm text-red-600">{scanError}</div>
        )}

        {/* Success Message */}
        {isRegistered && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
            <div className="text-center">
              <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto" />
              <h3 className="mt-2 text-xl font-semibold text-gray-900">
                Sample Registered Successfully
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                The sample has been registered and moved to the registered tab
              </p>
            </div>
          </div>
        )}

        {/* Barcode Scanner Modal */}
        {showScanner && (
          <BarcodeScannerModal
            onClose={() => setShowScanner(false)}
            onScanSuccess={handleScanSuccess}
          />
        )}

        {showPDFPreview && (
          <PDFPreviewModal
            url={pdfURL}
            onClose={() => setShowPDFPreview(false)}
            download
            print
          />
        )}
      </div>
    </div>
  );
}

