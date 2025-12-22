import { useEffect, useState, useRef } from 'react';
import RequestDetailsModal from './RequestDetailsModal';
import { TableControls } from '../common/TableControls';
import { Pagination } from '../common/Pagination';
import { PDFViewer } from '../common/PDFViewer';
import { Modal } from '../common/Modal';
import ExcelJS from 'exceljs';
import { collection, query, where, orderBy, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { eventService, EVENTS } from '../../services/eventService';
import { useCollectionRequests } from '../../hooks/queries/frontdesk/useCollectionRequests';
import { useQueryClient } from '@tanstack/react-query';

// Define CollectionRequest type if it's not available from firebase import
interface CollectionRequest {
  id: string;
  sample_id?: string;
  status: string;
  priority: string;
  requested_at: Date;
  created_at: Date;
  center_name: string;
  center_address?: string;
  caller_name?: string;
  caller_number?: string;
  notes?: string;
  document?: string;
  assigned_driver?: {
    name: string;
  };
  [key: string]: string | number | boolean | object | undefined | null | Date;
}

export default function PendingRequestsTable() {
  const [requests, setRequests] = useState<CollectionRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<CollectionRequest | null>(null);
  const [startDate, setStartDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [endDate, setEndDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return today;
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [statuses] = useState(['pending', 'accepted collection', 'collected', 'registered', 'received', 'completed', 'delivered', 'cancelled']);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const queryClient = useQueryClient();
  const { data: initialRequests = [], isLoading: loading } = useCollectionRequests({ start: startDate, end: endDate });
  
  // Initialize requests from hook data only on first load, then snapshot listener takes over
  // Using a ref to track if we've initialized to prevent infinite loops
  const initializedFromHookRef = useRef(false);
  useEffect(() => {
    if (!initializedFromHookRef.current && initialRequests.length > 0 && requests.length === 0) {
      setRequests(initialRequests);
      initializedFromHookRef.current = true;
    }
  }, [initialRequests.length]); // Only depend on length, not the array itself

  useEffect(() => {
    setIsInitialLoad(false);
    
    // Subscribe to sample requested and walk-in registered events
    const sampleRequestUnsubscribe = eventService.subscribe(EVENTS.SAMPLE_REQUESTED, () => {
      console.log('Sample requested event received - refreshing data');
      queryClient.invalidateQueries({ queryKey: ['frontdesk', 'collectionRequests'] });
    });
    
    const walkInUnsubscribe = eventService.subscribe(EVENTS.WALK_IN_REGISTERED, () => {
      console.log('Walk-in patient registered event received - refreshing data');
      queryClient.invalidateQueries({ queryKey: ['frontdesk', 'collectionRequests'] });
    });
    
    return () => {
      sampleRequestUnsubscribe();
      walkInUnsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isInitialLoad) return;
    
    // First, build the query
    const collectionRequestsRef = collection(db, "collectionRequests");
    let q;
    
    try {
      q = query(
        collectionRequestsRef,
        where("requested_at", ">=", startDate),
        where("requested_at", "<=", endDate),
        orderBy("requested_at", "desc")
      );
    } catch (error) {
      console.error("Error creating query:", error);
      // Fallback to a simpler query if there's an issue with the date filters
      q = query(
        collectionRequestsRef,
        orderBy("created_at", "desc")
      );
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedRequests: CollectionRequest[] = [];
      snapshot.forEach((doc) => {
        updatedRequests.push({ id: doc.id, ...doc.data() } as CollectionRequest);
      });
      setRequests(updatedRequests);
    }, (error) => {
      console.error("Error listening to collection requests:", error);
      setError("Failed to listen to collection requests");
    });
    
    return () => unsubscribe();
  }, [startDate, endDate, isInitialLoad]);

  const filteredRequests = requests || [];
  const filteredByStatus = statusFilter 
    ? filteredRequests.filter(req => req && req.status === statusFilter)
    : filteredRequests;

  // Sorting logic
  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev && prev.key === key) {
        // Toggle direction
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  function getSortArrow(key: string) {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
  }

  // Apply sorting to filteredByStatus
  const sortedRequests = [...filteredByStatus];
  if (sortConfig) {
    sortedRequests.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortConfig.direction === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }
      // fallback to string compare
      return sortConfig.direction === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  }

  const totalPages = itemsPerPage === -1 ? 1 : Math.ceil(filteredByStatus.length / itemsPerPage);
  const paginatedRequests = itemsPerPage === -1
    ? sortedRequests
    : sortedRequests.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      );

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (format === 'pdf') {
      const pdfUrl = await generatePDF(filteredByStatus);
      setPdfUrl(pdfUrl);
      setShowPdfPreview(true);
    } else {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sample Requests');
      
      if (filteredByStatus.length > 0) {
        const headers = Object.keys(filteredByStatus[0]);
        worksheet.addRow(headers);
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
        
        filteredByStatus.forEach(item => {
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
      link.download = 'SampleRequests.xlsx';
      link.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const handleDateRangeChange = (dates: [Date, Date]) => {
    if (!dates || !Array.isArray(dates)) {
      console.error("Invalid date range format received:", dates);
      return;
    }
    
    const [start, end] = dates;
    
    if (start) {
      const startDate = new Date(start);
      startDate.setHours(0, 0, 0, 0);
      setStartDate(startDate);
    }
    
    if (end) {
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);
      setEndDate(endDate);
    }
    
    fetchRequestsByDateRange(start, end);
  };

  const fetchRequestsByDateRange = async (start: Date, end: Date) => {
    try {
      setError(null);
      
      if (!start || !end) {
        // If no dates provided, invalidate queries to refetch
        queryClient.invalidateQueries({ queryKey: ['frontdesk', 'collectionRequests'] });
        return;
      }
      
      const startDate = new Date(start);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);
      
      const collectionRequestsRef = collection(db, "collectionRequests");
      
      let q;
      try {
        q = query(
          collectionRequestsRef,
          where("created_at", ">=", startDate),
          where("created_at", "<=", endDate),
          orderBy("created_at", "desc")
        );
      } catch (error) {
        console.error("Error creating date range query:", error);
        // Fallback to a simpler query
        q = query(
          collectionRequestsRef,
          orderBy("created_at", "desc")
        );
      }
      
      const snapshot = await getDocs(q);
      const fetchedRequests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CollectionRequest[];
      
      setRequests(fetchedRequests || []);
    } catch (err) {
      console.error("Error fetching requests by date range:", err);
      setError("Failed to fetch requests by date range");
    }
  };

  return (
    <>
      <div className="bg-white shadow rounded-lg">
        <TableControls
          onSearch={() => {}}
          onDateRangeChange={(start: Date | null, end: Date | null) => {
            if (start && end) handleDateRangeChange([start, end]);
          }}
          onExport={handleExport}
        />

        <div className="px-4 py-5 sm:p-6">
          {loading && <div className="text-center py-4">Loading...</div>}
          
          {error && (
            <div className="text-red-600 text-center py-4">
              {error}
              <button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['frontdesk', 'collectionRequests'] })}
                className="ml-2 text-primary-600 hover:text-primary-500"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && requests.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg font-medium">No sample requests found</p>
              <p className="text-sm mt-2">No requests for the selected date range</p>
            </div>
          )}

          {requests.length > 0 && (
            <div className="mt-4">
              <div className="flex gap-4 mb-4 items-center justify-between">
                <div className="flex gap-4 items-center">
                  <div>
                    <label className="text-sm text-gray-700 mr-2">Filter by Status:</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="rounded-md border border-gray-300 px-3 py-2"
                    >
                      <option value="">All Statuses ({requests.length})</option>
                      {statuses.map((status) => {
                        const count = requests.filter(r => r.status === status).length;
                        return (
                          <option key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)} ({count})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-700 mr-2">Show:</label>
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
                      className="rounded-md border border-gray-300 px-3 py-2"
                    >
                      {[20, 40, 60, 80, 100].map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                      <option value="all">All</option>
                    </select>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  {statusFilter 
                    ? `Showing ${filteredByStatus.length} ${statusFilter} request${filteredByStatus.length !== 1 ? 's' : ''}`
                    : `Showing ${filteredByStatus.length} request${filteredByStatus.length !== 1 ? 's' : ''} for today`
                  }
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th
                        className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('accession_number')}
                      >
                        Accession Number{getSortArrow('accession_number')}
                      </th>
                      <th
                        className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('center_name')}
                      >
                        Center Name{getSortArrow('center_name')}
                      </th>
                      <th
                        className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('requested_at')}
                      >
                        Requested At{getSortArrow('requested_at')}
                      </th>
                      <th
                        className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('assigned_driver')}
                      >
                        Assigned Driver{getSortArrow('assigned_driver')}
                      </th>
                      <th
                        className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('priority')}
                      >
                        Priority{getSortArrow('priority')}
                      </th>
                      <th
                        className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('status')}
                      >
                        Status{getSortArrow('status')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedRequests.map((request) => (
                      <tr 
                        key={request.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedRequest(request)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.accession_number || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.center_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(request.requested_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.assigned_driver?.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                            ${request.priority === 'urgent' ? 'bg-yellow-100 text-yellow-800' : 
                              request.priority === 'emergency' ? 'bg-red-100 text-red-800' :
                              'bg-green-100 text-green-800'}`}>
                            {request.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusStyle(request.status)}`}>
                            {request.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>

      <RequestDetailsModal
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        request={selectedRequest}
      />

      <Modal
        isOpen={showPdfPreview}
        onClose={() => setShowPdfPreview(false)}
        title="PDF Preview"
      >
        <div className="h-[600px]">
          <PDFViewer url={pdfUrl} />
        </div>
        <div className="mt-4 flex justify-end gap-4">
          <button
            onClick={() => setShowPdfPreview(false)}
            className="px-4 py-2 text-sm text-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={() => downloadPDF(pdfUrl)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg"
          >
            Download PDF
          </button>
        </div>
      </Modal>
    </>
  );
}

function getStatusStyle(status: string): string {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800',
    'accepted collection': 'bg-blue-100 text-blue-800',
    collected: 'bg-green-100 text-green-800',
    registered: 'bg-purple-100 text-purple-800',
    received: 'bg-indigo-100 text-indigo-800',
    completed: 'bg-green-200 text-green-900',
    delivered: 'bg-blue-200 text-blue-900',
    cancelled: 'bg-red-100 text-red-800',
  };
  return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
}

async function generatePDF(data: CollectionRequest[]): Promise<string> {
  // Implementation would go here but for simplicity returning empty string
  console.log('Generating PDF for', data.length, 'requests');
  return '';
}

function downloadPDF(url: string) {
  // Implementation would go here
  console.log('Downloading PDF from URL:', url);
  window.open(url, '_blank');
}
