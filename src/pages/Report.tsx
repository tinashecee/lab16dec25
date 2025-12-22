import React, { useState, useEffect, useMemo } from 'react';
import { Users, Wallet, Settings, Activity, FileText, ClipboardList, Beaker, AlertCircle, FileType } from 'lucide-react';
import { getDriverHandoverSummary, getDriverCollectionSummary, getCenterCollectionSummary, getRegistrationSummary, getStaffLeaveSummary, getTATAnalysisReport, getTestSummaryReport, getLeaveRequestsSummary, getUserActivityLog } from '../services/reportService';
import type { TATRecord } from '../services/reportService';
import { DateRangePicker } from '../components/common/DateRangePicker';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Select from 'react-select';
import { 
  useDriverHandoverSummary,
  useDriverCollectionSummary,
  useCenterCollectionSummary,
  useRegistrationSummary,
  useLeaveRequestsSummary,
  useTATAnalysisReport as useTATAnalysisReportQuery,
  useTestSummaryReport as useTestSummaryReportQuery,
  useUserActivityLog as useUserActivityLogQuery,
  useStaffLeaveSummary as useStaffLeaveSummaryQuery
} from '../hooks/queries/reports/useReports';

interface Report {
  id: string;
  title: string;
  description: string;
  category: 'hr' | 'finance' | 'admin' | 'it';
  lastUpdated: string;
  content: string;
}

// Updated interface to include fields from collectionRequests
interface HandoverRecord extends Record<string, unknown> {
  id: string;
  handedoverAt: string;
  handedOverBy: string;
  handedOverTo: string;
  center_name?: string;
  patient_name?: string;
  status?: string;
  accessionNumber?: string;
}

// Add interface for modal row
interface TestSampleRow {
  accessionNumber: string;
  date: Date | null;
  patientName: string;
  center: string;
  requestedAt: Date | null;
  receivedAt: Date | null;
  completedAt: Date | null;
  isUrgent?: boolean;
}

interface ActivityLogRow {
  id: string;
  user: string;
  action: string;
  details: string;
  timestamp: string;
  ip: string;
}

interface StaffLeaveSummary extends Record<string, string | number> {
  no: number;
  name: string;
  dateJoined: string;
  accrued: number;
  taken: number;
  balance: number;
}

interface LeaveRequestsSummary extends Record<string, string | number> {
  no: number;
  name: string;
  leaveType: string;
  requestDate: string;
  approvalDate: string;
  period: string;
  days: number;
  status: string;
}

type LeaveSortKey = keyof StaffLeaveSummary;
type LeaveRequestSortKey = keyof LeaveRequestsSummary;

const reports: Report[] = [
  {
    id: 'hr-1',
    title: 'Staff Leave Summary',
    description: 'Overview of leave balance and utilization',
    category: 'hr',
    lastUpdated: '2025-05-10',
    content: 'Detailed staff leave report content...'
  },
  {
    id: 'hr-2',
    title: 'Leave Requests Summary',
    description: 'Overview of all leave requests by staff member',
    category: 'hr',
    lastUpdated: '2025-05-12',
    content: 'Leave requests summary report content...'
  },
  {
    id: 'finance-1',
    title: 'Quarterly Financial Report',
    description: 'Financial summary for current quarter',
    category: 'finance',
    lastUpdated: '2025-04-30',
    content: 'Financial report details...'
  },
  {
    id: 'admin-1',
    title: 'Driver Handover Summary',
    description: 'Recent driver handovers',
    category: 'admin',
    lastUpdated: '2025-05-12',
    content: 'Driver handover details...'
  },
  {
    id: 'it-1',
    title: 'System Usage Report',
    description: 'System usage statistics',
    category: 'it',
    lastUpdated: '2025-05-12',
    content: 'System usage details...'
  },
  {
    id: 'admin-2',
    title: 'Driver Collections Summary',
    description: 'Summary of collections performed by drivers',
    category: 'admin',
    lastUpdated: '2025-05-12',
    content: 'Driver collections summary report content...'
  },
  {
    id: 'admin-3',
    title: 'Center Collections Summary',
    description: 'Analysis of collections by collection center',
    category: 'admin',
    lastUpdated: '2025-05-12',
    content: 'Center collections summary report content...'
  },
  {
    id: 'admin-4',
    title: 'Registration',
    description: 'Detailed analysis of sample registrations by staff member',
    category: 'admin',
    lastUpdated: '2025-05-12',
    content: 'Registrations analysis report content...'
  },
  {
    id: 'admin-5',
    title: 'Task Handover Summary',
    description: 'Overview of task assignments and handovers',
    category: 'admin',
    lastUpdated: '2025-05-12',
    content: 'Task handover summary report content...'
  },
  {
    id: 'hr-3',
    title: 'Staff Loans Summary',
    description: 'Overview of active loans and repayment status',
    category: 'hr',
    lastUpdated: '2025-05-12',
    content: 'Staff loans summary report content...'
  },
  {
    id: 'finance-2',
    title: 'Inventory Listing',
    description: 'Current inventory status and valuation',
    category: 'finance',
    lastUpdated: '2025-05-12',
    content: 'Inventory listing report content...'
  },
  {
    id: 'finance-3',
    title: 'Inventory Movement Summary',
    description: 'Analysis of inventory receipts, issues, and adjustments',
    category: 'finance',
    lastUpdated: '2025-05-12',
    content: 'Inventory movement summary report content...'
  },
  {
    id: 'admin-6',
    title: 'TAT Analysis',
    description: 'Turnaround time analysis for delivered tests',
    category: 'admin',
    lastUpdated: '2025-05-12',
    content: 'TAT analysis report content...'
  },
  {
    id: 'admin-7',
    title: 'Tests Summary',
    description: 'Summary of tests for completed and delivered samples',
    category: 'admin',
    lastUpdated: '2025-05-12',
    content: 'Tests summary report content...'
  },
  {
    id: 'it-2',
    title: 'User Activity Log',
    description: 'Audit trail of all user activities in the system',
    category: 'it',
    lastUpdated: '2025-05-12',
    content: 'User activity log report content...'
  },
];

// Utility for CSV export
function exportToCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const separator = ',';
  const keys = Object.keys(rows[0]);
  const csvContent = [
    keys.join(separator),
    ...rows.map(row => keys.map(k => '"' + (row[k] !== undefined ? String(row[k]) : '') + '"').join(separator))
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Utility for PDF export
function exportToPdf(filename: string, rows: Record<string, unknown>[], title: string) {
  if (!rows.length) return;
  
  // Create PDF document
  const doc = new jsPDF();
  
  // Set primary color
  const primaryColor = [250, 74, 64]; // #FA4A40
  
  // Add logo
  try {
    const logoUrl = '/images/logo.png';
    doc.addImage(logoUrl, 'PNG', 14, 10, 30, 15);
  } catch (error) {
    console.error('Error adding logo to PDF:', error);
  }
  
  // Add title
  doc.setFontSize(18);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(title, 50, 20);
  
  // Add date
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
  
  // Get headers from the first row and format them
  const headers = Object.keys(rows[0]).map(header => {
    // Special formatting for Staff Leave Summary headers
    if (filename === 'staff_leave_summary.pdf') {
      const headerMap: Record<string, string> = {
        'no': 'No.',
        'name': 'Name',
        'dateJoined': 'Date Joined',
        'accrued': 'Leave Accrued',
        'taken': 'Leave Taken',
        'balance': 'Leave Balance'
      };
      return headerMap[header] || header;
    }
    return header;
  });
  
  // Transform data for the table
  const data = rows.map(row => {
    return Object.entries(row).map(([key, value]) => {
      // Format numbers to 2 decimal places for Staff Leave Summary
      if (filename === 'staff_leave_summary.pdf' && ['accrued', 'taken', 'balance'].includes(key)) {
        return typeof value === 'number' ? value.toFixed(2) : value;
      }
      return value;
    });
  });
  
  // Create table
  autoTable(doc, {
    startY: 35,
    head: [headers],
    body: data,
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248]
    },
  });
  
  // Save the PDF
  doc.save(filename);
}

// Icon mapping for reports
const reportIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'hr': Users,
  'finance': Wallet,
  'admin-1': Activity,
  'admin-2': ClipboardList,
  'admin-3': Beaker,
  'admin-4': FileText,
  'admin-5': AlertCircle,
  'it': Settings,
};

