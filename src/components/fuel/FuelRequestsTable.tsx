import { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Filter,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { FuelRequest, FuelRequestStatus } from '../../types/fuel';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import ExcelJS from 'exceljs';
import FuelRequestDetailsModal from './FuelRequestDetailsModal';
import { useFuelRequests } from '../../hooks/queries/fuel/useFuelManagement';
import { useApproveFuelRequest, useRejectFuelRequest } from '../../hooks/mutations/fuelMutations';

interface FuelRequestsTableProps {
  onRefresh?: () => void;
}

export default function FuelRequestsTable({ onRefresh }: FuelRequestsTableProps) {
  const { userData } = useAuth();
  const [statusFilter, setStatusFilter] = useState<FuelRequestStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [selectedRequest, setSelectedRequest] = useState<FuelRequest | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsRequest, setDetailsRequest] = useState<FuelRequest | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // View filter state
  const [viewFilter, setViewFilter] = useState<'all' | 'my_requests' | 'pending_approval' | 'flagged'>('all');

  // Build query filters
  const queryFilters = useMemo(() => {
    const filters: {
      vehicleId?: string;
      driverId?: string;
      status?: FuelRequestStatus;
      startDate?: Date;
      endDate?: Date;
    } = {};

    // If user is a driver, only show their requests
    if (userData?.role === 'Driver') {
      filters.driverId = userData.id;
    }

    if (statusFilter !== 'ALL') {
      filters.status = statusFilter;
    }

    if (dateRange[0] && dateRange[1]) {
      filters.startDate = dateRange[0];
      filters.endDate = dateRange[1];
    }

    return filters;
  }, [statusFilter, dateRange, userData]);

  // Use TanStack Query to fetch requests
  const { data: requests = [], isLoading: loading, error } = useFuelRequests(queryFilters);

  // Mutations
  const approveMutation = useApproveFuelRequest();
  const rejectMutation = useRejectFuelRequest();

  const handleApprove = async () => {
    if (!selectedRequest || !userData) return;

    try {
      await approveMutation.mutateAsync({
        requestId: selectedRequest.id,
        approverId: userData.id,
        approverName: userData.name,
        comments: actionNotes,
      });
      setShowActionModal(false);
      setSelectedRequest(null);
      setActionNotes('');
      onRefresh?.();
    } catch (err) {
      console.error('Error approving request:', err);
      alert(err instanceof Error ? err.message : 'Failed to approve request');
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !userData) return;

    if (!actionNotes.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      await rejectMutation.mutateAsync({
        requestId: selectedRequest.id,
        approverId: userData.id,
        approverName: userData.name,
        comments: actionNotes,
      });
      setShowActionModal(false);
      setSelectedRequest(null);
      setActionNotes('');
      onRefresh?.();
    } catch (err) {
      console.error('Error rejecting request:', err);
      alert(err instanceof Error ? err.message : 'Failed to reject request');
    }
  };

  const getStatusBadge = (status: FuelRequestStatus) => {
    const badges = {
      PENDING: (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </span>
      ),
      APPROVED: (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Approved
        </span>
      ),
      REJECTED: (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          Rejected
        </span>
      ),
      FLAGGED: (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Flagged
        </span>
      ),
    };
    return badges[status];
  };

  const filteredRequests = requests.filter((request) => {
    // Search filter
    const matchesSearch =
      request.vehicle_registration?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.driver_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.id.toLowerCase().includes(searchTerm.toLowerCase());

    // View filter
    let matchesView = true;
    if (viewFilter === 'my_requests' && userData) {
      matchesView = request.driver_id === userData.id;
    } else if (viewFilter === 'pending_approval') {
      matchesView = request.status === 'PENDING' || request.status === 'FLAGGED';
    } else if (viewFilter === 'flagged') {
      matchesView = request.status === 'FLAGGED';
    }

    return matchesSearch && matchesView;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm, dateRange, viewFilter, itemsPerPage]);

  const exportToExcel = async () => {
    const dataToExport = filteredRequests.map((req) => ({
      'Request ID': req.id,
      'Date': req.request_date?.toDate ? format(req.request_date.toDate(), 'yyyy-MM-dd HH:mm') : 'N/A',
      'Vehicle': req.vehicle_registration || 'N/A',
      'Driver': req.driver_name || 'N/A',
      'Odometer Reading': req.odometer_reading?.toLocaleString() || 'N/A',
      'Last Odometer': req.last_odometer_reading?.toLocaleString() || 'N/A',
      'Distance Travelled (km)': req.distance_travelled?.toLocaleString() || 'N/A',
      'Requested Fuel (L)': req.fuel_requested_litres?.toFixed(2) || 'N/A',
      'Expected Fuel (L)': req.expected_fuel_litres?.toFixed(2) || 'N/A',
      'Variance (%)': req.variance_percentage?.toFixed(2) || 'N/A',
      'Status': req.status,
      'Approved By': req.approved_by_name || 'N/A',
      'Approved At': req.approved_at?.toDate ? format(req.approved_at.toDate(), 'yyyy-MM-dd HH:mm') : 'N/A',
      'Rejected By': req.rejected_by_name || 'N/A',
      'Rejection Reason': req.rejection_reason || 'N/A',
    }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Fuel Requests');
    
    if (dataToExport.length > 0) {
      const headers = Object.keys(dataToExport[0]);
      worksheet.addRow(headers);
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      
      dataToExport.forEach(item => {
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
    link.download = `fuel-requests-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading fuel requests...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-500">Failed to load fuel requests. Please try again.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="space-y-4">
          {/* Top row: View Filter and Items per page */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={viewFilter}
                onChange={(e) => setViewFilter(e.target.value as typeof viewFilter)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="all">All Requests</option>
                {userData?.role === 'Driver' && (
                  <option value="my_requests">My Requests</option>
                )}
                {userData?.role === 'Admin Manager' && (
                  <>
                    <option value="pending_approval">Pending Approval</option>
                    <option value="flagged">Flagged Only</option>
                  </>
                )}
              </select>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>per page</span>
            </div>
          </div>

          {/* Bottom row: Search, Status, Date Range, Export */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by vehicle, driver..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FuelRequestStatus | 'ALL')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="FLAGGED">Flagged</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>

            {/* Date Range */}
            <div className="flex space-x-2">
              <DatePicker
                selected={dateRange[0]}
                onChange={(date) => setDateRange([date, dateRange[1]])}
                selectsStart
                startDate={dateRange[0]}
                endDate={dateRange[1]}
                placeholderText="Start Date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <DatePicker
                selected={dateRange[1]}
                onChange={(date) => setDateRange([dateRange[0], date])}
                selectsEnd
                startDate={dateRange[0]}
                endDate={dateRange[1]}
                placeholderText="End Date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Export Button */}
            <button
              onClick={exportToExcel}
              className="flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Driver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mileage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Distance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requested
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expected
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Variance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedRequests.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
                    {filteredRequests.length === 0 ? 'No fuel requests found' : 'No results on this page'}
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((request) => (
                  <tr 
                    key={request.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setDetailsRequest(request);
                      setShowDetailsModal(true);
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.request_date?.toDate
                        ? format(request.request_date.toDate(), 'MMM d, yyyy HH:mm')
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.vehicle_registration || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.driver_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.odometer_reading?.toLocaleString() || 'N/A'} km
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.distance_travelled
                        ? `${request.distance_travelled.toLocaleString()} km`
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.fuel_requested_litres?.toFixed(2) || 'N/A'} L
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.expected_fuel_litres
                        ? `${request.expected_fuel_litres.toFixed(2)} L`
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {request.variance_percentage !== undefined ? (
                        <span
                          className={
                            Math.abs(request.variance_percentage) > 15
                              ? 'text-orange-600 font-medium'
                              : 'text-gray-900'
                          }
                        >
                          {request.variance_percentage > 0 ? '+' : ''}
                          {request.variance_percentage.toFixed(1)}%
                        </span>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {userData?.role === 'Admin Manager' &&
                      (request.status === 'PENDING' || request.status === 'FLAGGED') ? (
                        <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRequest(request);
                              setActionType('approve');
                              setShowActionModal(true);
                            }}
                            className="text-green-600 hover:text-green-900"
                          >
                            Approve
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRequest(request);
                              setActionType('reject');
                              setShowActionModal(true);
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredRequests.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredRequests.length)} of{' '}
              {filteredRequests.length} results
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`px-3 py-1 border rounded-md text-sm font-medium ${
                        currentPage === pageNumber
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <span className="px-2 text-gray-500">...</span>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Modal */}
      {showActionModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {actionType === 'approve' ? 'Approve' : 'Reject'} Fuel Request
              </h3>

              <div className="mb-4 space-y-2 text-sm">
                <p>
                  <strong>Vehicle:</strong> {selectedRequest.vehicle_registration}
                </p>
                <p>
                  <strong>Driver:</strong> {selectedRequest.driver_name}
                </p>
                <p>
                  <strong>Requested:</strong> {selectedRequest.fuel_requested_litres?.toFixed(2)} L
                </p>
                {selectedRequest.expected_fuel_litres && (
                  <p>
                    <strong>Expected:</strong> {selectedRequest.expected_fuel_litres.toFixed(2)} L
                  </p>
                )}
                {selectedRequest.variance_percentage !== undefined && (
                  <p>
                    <strong>Variance:</strong>{' '}
                    {selectedRequest.variance_percentage > 0 ? '+' : ''}
                    {selectedRequest.variance_percentage.toFixed(1)}%
                  </p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {actionType === 'approve' ? 'Notes (optional)' : 'Reason for Rejection *'}
                </label>
                <textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder={
                    actionType === 'approve'
                      ? 'Add any notes...'
                      : 'Please provide a reason for rejection...'
                  }
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowActionModal(false);
                    setSelectedRequest(null);
                    setActionNotes('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  onClick={actionType === 'approve' ? handleApprove : handleReject}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                    actionType === 'approve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                >
                  {approveMutation.isPending || rejectMutation.isPending
                    ? 'Processing...'
                    : actionType === 'approve'
                    ? 'Approve'
                    : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      <FuelRequestDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setDetailsRequest(null);
        }}
        request={detailsRequest}
      />
    </div>
  );
}