const Report = () => {
  const { role, loading: userLoading } = useCurrentUser();
  const allowedRoles = [
    'IT Specialist',
    'Finance Manager',
    'Admin Manager',
    'Finance Executive',
    'Managing Pathologist',
  ];
  const [activeTab, setActiveTab] = useState<'hr' | 'finance' | 'admin' | 'it'>('hr');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [handoverData, setHandoverData] = useState<HandoverRecord[]>([]);
  const [collectionSummary, setCollectionSummary] = useState<{ name: string; collections: number; deliveries: number }[]>([]);
  const [collectionSummaryLoading, setCollectionSummaryLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [centerSummary, setCenterSummary] = useState<{ center_name: string; total_samples: number }[]>([]);
  const [centerSummaryLoading, setCenterSummaryLoading] = useState(false);
  const [showReportList, setShowReportList] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [registrationSummary, setRegistrationSummary] = useState<{ registered_by: string; total_registrations: number }[]>([]);
  const [registrationSummaryLoading, setRegistrationSummaryLoading] = useState(false);
  const [staffLeaveSummary, setStaffLeaveSummary] = useState<StaffLeaveSummary[]>([]);
  const [staffLeaveSummaryLoading, setStaffLeaveSummaryLoading] = useState(false);
  const [leaveRequestsSummary, setLeaveRequestsSummary] = useState<LeaveRequestsSummary[]>([]);
  const [leaveRequestsSummaryLoading, setLeaveRequestsSummaryLoading] = useState(false);
  const [tatAnalysis, setTatAnalysis] = useState<TATRecord[]>([]);
  const [tatAnalysisLoading, setTatAnalysisLoading] = useState(false);
  const [leaveSortKey, setLeaveSortKey] = useState<LeaveSortKey>('name');
  const [leaveSortOrder, setLeaveSortOrder] = useState<'asc' | 'desc'>('asc');
  const [leaveRequestSortKey, setLeaveRequestSortKey] = useState<LeaveRequestSortKey>('name');
  const [leaveRequestSortOrder, setLeaveRequestSortOrder] = useState<'asc' | 'desc'>('asc');
  const [tatSortKey, setTatSortKey] = useState<keyof TATRecord>('requested_at');
  const [tatSortOrder, setTatSortOrder] = useState<'asc' | 'desc'>('desc');
  // --- Sorting state and logic for all reports ---
  // Driver Handover
  const [handoverSortKey, setHandoverSortKey] = useState<string>('handedoverAt');
  const [handoverSortOrder, setHandoverSortOrder] = useState<'asc' | 'desc'>('desc');
  function sortHandoverData(data: HandoverRecord[]): HandoverRecord[] {
    return [...data].sort((a, b) => {
      const aVal = a[handoverSortKey];
      const bVal = b[handoverSortKey];
      if (handoverSortKey === 'handedoverAt') {
        const aDate = aVal ? new Date(aVal as string).getTime() : 0;
        const bDate = bVal ? new Date(bVal as string).getTime() : 0;
        return handoverSortOrder === 'asc' ? aDate - bDate : bDate - aDate;
      }
      return handoverSortOrder === 'asc'
        ? String(aVal ?? '').localeCompare(String(bVal ?? ''))
        : String(bVal ?? '').localeCompare(String(aVal ?? ''));
    });
  }

  // ----- TanStack Query hooks for cached reports -----
  const startFilter = dateRange[0] ?? undefined;
  const endFilter = dateRange[1] ?? undefined;

  const handoverQuery = useDriverHandoverSummary(startFilter, endFilter);
  const driverCollectionQuery = useDriverCollectionSummary(startFilter, endFilter);
  const centerCollectionQuery = useCenterCollectionSummary(startFilter, endFilter);
  const registrationQuery = useRegistrationSummary(startFilter, endFilter);
  const staffLeaveSummaryQuery = useStaffLeaveSummaryQuery(startFilter, endFilter);
  const leaveRequestsQuery = useLeaveRequestsSummary(startFilter, endFilter);
  const tatAnalysisQuery = useTATAnalysisReportQuery(startFilter, endFilter);
  const testSummaryQuery = useTestSummaryReportQuery(startFilter, endFilter);
  const userActivityQuery = useUserActivityLogQuery(startFilter, endFilter);

  // Sync hook data into local state used by the UI
  useEffect(() => {
    if (selectedReport?.id === 'admin-1' && handoverQuery.data) {
      setHandoverData(handoverQuery.data as HandoverRecord[]);
      setLoading(handoverQuery.isLoading);
    }
  }, [selectedReport, handoverQuery.data, handoverQuery.isLoading]);

  useEffect(() => {
    if (selectedReport?.id === 'admin-2' && driverCollectionQuery.data) {
      setCollectionSummary(driverCollectionQuery.data as any[]);
      setCollectionSummaryLoading(driverCollectionQuery.isLoading);
    }
  }, [selectedReport, driverCollectionQuery.data, driverCollectionQuery.isLoading]);

  useEffect(() => {
    if (selectedReport?.id === 'admin-3' && centerCollectionQuery.data) {
      setCenterSummary(centerCollectionQuery.data as any[]);
      setCenterSummaryLoading(centerCollectionQuery.isLoading);
    }
  }, [selectedReport, centerCollectionQuery.data, centerCollectionQuery.isLoading]);

  useEffect(() => {
    if (selectedReport?.id === 'admin-4' && registrationQuery.data) {
      setRegistrationSummary(registrationQuery.data as any[]);
      setRegistrationSummaryLoading(registrationQuery.isLoading);
    }
  }, [selectedReport, registrationQuery.data, registrationQuery.isLoading]);

  useEffect(() => {
    if (selectedReport?.id === 'hr-1' && staffLeaveSummaryQuery.data) {
      setStaffLeaveSummary(staffLeaveSummaryQuery.data as any[]);
      setStaffLeaveSummaryLoading(staffLeaveSummaryQuery.isLoading);
    }
  }, [selectedReport, staffLeaveSummaryQuery.data, staffLeaveSummaryQuery.isLoading]);

  useEffect(() => {
    if (selectedReport?.id === 'hr-2' && leaveRequestsQuery.data) {
      setLeaveRequestsSummary(leaveRequestsQuery.data as any[]);
      setLeaveRequestsSummaryLoading(leaveRequestsQuery.isLoading);
    }
  }, [selectedReport, leaveRequestsQuery.data, leaveRequestsQuery.isLoading]);

  useEffect(() => {
    if (selectedReport?.id === 'admin-6' && tatAnalysisQuery.data) {
      setTatAnalysis(tatAnalysisQuery.data as any[]);
      setTatAnalysisLoading(tatAnalysisQuery.isLoading);
    }
  }, [selectedReport, tatAnalysisQuery.data, tatAnalysisQuery.isLoading]);

  // Test summary is transformed further down; we just manage loading separately when selected
  useEffect(() => {
    if (selectedReport?.id !== 'admin-7') return;
    setTestSummaryLoading(testSummaryQuery.isLoading);
    if (!testSummaryQuery.data) return;
    // Group tests by test name instead of test ID
    const groupedByName: Record<string, { testIDs: string[]; count: number; testName: string }> = {};
    testSummaryQuery.data.forEach((test: any) => {
      const { testID, testName, count } = test;
      if (!groupedByName[testName]) {
        groupedByName[testName] = { testIDs: [testID], testName, count };
      } else {
        groupedByName[testName].testIDs.push(testID);
        groupedByName[testName].count += count;
      }
    });
    const groupedData = Object.values(groupedByName).map(group => ({
      testID: group.testIDs.join(','),
      testName: group.testName,
      count: group.count
    }));
    setTestSummary(groupedData);
  }, [selectedReport, testSummaryQuery.isLoading, testSummaryQuery.data]);

  // User activity log data from query
  useEffect(() => {
    if (selectedReport?.id !== 'it-2') return;
    setActivityLogLoading(userActivityQuery.isLoading);
    if (!userActivityQuery.data) return;
    const data = userActivityQuery.data as ActivityLogRow[];
    setActivityLogData(data);
    const uniqueUsers = Array.from(new Set(data.map((r) => r.user).filter(Boolean)));
    setActivityLogUserOptions(uniqueUsers.map((u) => ({ value: u, label: u })));
    const uniqueTypes = Array.from(new Set(data.map((r) => r.action).filter(Boolean)));
    setActivityLogTypeOptions(uniqueTypes.map((t) => ({ value: t, label: t.replace(/_/g, ' ') })));
  }, [selectedReport, userActivityQuery.isLoading, userActivityQuery.data]);
  function handleHandoverSort(key: string) {
    if (handoverSortKey === key) {
      setHandoverSortOrder(order => (order === 'asc' ? 'desc' : 'asc'));
    } else {
      setHandoverSortKey(key);
      setHandoverSortOrder(key === 'handedoverAt' ? 'desc' : 'asc');
    }
  }
  // Driver Collections
  const [collectionSortKey, setCollectionSortKey] = useState<string>('collections');
  const [collectionSortOrder, setCollectionSortOrder] = useState<'asc' | 'desc'>('desc');
  function sortCollectionData(data: { name: string; collections: number; deliveries: number }[]): typeof data {
    return [...data].sort((a, b) => {
      const aVal = a[collectionSortKey as keyof typeof a];
      const bVal = b[collectionSortKey as keyof typeof b];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return collectionSortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return collectionSortOrder === 'asc'
        ? String(aVal ?? '').localeCompare(String(bVal ?? ''))
        : String(bVal ?? '').localeCompare(String(aVal ?? ''));
    });
  }
  function handleCollectionSort(key: string) {
    if (collectionSortKey === key) {
      setCollectionSortOrder(order => (order === 'asc' ? 'desc' : 'asc'));
    } else {
      setCollectionSortKey(key);
      setCollectionSortOrder(key === 'collections' ? 'desc' : 'asc');
    }
  }
  // Center Collections
  const [centerSortKey, setCenterSortKey] = useState<string>('total_samples');
  const [centerSortOrder, setCenterSortOrder] = useState<'asc' | 'desc'>('desc');
  function sortCenterData(data: { center_name: string; total_samples: number }[]): typeof data {
    return [...data].sort((a, b) => {
      const aVal = a[centerSortKey as keyof typeof a];
      const bVal = b[centerSortKey as keyof typeof b];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return centerSortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return centerSortOrder === 'asc'
        ? String(aVal ?? '').localeCompare(String(bVal ?? ''))
        : String(bVal ?? '').localeCompare(String(aVal ?? ''));
    });
  }
  function handleCenterSort(key: string) {
    if (centerSortKey === key) {
      setCenterSortOrder(order => (order === 'asc' ? 'desc' : 'asc'));
    } else {
      setCenterSortKey(key);
      setCenterSortOrder(key === 'total_samples' ? 'desc' : 'asc');
    }
  }
  // Registration
  const [registrationSortKey, setRegistrationSortKey] = useState<string>('total_registrations');
  const [registrationSortOrder, setRegistrationSortOrder] = useState<'asc' | 'desc'>('desc');
  function sortRegistrationData(data: { registered_by: string; total_registrations: number }[]): typeof data {
    return [...data].sort((a, b) => {
      const aVal = a[registrationSortKey as keyof typeof a];
      const bVal = b[registrationSortKey as keyof typeof b];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return registrationSortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return registrationSortOrder === 'asc'
        ? String(aVal ?? '').localeCompare(String(bVal ?? ''))
        : String(bVal ?? '').localeCompare(String(aVal ?? ''));
    });
  }
  function handleRegistrationSort(key: string) {
    if (registrationSortKey === key) {
      setRegistrationSortOrder(order => (order === 'asc' ? 'desc' : 'asc'));
    } else {
      setRegistrationSortKey(key);
      setRegistrationSortOrder(key === 'total_registrations' ? 'desc' : 'asc');
    }
  }
      // Staff Leave
    const handleLeaveSort = (key: LeaveSortKey) => {
    if (key === leaveSortKey) {
      setLeaveSortOrder(leaveSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setLeaveSortKey(key);
      setLeaveSortOrder('asc');
    }
  };
  function sortLeaveData(data: StaffLeaveSummary[]): StaffLeaveSummary[] {
    return [...data].sort((a, b) => {
      const aVal = a[leaveSortKey];
      const bVal = b[leaveSortKey];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return leaveSortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return leaveSortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      return 0;
    });
  }

  function sortLeaveRequestsData(data: LeaveRequestsSummary[]): LeaveRequestsSummary[] {
    return [...data].sort((a, b) => {
      const aVal = a[leaveRequestSortKey];
      const bVal = b[leaveRequestSortKey];
      
      // Special handling for date fields
      if (leaveRequestSortKey === 'requestDate' || leaveRequestSortKey === 'approvalDate') {
        // Skip comparison if values are 'N/A' or not valid dates
        if (aVal === 'N/A' || bVal === 'N/A') {
          if (aVal === 'N/A' && bVal !== 'N/A') return leaveRequestSortOrder === 'asc' ? 1 : -1;
          if (aVal !== 'N/A' && bVal === 'N/A') return leaveRequestSortOrder === 'asc' ? -1 : 1;
          return 0;
        }
        
        // Parse UK format dates (DD/MM/YYYY)
        const aParts = String(aVal).split('/');
        const bParts = String(bVal).split('/');
        
        if (aParts.length === 3 && bParts.length === 3) {
          // Create date objects in format MM/DD/YYYY for comparison
          const aDate = new Date(`${aParts[1]}/${aParts[0]}/${aParts[2]}`);
          const bDate = new Date(`${bParts[1]}/${bParts[0]}/${bParts[2]}`);
          
          if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
            return leaveRequestSortOrder === 'asc' ? 
              aDate.getTime() - bDate.getTime() : 
              bDate.getTime() - aDate.getTime();
          }
        }
      }
      
      // Special handling for period field which contains date ranges
      if (leaveRequestSortKey === 'period') {
        // Extract start dates from period strings (format: "DD/MM/YYYY - DD/MM/YYYY")
        const aStartStr = String(aVal).split(' - ')[0];
        const bStartStr = String(bVal).split(' - ')[0];
        
        if (aStartStr && bStartStr) {
          const aParts = aStartStr.split('/');
          const bParts = bStartStr.split('/');
          
          if (aParts.length === 3 && bParts.length === 3) {
            // Create date objects in format MM/DD/YYYY for comparison
            const aDate = new Date(`${aParts[1]}/${aParts[0]}/${aParts[2]}`);
            const bDate = new Date(`${bParts[1]}/${bParts[0]}/${bParts[2]}`);
            
            if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
              return leaveRequestSortOrder === 'asc' ? 
                aDate.getTime() - bDate.getTime() : 
                bDate.getTime() - aDate.getTime();
            }
          }
        }
      }
      
      // Default string comparison
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return leaveRequestSortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      
      // Number comparison
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return leaveRequestSortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      return 0;
    });
  }

  function handleLeaveRequestSort(key: LeaveRequestSortKey) {
    if (key === leaveRequestSortKey) {
      setLeaveRequestSortOrder(leaveRequestSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setLeaveRequestSortKey(key);
      setLeaveRequestSortOrder('asc');
    }
  }

  const [testSummary, setTestSummary] = useState<{ testID: string; testName: string; count: number }[]>([]);
  const [testSummaryLoading, setTestSummaryLoading] = useState(false);
  const [testSummarySortKey, setTestSummarySortKey] = useState<string>('count');
  const [testSummarySortOrder, setTestSummarySortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  function sortTestSummaryData(data: { testID: string; testName: string; count: number }[]): typeof data {
    return [...data].sort((a, b) => {
      const aVal = a[testSummarySortKey as keyof typeof a];
      const bVal = b[testSummarySortKey as keyof typeof b];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return testSummarySortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return testSummarySortOrder === 'asc'
        ? String(aVal ?? '').localeCompare(String(bVal ?? ''))
        : String(bVal ?? '').localeCompare(String(aVal ?? ''));
    });
  }
  function handleTestSummarySort(key: string) {
    if (testSummarySortKey === key) {
      setTestSummarySortOrder(order => (order === 'asc' ? 'desc' : 'asc'));
    } else {
      setTestSummarySortKey(key);
      setTestSummarySortOrder(key === 'count' ? 'desc' : 'asc');
    }
  }
  // Modal state for test details
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testModalLoading, setTestModalLoading] = useState(false);
  const [testModalData, setTestModalData] = useState<TestSampleRow[]>([]);
  const [testModalStats, setTestModalStats] = useState<{ total: number; uniquePatients: number; uniqueCenters: number; normalTests: number; urgentTests: number; normalTAT: string; urgentTAT: string; averageNormalTAT: string; averageUrgentTAT: string; overallAverageTAT: string; normalTatxScore: string; urgentTatxScore: string; overallTatxScore: string; dateRange: string } | null>(null);
  const [testModalTest, setTestModalTest] = useState<{ testID: string; testName: string } | null>(null);
  // Modal sorting state and logic
  const [modalSortKey, setModalSortKey] = useState<'accessionNumber' | 'date' | 'patientName' | 'center' | 'requestedAt' | 'receivedAt' | 'completedAt'>('date');
  const [modalSortOrder, setModalSortOrder] = useState<'asc' | 'desc'>('asc');
  function sortModalData(data: TestSampleRow[]): TestSampleRow[] {
    return [...data].sort((a, b) => {
      const aVal = a[modalSortKey];
      const bVal = b[modalSortKey];
      if (modalSortKey === 'date' || modalSortKey === 'requestedAt' || modalSortKey === 'receivedAt' || modalSortKey === 'completedAt') {
        const aTime = aVal instanceof Date && !isNaN(aVal.getTime()) ? aVal.getTime() : 0;
        const bTime = bVal instanceof Date && !isNaN(bVal.getTime()) ? bVal.getTime() : 0;
        return modalSortOrder === 'asc' ? aTime - bTime : bTime - aTime;
      }
      return modalSortOrder === 'asc'
        ? String(aVal ?? '').localeCompare(String(bVal ?? ''))
        : String(bVal ?? '').localeCompare(String(aVal ?? ''));
    });
  }
  function handleModalSort(key: 'accessionNumber' | 'date' | 'patientName' | 'center' | 'requestedAt' | 'receivedAt' | 'completedAt') {
    if (modalSortKey === key) {
      setModalSortOrder(order => (order === 'asc' ? 'desc' : 'asc'));
    } else {
      setModalSortKey(key);
      setModalSortOrder('asc');
    }
  }

  // Type guard for Date
  function isDate(val: unknown): val is Date {
    return val instanceof Date && !isNaN(val.getTime());
  }

  // Calculate TAT between two dates and format it
  function calculateTAT(startTime: Date | null, endTime: Date | null): string {
    console.log('calculateTAT input:', { 
      startTime: startTime ? startTime.toString() : null,
      endTime: endTime ? endTime.toString() : null,
      startValid: startTime && isDate(startTime),
      endValid: endTime && isDate(endTime)
    });
    
    if (!startTime || !endTime || !isDate(startTime) || !isDate(endTime)) return "N/A";

    const start = startTime.getTime();
    const end = endTime.getTime();
    
    if (end < start) return "N/A"; // Invalid time range
    
    const diffInSeconds = Math.floor((end - start) / 1000);
    const days = Math.floor(diffInSeconds / (3600 * 24));
    const hours = Math.floor((diffInSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((diffInSeconds % 3600) / 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    
    return parts.length > 0 ? parts.join(" ") : "< 1m";
  }

  // Handler to open modal and fetch data
  const handleTestRowClick = async (testIDsString: string, testName: string) => {
    setTestModalTest({ testID: testIDsString, testName });
    setTestModalOpen(true);
    setTestModalLoading(true);
    setTestModalData([]);
    setTestModalStats(null);
    try {
      // Parse multiple test IDs if they exist
      const testIDs = testIDsString.split(',');
      
      // First, try to get the test details from the 'tests' collection to get TAT values
      let normalTAT = 4; // Default normal TAT in hours
      let urgentTAT = 4;  // Default urgent TAT in hours
      
      try {
        // Get TAT values for the first test ID in the group (since they are the same test type)
        const testsQuery = query(collection(db, 'tests'), where('testID', '==', testIDs[0]));
        const testSnapshot = await getDocs(testsQuery);
        if (!testSnapshot.empty) {
          const testData = testSnapshot.docs[0].data();
          if (testData.normalTAT && !isNaN(Number(testData.normalTAT))) {
            normalTAT = Number(testData.normalTAT);
          }
          if (testData.urgentTAT && !isNaN(Number(testData.urgentTAT))) {
            urgentTAT = Number(testData.urgentTAT);
          }
          console.log(`Found test in collection. Normal TAT: ${normalTAT}h, Urgent TAT: ${urgentTAT}h`);
        }
      } catch (error) {
        console.error('Error getting test details:', error);
      }
      
      const snapshot = await getDocs(collection(db, 'collectionRequests'));
      const rows: TestSampleRow[] = [];
      let minDate: Date | null = null;
      let maxDate: Date | null = null;
      const patientSet = new Set<string>();
      const centerSet = new Set<string>();
      
      // Separate statistics for normal and urgent tests
      let normalTests = 0;
      let urgentTests = 0;
      let totalNormalTargetTAT = 0;
      let totalUrgentTargetTAT = 0;
      let totalNormalActualTAT = 0;
      let totalUrgentActualTAT = 0;
      let normalTestsWithTAT = 0;
      let urgentTestsWithTAT = 0;
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        // Handle array or string for testID/testName
        const docTestIDs = Array.isArray(data.testID) ? data.testID : [data.testID];
        const docTestNames = Array.isArray(data.testName) ? data.testName : [data.testName];
        
        // Match by test name or test ID
        let matches = false;
        
        if (docTestIDs.length === docTestNames.length) {
          for (let i = 0; i < docTestNames.length; i++) {
            // Match if either test name matches exactly OR the test ID is one of our target IDs
            if (docTestNames[i] === testName || testIDs.includes(String(docTestIDs[i]))) {
              matches = true;
              break;
            }
          }
        } else {
          // Fallback: match by name
          if (docTestNames.includes(testName)) {
            matches = true;
          } else {
            // Or by any of the IDs
            for (const id of testIDs) {
              if (docTestIDs.map(String).includes(id)) {
                matches = true;
                break;
              }
            }
          }
        }
        
        if (matches && (data.status === 'completed' || data.status === 'delivered')) {
          console.log('Raw data object:', JSON.stringify(data));
          console.log('Matched test data:', {
            testID: testIDs.join(','),
            testName,
            accessionNumber: data.accessionNumber || data.accession_number,
            status: data.status,
            requested_at: data.requested_at,
            created_at: data.created_at,
            collection_time: data.collection_time,
            received_at: data.received_at, 
            lab_received_at: data.lab_received_at,
            receivedTime: data.receivedTime,
            registration_time: data.registration_time,
            completed_at: data.completed_at,
            completedTime: data.completedTime,
            processing_completion_time: data.processing_completion_time,
            delivered_at: data.delivered_at
          });
          
          const date = data.requested_at || data.created_at || data.delivered_at;
          const dateObj: Date | null = date ? new Date(date) : null;
          if (isDate(dateObj)) {
            if (!minDate || dateObj < minDate) minDate = dateObj;
            if (!maxDate || dateObj > maxDate) maxDate = dateObj;
          }
          if (data.patient_name) patientSet.add(data.patient_name);
          
          // Extract timestamps for different stages with additional field fallbacks and Firestore timestamp handling
          const getDateFromField = (field: unknown): Date | null => {
            if (!field) return null;
            
            // Handle Firestore Timestamp objects that have seconds and nanoseconds
            if (field && typeof field === 'object' && field !== null && 
                'seconds' in field && 'nanoseconds' in field && 
                typeof field.seconds === 'number' && typeof field.nanoseconds === 'number') {
              // Convert Firestore Timestamp to milliseconds
              return new Date(field.seconds * 1000 + field.nanoseconds / 1000000);
            }
            
            // Handle string or number timestamps
            try {
              const dateObj = new Date(field as string | number);
              return isNaN(dateObj.getTime()) ? null : dateObj;
            } catch (e) {
              console.error('Failed to parse date:', e);
              return null;
            }
          };
          
          const requestedAt = getDateFromField(data.requested_at) || 
                              getDateFromField(data.created_at) || 
                              getDateFromField(data.collection_time);
          
          const receivedAt = getDateFromField(data.received_at) || 
                             getDateFromField(data.lab_received_at) || 
                             getDateFromField(data.receivedTime) || 
                             getDateFromField(data.registration_time);
          
          const completedAt = getDateFromField(data.completed_at) || 
                              getDateFromField(data.delivered_at) || 
                              getDateFromField(data.completedTime) || 
                              getDateFromField(data.processing_completion_time);
          
          console.log('Parsed dates:', {
            requestedAt,
            requestedAt_valid: requestedAt && !isNaN(requestedAt.getTime()),
            receivedAt,
            receivedAt_valid: receivedAt && !isNaN(receivedAt.getTime()),
            completedAt,
            completedAt_valid: completedAt && !isNaN(completedAt.getTime())
          });
          
          // Determine if the test is urgent based on priority field
          const isUrgent = data.priority === 'urgent' || data.priority === 'URGENT' || 
                          data.priority === 'STAT' || data.priority === 'stat' ||
                          data.urgencyLevel === 'urgent' || data.urgencyLevel === 'URGENT';
          
          // Set appropriate target TAT based on urgency
          const targetTAT = isUrgent ? urgentTAT : normalTAT;
          
          // Validate dates
          const validRequestedAt = requestedAt && isDate(requestedAt) ? requestedAt : null;
          const validReceivedAt = receivedAt && isDate(receivedAt) ? receivedAt : null;
          const validCompletedAt = completedAt && isDate(completedAt) ? completedAt : null;
          
          // Capture centers for statistics
          if (data.center_name) centerSet.add(data.center_name);
          
          // Calculate actual TAT for statistics if we have valid dates
          if (validReceivedAt && validCompletedAt) {
            const actualTATMillis = validCompletedAt.getTime() - validReceivedAt.getTime();
            const actualTATHours = actualTATMillis / (1000 * 60 * 60);
            
            if (isUrgent) {
              urgentTests++;
              totalUrgentTargetTAT += targetTAT;
              totalUrgentActualTAT += actualTATHours;
              urgentTestsWithTAT++;
            } else {
              normalTests++;
              totalNormalTargetTAT += targetTAT;
              totalNormalActualTAT += actualTATHours;
              normalTestsWithTAT++;
            }
          } else {
            // Count tests without complete TAT information
            if (isUrgent) {
              urgentTests++;
            } else {
              normalTests++;
            }
          }
          
          rows.push({
            accessionNumber: data.accessionNumber || data.accession_number || '',
            date: dateObj,
            patientName: data.patient_name || '',
            center: data.center_name || '',
            requestedAt: validRequestedAt,
            receivedAt: validReceivedAt,
            completedAt: validCompletedAt,
            isUrgent: isUrgent
          });
        }
      });
      
      // Calculate average TAT and TATx scores
      const averageNormalTAT = normalTestsWithTAT > 0 ? (totalNormalActualTAT / normalTestsWithTAT).toFixed(1) : "N/A";
      const averageUrgentTAT = urgentTestsWithTAT > 0 ? (totalUrgentActualTAT / urgentTestsWithTAT).toFixed(1) : "N/A";
      
      // TATx Score for normal tests
      let normalTatxScore = "N/A";
      if (normalTestsWithTAT > 0 && totalNormalActualTAT > 0) {
        // Cap TATx score at 100%
        const tatxValue = Math.min(100, (totalNormalTargetTAT / totalNormalActualTAT) * 100);
        normalTatxScore = tatxValue.toFixed(1) + "%";
      }
      
      // TATx Score for urgent tests
      let urgentTatxScore = "N/A";
      if (urgentTestsWithTAT > 0 && totalUrgentActualTAT > 0) {
        // Cap TATx score at 100%
        const tatxValue = Math.min(100, (totalUrgentTargetTAT / totalUrgentActualTAT) * 100);
        urgentTatxScore = tatxValue.toFixed(1) + "%";
      }
      
      // Overall average TAT (both normal and urgent)
      const totalTestsWithTAT = normalTestsWithTAT + urgentTestsWithTAT;
      const overallAverageTAT = totalTestsWithTAT > 0 ? 
        ((totalNormalActualTAT + totalUrgentActualTAT) / totalTestsWithTAT).toFixed(1) : "N/A";
      
      // Overall TATx Score
      let overallTatxScore = "N/A";
      if (totalTestsWithTAT > 0 && (totalNormalActualTAT + totalUrgentActualTAT) > 0) {
        // Cap overall TATx score at 100%
        const tatxValue = Math.min(100, ((totalNormalTargetTAT + totalUrgentTargetTAT) / (totalNormalActualTAT + totalUrgentActualTAT)) * 100);
        overallTatxScore = tatxValue.toFixed(1) + "%";
      }
      
      console.log('Final rows data:', rows.map(row => ({
        accessionNumber: row.accessionNumber,
        requestedAt: row.requestedAt ? row.requestedAt.toISOString() : null,
        receivedAt: row.receivedAt ? row.receivedAt.toISOString() : null,
        completedAt: row.completedAt ? row.completedAt.toISOString() : null,
        isUrgent: row.isUrgent
      })));
      
      setTestModalData(rows);
      setTestModalStats({
        total: rows.length,
        uniquePatients: patientSet.size,
        uniqueCenters: centerSet.size,
        normalTests: normalTests,
        urgentTests: urgentTests,
        normalTAT: normalTAT.toString(),
        urgentTAT: urgentTAT.toString(),
        averageNormalTAT: averageNormalTAT.toString(),
        averageUrgentTAT: averageUrgentTAT.toString(),
        overallAverageTAT: overallAverageTAT.toString(),
        normalTatxScore: normalTatxScore,
        urgentTatxScore: urgentTatxScore,
        overallTatxScore: overallTatxScore,
        dateRange:
          isDate(minDate) && isDate(maxDate)
            ? `${(minDate as Date).toLocaleDateString()} - ${(maxDate as Date).toLocaleDateString()}`
            : ''
      });
    } catch {
      setTestModalData([]);
      setTestModalStats(null);
    } finally {
      setTestModalLoading(false);
    }
  };

  // Export modal data as CSV
  function exportModalToCsv() {
    if (!testModalData.length) return;
    const rows = testModalData.map(row => ({
      'Accession Number': row.accessionNumber,
      'Date': row.date ? row.date.toLocaleString() : '',
      'Patient Name': row.patientName,
      'Center': row.center,
      'Urgency': row.isUrgent ? 'Urgent' : 'Normal',
      'Target TAT': row.isUrgent ? `${testModalStats?.urgentTAT}h` : `${testModalStats?.normalTAT}h`,
      'Time Requested': row.requestedAt ? row.requestedAt.toLocaleString() : '',
      'Time Received in Lab': row.receivedAt ? row.receivedAt.toLocaleString() : '',
      'Time Completed': row.completedAt ? row.completedAt.toLocaleString() : '',
      'Total TAT': calculateTAT(row.receivedAt, row.completedAt)
    }));
    exportToCsv(
      `${testModalTest?.testName || 'test'}_samples.csv`,
      rows
    );
  }

  // Export modal data as PDF
  function exportModalToPdf() {
    if (!testModalData.length || !testModalStats || !testModalTest) return;
    
    // Create PDF document in landscape orientation
    const doc = new jsPDF({ orientation: 'landscape' });
    
    // Set primary color
    const primaryColor = [250, 74, 64]; // #FA4A40
    
    // Add logo
    try {
      const logoUrl = '/images/logo.png';
      doc.addImage(logoUrl, 'PNG', 14, 10, 30, 15);
    } catch (error) {
      console.error('Error adding logo to PDF:', error);
    }
    
    // Add title
    doc.setFontSize(18);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`${testModalTest.testName} Samples`, 50, 20);
    
    // Add date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 50, 30);
    
    // Add quick stats
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text('Test Statistics:', 14, 40);
    
    doc.setFontSize(10);
    let yPosition = 50;
    const stats = [
      `Total Samples: ${testModalStats.total}`,
      `Date Range: ${testModalStats.dateRange || 'N/A'}`,
      `Unique Patients: ${testModalStats.uniquePatients}`,
      `Unique Centers: ${testModalStats.uniqueCenters}`,
      `Normal Tests: ${testModalStats.normalTests} (Target TAT: ${testModalStats.normalTAT}h, Avg: ${testModalStats.averageNormalTAT}h, TATx: ${testModalStats.normalTatxScore})`,
      `Urgent Tests: ${testModalStats.urgentTests} (Target TAT: ${testModalStats.urgentTAT}h, Avg: ${testModalStats.averageUrgentTAT}h, TATx: ${testModalStats.urgentTatxScore})`,
      `Overall Avg TAT: ${testModalStats.overallAverageTAT}h, TATx: ${testModalStats.overallTatxScore}`
    ];
    
    stats.forEach(stat => {
      doc.text(stat, 14, yPosition);
      yPosition += 6;
    });
    
    // Create table with data
    const headers = [
      'Accession Number', 'Date', 'Patient Name', 'Center', 'Urgency',
      'Time Requested', 'Time Received', 'Time Completed', 'Total TAT'
    ];
    
    const data = testModalData.map(row => [
      row.accessionNumber,
      row.date ? row.date.toLocaleString() : '',
      row.patientName,
      row.center,
      row.isUrgent ? 'Urgent' : 'Normal',
      row.requestedAt ? row.requestedAt.toLocaleString() : '',
      row.receivedAt ? row.receivedAt.toLocaleString() : '',
      row.completedAt ? row.completedAt.toLocaleString() : '',
      calculateTAT(row.receivedAt, row.completedAt)
    ]);
    
    // Create table starting below the stats
    autoTable(doc, {
      startY: yPosition + 5,
      head: [headers],
      body: data,
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      alternateRowStyles: {
        fillColor: [248, 248, 248]
      },
    });
    
    // Save the PDF
    doc.save(`${testModalTest.testName}_samples.pdf`);
  }

  const [activityLogData, setActivityLogData] = useState<ActivityLogRow[]>([]);
  const [activityLogLoading, setActivityLogLoading] = useState(false);
  const [activityLogPage, setActivityLogPage] = useState(1);
  const [activityLogPageSize, setActivityLogPageSize] = useState(20);
  const [activityLogUser, setActivityLogUser] = useState<string | null>(null);
  const [activityLogUserOptions, setActivityLogUserOptions] = useState<{ value: string; label: string }[]>([]);
  const [activityLogUserSearch, setActivityLogUserSearch] = useState('');
  const [activityLogType, setActivityLogType] = useState<string | null>(null);
  const [activityLogTypeOptions, setActivityLogTypeOptions] = useState<{ value: string; label: string }[]>([]);

  // Function to fetch data for the current report with optional date filtering.
  // Most major reports now use cached hooks; this remains as a placeholder for any
  // report types not yet migrated to hooks.
  const fetchReportData = async (useeDateFilter = false, customStartDate?: Date, customEndDate?: Date) => {
    if (!selectedReport) return;
    console.log(`🎯 fetchReportData called for ${selectedReport.id} with useeDateFilter: ${useeDateFilter}`);
    const startDate = useeDateFilter ? (customStartDate ?? dateRange[0] ?? undefined) : undefined;
    const endDate = useeDateFilter ? (customEndDate ?? dateRange[1] ?? undefined) : undefined;
    if (useeDateFilter) {
      console.log('📅 Date filter parameters:', { startDate, endDate });
    } else {
      console.log('🚫 No date filter applied (initial load)');
    }
    // All main reports are handled via hooks; nothing to fetch here.
    return;
  };

  // Load initial data when report is selected
  useEffect(() => {
    fetchReportData(false); // Initial load without date filter
  }, [selectedReport]);

  // Memoized filtered and paginated activity log data
  const filteredActivityLogData = useMemo(() => {
    let data = activityLogData;
    if (activityLogUser) {
      data = data.filter(row => row.user === activityLogUser);
    }
    if (activityLogType) {
      data = data.filter(row => row.action === activityLogType);
    }
    return data;
  }, [activityLogData, activityLogUser, activityLogType]);

  const totalActivityLogPages = activityLogPageSize === -1 ? 1 : Math.ceil(filteredActivityLogData.length / activityLogPageSize);
  const paginatedActivityLogData = useMemo(() => {
    if (activityLogPageSize === -1) return filteredActivityLogData;
    const start = (activityLogPage - 1) * activityLogPageSize;
    return filteredActivityLogData.slice(start, start + activityLogPageSize);
  }, [filteredActivityLogData, activityLogPage, activityLogPageSize]);

  const pageSizeOptions = [20, 40, 60, 80, 100, -1];
  const pageSizeLabels = { 20: '20', 40: '40', 60: '60', 80: '80', 100: '100', [-1]: 'All' };

  if (userLoading) {
    return <div className="flex items-center justify-center h-full text-gray-400">Loading...</div>;
  }
  if (!allowedRoles.includes(role)) {
    return (
      <div className="flex items-center justify-center h-full text-red-500 font-semibold text-lg">
        Access Denied: You do not have permission to view this section.
      </div>
    );
  }

  const filteredReports = reports.filter(report => report.category === activeTab);

  // Filtering logic for search only (date filtering is now handled at service level)
  function filterData<T extends Record<string, unknown>>(data: T[]): T[] {
    if (!searchTerm) return data;
    
    return data.filter(row => 
      Object.values(row).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }

  // Sorting function for TAT analysis
  function sortTatData(data: TATRecord[]): TATRecord[] {
    return [...data].sort((a, b) => {
      const aVal = a[tatSortKey];
      const bVal = b[tatSortKey];
      if (aVal === undefined || bVal === undefined) return 0;
      if (tatSortKey === 'requested_at' || tatSortKey === 'delivered_at') {
        // Date sort
        const aDate = aVal ? new Date(aVal as string).getTime() : 0;
        const bDate = bVal ? new Date(bVal as string).getTime() : 0;
        return tatSortOrder === 'asc' ? aDate - bDate : bDate - aDate;
      }
      // String/number sort
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return tatSortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return tatSortOrder === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }

  // Click handler for sortable headers
  function handleTatSort(key: keyof TATRecord) {
    if (tatSortKey === key) {
      setTatSortOrder(order => (order === 'asc' ? 'desc' : 'asc'));
    } else {
      setTatSortKey(key);
      setTatSortOrder(key === 'requested_at' ? 'desc' : 'asc');
    }
  }

  // Add search filter function
  const filterModalData = (data: TestSampleRow[]) => {
    if (!searchQuery) return data;
    
    return data.filter(row => 
      row.accessionNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.center?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Add pagination logic
  const getPaginatedData = (data: TestSampleRow[]) => {
    const filteredData = filterModalData(data);
    const startIndex = (currentPage - 1) * itemsPerPage;
    return {
      paginatedData: filteredData.slice(startIndex, startIndex + itemsPerPage),
      totalPages: Math.ceil(filteredData.length / itemsPerPage),
      totalItems: filteredData.length
    };
  };

  return (
    <div className="flex flex-col h-full p-4 bg-gray-50">
      {/* Tab Navigation */}
      <div className="flex border-b mb-4 bg-white rounded-t-lg shadow-sm">
        <button
          className={`px-4 py-2 flex items-center gap-2 ${activeTab === 'hr' ? 'border-b-2 border-primary-500 text-primary-600 bg-primary-50' : 'text-secondary-500 hover:bg-gray-50'}`}
          onClick={() => { setActiveTab('hr'); setShowReportList(true); setSelectedReport(null); }}
        >
          <Users className="w-4 h-4" /> HR
        </button>
        <button
          className={`px-4 py-2 flex items-center gap-2 ${activeTab === 'finance' ? 'border-b-2 border-primary-500 text-primary-600 bg-primary-50' : 'text-secondary-500 hover:bg-gray-50'}`}
          onClick={() => { setActiveTab('finance'); setShowReportList(true); setSelectedReport(null); }}
        >
          <Wallet className="w-4 h-4" /> Finance
        </button>
        <button
          className={`px-4 py-2 flex items-center gap-2 ${activeTab === 'admin' ? 'border-b-2 border-primary-500 text-primary-600 bg-primary-50' : 'text-secondary-500 hover:bg-gray-50'}`}
          onClick={() => { setActiveTab('admin'); setShowReportList(true); setSelectedReport(null); }}
        >
          <Activity className="w-4 h-4" /> Admin
        </button>
        <button
          className={`px-4 py-2 flex items-center gap-2 ${activeTab === 'it' ? 'border-b-2 border-primary-500 text-primary-600 bg-primary-50' : 'text-secondary-500 hover:bg-gray-50'}`}
          onClick={() => { setActiveTab('it'); setShowReportList(true); setSelectedReport(null); }}
        >
          <Settings className="w-4 h-4" /> IT
        </button>
      </div>

      <div className="flex flex-1 gap-4 mt-4">
        {/* Report List (collapsible) */}
        {showReportList && (
          <div className="w-full md:w-1/3 border rounded-lg p-4 bg-white shadow-md overflow-y-auto">
            <h3 className="font-semibold mb-4 text-primary-700">Available Reports</h3>
            <div className="space-y-2">
              {filteredReports.map(report => {
                const Icon = reportIcons[report.id] || reportIcons[report.category] || FileText;
                return (
                  <div
                    key={report.id}
                    className={`p-3 rounded-lg cursor-pointer flex items-center gap-3 transition-colors ${selectedReport?.id === report.id ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-50'}`}
                    onClick={() => { setSelectedReport(report); setShowReportList(false); }}
                  >
                    <span className="p-2 rounded-lg bg-primary-100 text-primary-600"><Icon className="w-5 h-5" /></span>
                    <div className="flex-1">
                      <h4 className="font-medium text-secondary-900">{report.title}</h4>
                      <p className="text-sm text-secondary-500">{report.description}</p>
                      <p className="text-xs text-secondary-400 mt-1">Last updated: {report.lastUpdated}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Report Content */}
        {!showReportList && (
          <div className="flex-1 border rounded-lg p-4 bg-white shadow-md">
            <button className="mb-4 flex items-center gap-2 text-primary-600 hover:underline" onClick={() => { setShowReportList(true); setSelectedReport(null); }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Back to Reports
            </button>
            {selectedReport && (
              <div>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
                  <div>
                    <h2 className="text-2xl font-bold text-primary-700 flex items-center gap-2">
                      {React.createElement(reportIcons[selectedReport.id] || reportIcons[selectedReport.category] || FileText, { className: 'w-6 h-6 text-primary-500' })}
                      {selectedReport.title}
                    </h2>
                    <p className="text-secondary-600">{selectedReport.description}</p>
                    {dateRange[0] && dateRange[1] && (
                      <div className="mt-2 text-sm text-primary-600 font-medium">
                        Showing data from {dateRange[0].toLocaleDateString()} to {dateRange[1].toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 items-center mt-2 md:mt-0">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <DateRangePicker 
                      value={dateRange}
                      onChange={(startDate, endDate) => {
                        console.log('🔍 DateRangePicker Go button clicked!');
                        console.log('📅 Selected date range:', { startDate, endDate });
                        setDateRange([startDate, endDate]);
                        fetchReportData(true, startDate ?? undefined, endDate ?? undefined); // Pass dates directly to avoid state timing issues
                      }} 
                    />
                    <button
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                      onClick={() => {
                        // Export logic based on report type
                        if (selectedReport.id === 'admin-1') exportToCsv('driver_handover.csv', filterData(handoverData));
                        else if (selectedReport.id === 'admin-2') exportToCsv('driver_collections.csv', filterData(collectionSummary));
                        else if (selectedReport.id === 'admin-3') exportToCsv('center_collections.csv', filterData(centerSummary));
                        else if (selectedReport.id === 'admin-4') exportToCsv('registration_summary.csv', filterData(registrationSummary));
                        else if (selectedReport.id === 'hr-1') exportToCsv('staff_leave_summary.csv', filterData(staffLeaveSummary));
                        else if (selectedReport.id === 'hr-2') exportToCsv('leave_requests_summary.csv', filterData(leaveRequestsSummary));
                        else if (selectedReport.id === 'admin-6') exportToCsv('tat_analysis.csv', filterData(tatAnalysis) as Record<string, unknown>[]);
                        else if (selectedReport.id === 'admin-7') exportToCsv('tests_summary.csv', filterData(testSummary));
                        else if (selectedReport.id === 'it-2') exportToCsv('user_activity_log.csv', filteredActivityLogData.map(row => ({ ...row })));
                        else exportToCsv('report.csv', [{ content: selectedReport.content }]);
                      }}
                    >
                      <FileText className="w-4 h-4" /> Export CSV
                    </button>
                    <button
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                      onClick={() => {
                        // PDF Export logic based on report type
                        if (selectedReport.id === 'admin-1') exportToPdf('driver_handover.pdf', filterData(handoverData), 'Driver Handover Summary');
                        else if (selectedReport.id === 'admin-2') exportToPdf('driver_collections.pdf', filterData(collectionSummary), 'Driver Collections Summary');
                        else if (selectedReport.id === 'admin-3') exportToPdf('center_collections.pdf', filterData(centerSummary), 'Center Collections Summary');
                        else if (selectedReport.id === 'admin-4') exportToPdf('registration_summary.pdf', filterData(registrationSummary), 'Registration Summary');
                        else if (selectedReport.id === 'hr-1') exportToPdf('staff_leave_summary.pdf', filterData(staffLeaveSummary), 'Staff Leave Summary');
                        else if (selectedReport.id === 'hr-2') exportToPdf('leave_requests_summary.pdf', filterData(leaveRequestsSummary), 'Leave Requests Summary');
                        else if (selectedReport.id === 'admin-6') exportToPdf('tat_analysis.pdf', filterData(tatAnalysis) as Record<string, unknown>[], 'TAT Analysis');
                        else if (selectedReport.id === 'admin-7') exportToPdf('tests_summary.pdf', filterData(testSummary), 'Tests Summary');
                        else if (selectedReport.id === 'it-2') exportToPdf('user_activity_log.pdf', filteredActivityLogData.map(row => ({ ...row })), 'User Activity Log');
                        else exportToPdf('report.pdf', [{ content: selectedReport.content }], selectedReport.title);
                      }}
                    >
                      <FileType className="w-4 h-4" /> Export PDF
                    </button>
                  </div>
                </div>
                <div className="border-t pt-4">
                  {selectedReport.id === 'admin-1' ? (
                    loading ? (
                      <div>Loading handover data...</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleHandoverSort('handedoverAt')}>Date {handoverSortKey === 'handedoverAt' && (handoverSortOrder === 'asc' ? '▲' : '▼')}</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleHandoverSort('accessionNumber')}>Accession Number {handoverSortKey === 'accessionNumber' && (handoverSortOrder === 'asc' ? '▲' : '▼')}</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleHandoverSort('handedOverBy')}>Handed Over By {handoverSortKey === 'handedOverBy' && (handoverSortOrder === 'asc' ? '▲' : '▼')}</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleHandoverSort('handedOverTo')}>Handed Over To {handoverSortKey === 'handedOverTo' && (handoverSortOrder === 'asc' ? '▲' : '▼')}</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleHandoverSort('center_name')}>Center {handoverSortKey === 'center_name' && (handoverSortOrder === 'asc' ? '▲' : '▼')}</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleHandoverSort('patient_name')}>Patient {handoverSortKey === 'patient_name' && (handoverSortOrder === 'asc' ? '▲' : '▼')}</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleHandoverSort('status')}>Status {handoverSortKey === 'status' && (handoverSortOrder === 'asc' ? '▲' : '▼')}</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {sortHandoverData(filterData(handoverData)).map((record) => (
                              <tr key={record.id}>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{new Date(record.handedoverAt).toLocaleString()}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{record.accessionNumber || ''}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{record.handedOverBy}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{record.handedOverTo}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{record.center_name || 'N/A'}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{record.patient_name || 'N/A'}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm">
                                  {record.status ? (
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                      record.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                      record.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                                      record.status === 'Pending' ? 'bg-blue-100 text-blue-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {record.status}
                                    </span>
                                  ) : 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  ) : selectedReport.id === 'admin-2' ? (
                    collectionSummaryLoading ? (
                      <div>Loading driver collection summary...</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleCollectionSort('name')}>Driver Name {collectionSortKey === 'name' && (collectionSortOrder === 'asc' ? '▲' : '▼')}</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleCollectionSort('collections')}>Total Collections {collectionSortKey === 'collections' && (collectionSortOrder === 'asc' ? '▲' : '▼')}</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleCollectionSort('deliveries')}>Total Deliveries {collectionSortKey === 'deliveries' && (collectionSortOrder === 'asc' ? '▲' : '▼')}</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {sortCollectionData(filterData(collectionSummary)).map((driver) => (
                              <tr key={driver.name}>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{driver.name}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{driver.collections}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{driver.deliveries}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  ) : selectedReport.id === 'admin-3' ? (
                    centerSummaryLoading ? (
                      <div>Loading center collection summary...</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleCenterSort('center_name')}>Center Name {centerSortKey === 'center_name' && (centerSortOrder === 'asc' ? '▲' : '▼')}</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleCenterSort('total_samples')}>Total Samples {centerSortKey === 'total_samples' && (centerSortOrder === 'asc' ? '▲' : '▼')}</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {sortCenterData(filterData(centerSummary)).map((center) => (
                              <tr key={center.center_name}>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{center.center_name}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{center.total_samples}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  ) : selectedReport.id === 'admin-4' ? (
                    registrationSummaryLoading ? (
                      <div>Loading registration summary...</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleRegistrationSort('registered_by')}>Staff Member {registrationSortKey === 'registered_by' && (registrationSortOrder === 'asc' ? '▲' : '▼')}</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleRegistrationSort('total_registrations')}>Total Registrations {registrationSortKey === 'total_registrations' && (registrationSortOrder === 'asc' ? '▲' : '▼')}</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {sortRegistrationData(filterData(registrationSummary)).map((row) => (
                              <tr key={row.registered_by}>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.registered_by}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.total_registrations}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  ) : selectedReport.id === 'hr-1' ? (
                    staffLeaveSummaryLoading ? (
                      <div>Loading staff leave summary...</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none">No.</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleLeaveSort('name')}>Name {leaveSortKey === 'name' && (leaveSortOrder === 'asc' ? '▲' : '▼')}</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleLeaveSort('dateJoined')}>Date Joined {leaveSortKey === 'dateJoined' && (leaveSortOrder === 'asc' ? '▲' : '▼')}</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleLeaveSort('accrued')}>Leave Accrued {leaveSortKey === 'accrued' && (leaveSortOrder === 'asc' ? '▲' : '▼')}</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleLeaveSort('taken')}>Leave Taken {leaveSortKey === 'taken' && (leaveSortOrder === 'asc' ? '▲' : '▼')}</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleLeaveSort('balance')}>Leave Balance {leaveSortKey === 'balance' && (leaveSortOrder === 'asc' ? '▲' : '▼')}</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {sortLeaveData(staffLeaveSummary).map((row) => (
                              <tr key={row.name}>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.no}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.name}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.dateJoined}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.accrued.toFixed(2)}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.taken.toFixed(2)}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.balance.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  ) : selectedReport.id === 'hr-2' ? (
                    leaveRequestsSummaryLoading ? (
                      <div>Loading leave requests summary...</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleLeaveRequestSort('name')}>Name {leaveRequestSortKey === 'name' && (leaveRequestSortOrder === 'asc' ? '▲' : '▼')}</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleLeaveRequestSort('leaveType')}>Leave Type {leaveRequestSortKey === 'leaveType' && (leaveRequestSortOrder === 'asc' ? '▲' : '▼')}</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleLeaveRequestSort('requestDate')}>Request Date {leaveRequestSortKey === 'requestDate' && (leaveRequestSortOrder === 'asc' ? '▲' : '▼')}</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleLeaveRequestSort('approvalDate')}>Approval Date {leaveRequestSortKey === 'approvalDate' && (leaveRequestSortOrder === 'asc' ? '▲' : '▼')}</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleLeaveRequestSort('period')}>Period {leaveRequestSortKey === 'period' && (leaveRequestSortOrder === 'asc' ? '▲' : '▼')}</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleLeaveRequestSort('days')}>Days {leaveRequestSortKey === 'days' && (leaveRequestSortOrder === 'asc' ? '▲' : '▼')}</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleLeaveRequestSort('status')}>Status {leaveRequestSortKey === 'status' && (leaveRequestSortOrder === 'asc' ? '▲' : '▼')}</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {sortLeaveRequestsData(filterData(leaveRequestsSummary)).map((row) => (
                              <tr key={row.name}>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.name}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.leaveType}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.requestDate}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.approvalDate}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.period}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.days}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm">
                                  {row.status ? (
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                      row.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                      row.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                      row.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                                      row.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                      row.status === 'ISSUED' ? 'bg-purple-100 text-purple-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {row.status}
                                    </span>
                                  ) : 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  ) : selectedReport.id === 'admin-6' ? (
                    tatAnalysisLoading ? (
                      <div>Loading TAT analysis...</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleTatSort('accessionNumber')}>
                                Accession Number {tatSortKey === 'accessionNumber' && (tatSortOrder === 'asc' ? '▲' : '▼')}
                              </th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleTatSort('patient_name')}>
                                Patient {tatSortKey === 'patient_name' && (tatSortOrder === 'asc' ? '▲' : '▼')}
                              </th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleTatSort('center_name')}>
                                Center {tatSortKey === 'center_name' && (tatSortOrder === 'asc' ? '▲' : '▼')}
                              </th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleTatSort('requested_at')}>
                                Requested At {tatSortKey === 'requested_at' && (tatSortOrder === 'asc' ? '▲' : '▼')}
                              </th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleTatSort('delivered_at')}>
                                Delivered At {tatSortKey === 'delivered_at' && (tatSortOrder === 'asc' ? '▲' : '▼')}
                              </th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleTatSort('totalTAT')}>
                                Total TAT {tatSortKey === 'totalTAT' && (tatSortOrder === 'asc' ? '▲' : '▼')}
                              </th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleTatSort('dispatchTime')}>
                                Dispatch {tatSortKey === 'dispatchTime' && (tatSortOrder === 'asc' ? '▲' : '▼')}
                              </th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleTatSort('collectionTime')}>
                                Collection {tatSortKey === 'collectionTime' && (tatSortOrder === 'asc' ? '▲' : '▼')}
                              </th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleTatSort('registrationTime')}>
                                Registration {tatSortKey === 'registrationTime' && (tatSortOrder === 'asc' ? '▲' : '▼')}
                              </th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleTatSort('processingTime')}>
                                Processing {tatSortKey === 'processingTime' && (tatSortOrder === 'asc' ? '▲' : '▼')}
                              </th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleTatSort('deliveryTime')}>
                                Delivery {tatSortKey === 'deliveryTime' && (tatSortOrder === 'asc' ? '▲' : '▼')}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {sortTatData(filterData(tatAnalysis)).map((row) => (
                              <tr key={row.id}>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.accessionNumber || ''}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.patient_name || ''}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.center_name || ''}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.requested_at ? new Date(row.requested_at).toLocaleString() : ''}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.delivered_at ? new Date(row.delivered_at).toLocaleString() : ''}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black font-bold">{row.totalTAT || ''}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.dispatchTime || ''}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.collectionTime || ''}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.registrationTime || ''}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.processingTime || ''}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.deliveryTime || ''}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  ) : selectedReport.id === 'admin-7' ? (
                    testSummaryLoading ? (
                      <div>Loading tests summary...</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleTestSummarySort('testName')}>Test Name {testSummarySortKey === 'testName' && (testSummarySortOrder === 'asc' ? '▲' : '▼')}</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleTestSummarySort('count')}>Count {testSummarySortKey === 'count' && (testSummarySortOrder === 'asc' ? '▲' : '▼')}</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {sortTestSummaryData(filterData(testSummary)).map((row, idx) => (
                              <tr key={row.testName + idx} className="cursor-pointer hover:bg-primary-50" onClick={() => handleTestRowClick(row.testID, row.testName)}>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.testName}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {/* Modal for test details */}
                        {testModalOpen && testModalTest && (
                          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                            <div className="bg-white rounded-lg shadow-lg max-w-6xl w-full p-8 relative max-h-[90vh] flex flex-col">
                              <button 
                                className="absolute top-4 right-4 text-gray-500 hover:text-primary-600" 
                                onClick={() => setTestModalOpen(false)}
                              >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>

                              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2 gap-2">
                                <div>
                                  <h2 className="text-2xl font-bold text-primary-700">{testModalTest.testName}</h2>
                                  {testModalTest.testID.includes(',') && (
                                    <p className="text-sm text-gray-500">Multiple test IDs grouped by name</p>
                                  )}
                                </div>
                                <div className="flex gap-2 mt-2 md:mt-0">
                                  <button className="flex items-center gap-2 px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 text-xs" onClick={exportModalToCsv}>
                                    <FileText className="w-4 h-4" /> Export CSV
                                  </button>
                                  <button className="flex items-center gap-2 px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 text-xs" onClick={exportModalToPdf}>
                                    <FileType className="w-4 h-4" /> Export PDF
                                  </button>
                                </div>
                              </div>

                              {testModalStats && (
                                <div className="mb-6">
                                  {/* TAT Analysis Card with Integrated Statistics */}
                                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-4">
                                    <div className="flex items-center mb-3">
                                      <h4 className="font-semibold text-gray-700">Turn-Around Time Analysis</h4>
                                      <div className="group relative ml-1">
                                        <svg className="w-4 h-4 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div className="absolute z-10 w-64 p-2 -mt-1 text-xs bg-gray-800 text-white rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity left-full ml-2 pointer-events-none">
                                          TATx Score measures test processing efficiency by comparing target vs actual TAT. 
                                          Score = (Target TAT ÷ Actual TAT) × 100%. 
                                          <span className="block mt-1">Rating scale:</span>
                                          <span className="block">• Green (≥100%): Excellent - faster than target</span>
                                          <span className="block">• Yellow (80-99%): Good</span>
                                          <span className="block">• Red (≤79%): Needs improvement</span>
                                          <span className="block mt-1">Maximum score is capped at 100%.</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Quick Stats Row */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                                      <div className="bg-gray-50 rounded-lg p-3">
                                        <div className="flex justify-between items-center">
                                          <span className="text-sm text-gray-500">Total Samples</span>
                                          <span className="text-lg font-semibold text-primary-700">{testModalStats.total}</span>
                                        </div>
                                      </div>
                                      <div className="bg-gray-50 rounded-lg p-3">
                                        <div className="flex justify-between items-center">
                                          <span className="text-sm text-gray-500">Unique Patients</span>
                                          <span className="text-lg font-semibold text-primary-700">{testModalStats.uniquePatients}</span>
                                        </div>
                                      </div>
                                      <div className="bg-gray-50 rounded-lg p-3">
                                        <div className="flex justify-between items-center">
                                          <span className="text-sm text-gray-500">Unique Centers</span>
                                          <span className="text-lg font-semibold text-primary-700">{testModalStats.uniqueCenters}</span>
                                        </div>
                                      </div>
                                      <div className="bg-gray-50 rounded-lg p-3">
                                        <div className="flex justify-between items-center">
                                          <span className="text-sm text-gray-500">Test Distribution</span>
                                          <span className="text-lg font-semibold text-primary-700">
                                            {testModalStats.normalTests}/{testModalStats.urgentTests}
                                            <span className="text-xs text-gray-500 ml-1">(N/U)</span>
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                      <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                          <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Normal</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Urgent</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overall</th>
                                          </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                          <tr>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">Target TAT</td>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">{testModalStats.normalTAT}h</td>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">{testModalStats.urgentTAT}h</td>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">-</td>
                                          </tr>
                                          <tr>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">Average TAT</td>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">{testModalStats.averageNormalTAT}h</td>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">{testModalStats.averageUrgentTAT}h</td>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">{testModalStats.overallAverageTAT}h</td>
                                          </tr>
                                          <tr>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">TATx Score</td>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                                              <span className={`px-2 py-1 rounded-full text-xs ${
                                                testModalStats.normalTatxScore === "N/A" ? "bg-gray-100 text-gray-500" : 
                                                parseFloat(testModalStats.normalTatxScore) >= 100 ? "bg-green-100 text-green-800" : 
                                                parseFloat(testModalStats.normalTatxScore) >= 80 ? "bg-yellow-100 text-yellow-800" : 
                                                "bg-red-100 text-red-800"
                                              }`}>
                                                {testModalStats.normalTatxScore}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                                              <span className={`px-2 py-1 rounded-full text-xs ${
                                                testModalStats.urgentTatxScore === "N/A" ? "bg-gray-100 text-gray-500" : 
                                                parseFloat(testModalStats.urgentTatxScore) >= 100 ? "bg-green-100 text-green-800" : 
                                                parseFloat(testModalStats.urgentTatxScore) >= 80 ? "bg-yellow-100 text-yellow-800" : 
                                                "bg-red-100 text-red-800"
                                              }`}>
                                                {testModalStats.urgentTatxScore}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                                              <span className={`px-2 py-1 rounded-full text-xs ${
                                                testModalStats.overallTatxScore === "N/A" ? "bg-gray-100 text-gray-500" : 
                                                parseFloat(testModalStats.overallTatxScore) >= 100 ? "bg-green-100 text-green-800" : 
                                                parseFloat(testModalStats.overallTatxScore) >= 80 ? "bg-yellow-100 text-yellow-800" : 
                                                "bg-red-100 text-red-800"
                                              }`}>
                                                {testModalStats.overallTatxScore}
                                              </span>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>

                                  {testModalStats.dateRange && (
                                    <div className="mt-3 text-sm text-gray-500 flex items-center">
                                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      Date Range: <span className="font-medium ml-1">{testModalStats.dateRange}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              {testModalLoading ? (
                                <div>Loading...</div>
                              ) : (
                                <div className="flex-1 flex flex-col min-h-0">
                                  {/* Search Bar */}
                                  <div className="mb-4">
                                    <div className="relative">
                                      <input
                                        type="text"
                                        placeholder="Search by accession number, patient name, or center..."
                                        value={searchQuery}
                                        onChange={(e) => {
                                          setSearchQuery(e.target.value);
                                          setCurrentPage(1); // Reset to first page when searching
                                        }}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                      />
                                      <svg
                                        className="absolute right-3 top-2.5 h-5 w-5 text-gray-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                        />
                                      </svg>
                                    </div>
                                  </div>

                                  {/* Table Container */}
                                  <div className="flex-1 overflow-y-auto min-h-0">
                                    <table className="min-w-full divide-y divide-gray-200">
                                      <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                          <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleModalSort('accessionNumber')}>
                                            Accession Number {modalSortKey === 'accessionNumber' && (modalSortOrder === 'asc' ? '▲' : '▼')}
                                          </th>
                                          <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleModalSort('date')}>Date {modalSortKey === 'date' && (modalSortOrder === 'asc' ? '▲' : '▼')}</th>
                                          <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleModalSort('patientName')}>Patient Name {modalSortKey === 'patientName' && (modalSortOrder === 'asc' ? '▲' : '▼')}</th>
                                          <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleModalSort('center')}>Center {modalSortKey === 'center' && (modalSortOrder === 'asc' ? '▲' : '▼')}</th>
                                          <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleModalSort('requestedAt')}>Time Requested {modalSortKey === 'requestedAt' && (modalSortOrder === 'asc' ? '▲' : '▼')}</th>
                                          <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleModalSort('receivedAt')}>Time Received in Lab {modalSortKey === 'receivedAt' && (modalSortOrder === 'asc' ? '▲' : '▼')}</th>
                                          <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer select-none" onClick={() => handleModalSort('completedAt')}>Time Completed {modalSortKey === 'completedAt' && (modalSortOrder === 'asc' ? '▲' : '▼')}</th>
                                          <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider">Total TAT</th>
                                        </tr>
                                      </thead>
                                      <tbody className="bg-white divide-y divide-gray-200">
                                        {getPaginatedData(sortModalData(testModalData)).paginatedData.map((row, i) => (
                                          <tr key={row.accessionNumber + row.patientName + i}>
                                            <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.accessionNumber}</td>
                                            <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.date ? row.date.toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg', hour12: false }) : ''}</td>
                                            <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.patientName}</td>
                                            <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.center}</td>
                                            <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.requestedAt ? row.requestedAt.toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg', hour12: false }) : ''}</td>
                                            <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.receivedAt ? row.receivedAt.toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg', hour12: false }) : ''}</td>
                                            <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.completedAt ? row.completedAt.toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg', hour12: false }) : ''}</td>
                                            <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-primary-700">{calculateTAT(row.receivedAt, row.completedAt)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    {testModalData.length === 0 && (
                                      <div className="text-center text-gray-400 py-4">No samples found for this test.</div>
                                    )}
                                  </div>

                                  {/* Pagination */}
                                  {getPaginatedData(testModalData).totalPages > 1 && (
                                    <div className="mt-4 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                                      <div className="flex flex-1 justify-between sm:hidden">
                                        <button
                                          onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                                          disabled={currentPage === 1}
                                          className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                        >
                                          Previous
                                        </button>
                                        <button
                                          onClick={() => setCurrentPage(page => Math.min(getPaginatedData(testModalData).totalPages, page + 1))}
                                          disabled={currentPage === getPaginatedData(testModalData).totalPages}
                                          className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                        >
                                          Next
                                        </button>
                                      </div>
                                      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                        <div>
                                          <p className="text-sm text-gray-700">
                                            Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                                            <span className="font-medium">
                                              {Math.min(currentPage * itemsPerPage, getPaginatedData(testModalData).totalItems)}
                                            </span> of{' '}
                                            <span className="font-medium">{getPaginatedData(testModalData).totalItems}</span> results
                                          </p>
                                        </div>
                                        <div>
                                          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                            <button
                                              onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                                              disabled={currentPage === 1}
                                              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                                            >
                                              <span className="sr-only">Previous</span>
                                              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                              </svg>
                                            </button>
                                            {Array.from({ length: getPaginatedData(testModalData).totalPages }, (_, i) => i + 1)
                                              .filter(page => {
                                                const totalPages = getPaginatedData(testModalData).totalPages;
                                                return page === 1 || 
                                                       page === totalPages || 
                                                       (page >= currentPage - 1 && page <= currentPage + 1);
                                              })
                                              .map((page, i, arr) => {
                                                if (i > 0 && arr[i - 1] !== page - 1) {
                                                  return [
                                                    <span key={`ellipsis-${page}`} className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">...</span>,
                                                    <button
                                                      key={page}
                                                      onClick={() => setCurrentPage(page)}
                                                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                                        currentPage === page
                                                          ? 'z-10 bg-primary-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600'
                                                          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                                                      }`}
                                                    >
                                                      {page}
                                                    </button>
                                                  ];
                                                }
                                                return (
                                                  <button
                                                    key={page}
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                                      currentPage === page
                                                        ? 'z-10 bg-primary-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600'
                                                        : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                                                    }`}
                                                  >
                                                    {page}
                                                  </button>
                                                );
                                              })}
                                            <button
                                              onClick={() => setCurrentPage(page => Math.min(getPaginatedData(testModalData).totalPages, page + 1))}
                                              disabled={currentPage === getPaginatedData(testModalData).totalPages}
                                              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                                            >
                                              <span className="sr-only">Next</span>
                                              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                              </svg>
                                            </button>
                                          </nav>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  ) : selectedReport.id === 'it-2' ? (
                    activityLogLoading ? (
                      <div>Loading user activity log...</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                          <div className="flex flex-col md:flex-row gap-2 items-center">
                            <Select
                              className="min-w-[220px]"
                              options={activityLogUserOptions}
                              value={activityLogUserOptions.find(opt => opt.value === activityLogUser) || null}
                              onChange={opt => setActivityLogUser(opt ? opt.value : null)}
                              isClearable
                              isSearchable
                              placeholder="Filter by user..."
                              onInputChange={setActivityLogUserSearch}
                              inputValue={activityLogUserSearch}
                              noOptionsMessage={() => activityLogUserSearch ? 'No users found' : 'Type to search users'}
                            />
                            <Select
                              className="min-w-[220px]"
                              options={activityLogTypeOptions}
                              value={activityLogTypeOptions.find(opt => opt.value === activityLogType) || null}
                              onChange={opt => setActivityLogType(opt ? opt.value : null)}
                              isClearable
                              isSearchable
                              placeholder="Filter by activity type..."
                              noOptionsMessage={() => 'No activity types found'}
                            />
                          </div>
                          <div className="flex gap-2 items-center">
                            <label htmlFor="activity-log-page-size" className="text-xs text-secondary-700">Rows per page:</label>
                            <select
                              id="activity-log-page-size"
                              className="px-2 py-1 rounded border border-gray-200 text-xs"
                              value={activityLogPageSize}
                              onChange={e => {
                                const val = Number(e.target.value);
                                setActivityLogPageSize(val);
                                setActivityLogPage(1);
                              }}
                            >
                              {pageSizeOptions.map(opt => (
                                <option key={opt} value={opt}>{pageSizeLabels[opt as 20 | 40 | 60 | 80 | 100 | -1]}</option>
                              ))}
                            </select>
                            <button
                              className="flex items-center gap-2 px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 text-xs"
                              onClick={() => exportToCsv('user_activity_log.csv', filteredActivityLogData.map(row => ({ ...row })))}
                            >
                              <FileText className="w-4 h-4" /> Export CSV
                            </button>
                            <button
                              className="flex items-center gap-2 px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 text-xs"
                              onClick={() => exportToPdf('user_activity_log.pdf', filteredActivityLogData.map(row => ({ ...row })), 'User Activity Log')}
                            >
                              <FileType className="w-4 h-4" /> Export PDF
                            </button>
                          </div>
                        </div>
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider">User</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider">Action</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider">Details</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider">Timestamp</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-black uppercase tracking-wider">IP</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedActivityLogData.map((row) => (
                              <tr key={row.id}>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.user}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.action}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.details}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.timestamp}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-sm text-black">{row.ip}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {filteredActivityLogData.length === 0 && <div className="text-center text-gray-400 py-4">No activity logs found.</div>}
                        {/* Pagination Controls */}
                        {activityLogPageSize !== -1 && totalActivityLogPages > 1 && (
                          <div className="flex justify-between items-center mt-4">
                            <div className="text-xs text-secondary-700">
                              Page {activityLogPage} of {totalActivityLogPages}
                            </div>
                            <div className="flex gap-2">
                              <button
                                className="px-2 py-1 rounded border text-xs bg-white border-gray-200 disabled:opacity-50"
                                onClick={() => setActivityLogPage(p => Math.max(1, p - 1))}
                                disabled={activityLogPage === 1}
                              >
                                Previous
                              </button>
                              <button
                                className="px-2 py-1 rounded border text-xs bg-white border-gray-200 disabled:opacity-50"
                                onClick={() => setActivityLogPage(p => Math.min(totalActivityLogPages, p + 1))}
                                disabled={activityLogPage === totalActivityLogPages}
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  ) : (
                    <div className="prose max-w-none">
                      {selectedReport.content}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Report;