import React from 'react';
import { X, Calendar, User, Car, Gauge, Fuel, Route, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { FuelRequest } from '../../types/fuel';
import { format } from 'date-fns';

interface FuelRequestDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: FuelRequest | null;
}

export default function FuelRequestDetailsModal({
  isOpen,
  onClose,
  request,
}: FuelRequestDetailsModalProps) {
  if (!isOpen || !request) return null;

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
          <AlertTriangle className="w-4 h-4 mr-1" />
          Pending
        </span>
      ),
      APPROVED: (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-4 h-4 mr-1" />
          Approved
        </span>
      ),
      REJECTED: (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
          <XCircle className="w-4 h-4 mr-1" />
          Rejected
        </span>
      ),
      FLAGGED: (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
          <AlertTriangle className="w-4 h-4 mr-1" />
          Flagged
        </span>
      ),
    };
    return badges[status as keyof typeof badges] || status;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Fuel Request Details</h2>
            <p className="text-sm text-gray-500 mt-1">Request ID: {request.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-500">Status</span>
            {getStatusBadge(request.status)}
          </div>

          {/* Request Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Request Date</p>
                  <p className="text-sm text-gray-900">
                    {request.request_date?.toDate
                      ? format(request.request_date.toDate(), 'MMM d, yyyy HH:mm')
                      : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Driver</p>
                  <p className="text-sm text-gray-900">{request.driver_name || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Car className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Vehicle</p>
                  <p className="text-sm text-gray-900">{request.vehicle_registration || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mileage Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Mileage Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Gauge className="w-5 h-5 text-blue-600" />
                  <p className="text-sm font-medium text-blue-900">Current Odometer</p>
                </div>
                <p className="text-2xl font-bold text-blue-900">
                  {request.odometer_reading?.toLocaleString() || 'N/A'} km
                </p>
              </div>

              {request.last_odometer_reading !== undefined && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Gauge className="w-5 h-5 text-gray-600" />
                    <p className="text-sm font-medium text-gray-900">Previous Odometer</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {request.last_odometer_reading.toLocaleString()} km
                  </p>
                </div>
              )}

              {request.distance_travelled !== undefined && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Route className="w-5 h-5 text-purple-600" />
                    <p className="text-sm font-medium text-purple-900">Distance Travelled</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-900">
                    {request.distance_travelled.toLocaleString()} km
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Fuel Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Fuel Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Fuel className="w-5 h-5 text-green-600" />
                  <p className="text-sm font-medium text-green-900">Requested Fuel</p>
                </div>
                <p className="text-2xl font-bold text-green-900">
                  {request.fuel_requested_litres?.toFixed(2) || 'N/A'} L
                </p>
              </div>

              {request.expected_fuel_litres !== undefined && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Fuel className="w-5 h-5 text-blue-600" />
                    <p className="text-sm font-medium text-blue-900">Expected Fuel</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">
                    {request.expected_fuel_litres.toFixed(2)} L
                  </p>
                </div>
              )}

              {request.variance_percentage !== undefined && (
                <div
                  className={`rounded-lg p-4 ${
                    Math.abs(request.variance_percentage) > 15
                      ? 'bg-orange-50'
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle
                      className={`w-5 h-5 ${
                        Math.abs(request.variance_percentage) > 15
                          ? 'text-orange-600'
                          : 'text-gray-600'
                      }`}
                    />
                    <p
                      className={`text-sm font-medium ${
                        Math.abs(request.variance_percentage) > 15
                          ? 'text-orange-900'
                          : 'text-gray-900'
                      }`}
                    >
                      Variance
                    </p>
                  </div>
                  <p
                    className={`text-2xl font-bold ${
                      Math.abs(request.variance_percentage) > 15
                        ? 'text-orange-900'
                        : 'text-gray-900'
                    }`}
                  >
                    {request.variance_percentage > 0 ? '+' : ''}
                    {request.variance_percentage.toFixed(1)}%
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Approval/Rejection Information */}
          {(request.status === 'APPROVED' || request.status === 'REJECTED') && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {request.status === 'APPROVED' ? 'Approval' : 'Rejection'} Details
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {request.status === 'APPROVED' ? 'Approved By' : 'Rejected By'}
                    </p>
                    <p className="text-sm text-gray-900">
                      {request.status === 'APPROVED'
                        ? request.approved_by_name || 'N/A'
                        : request.rejected_by_name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {request.status === 'APPROVED' ? 'Approved At' : 'Rejected At'}
                    </p>
                    <p className="text-sm text-gray-900">
                      {request.status === 'APPROVED' && request.approved_at?.toDate
                        ? format(request.approved_at.toDate(), 'MMM d, yyyy HH:mm')
                        : request.status === 'REJECTED' && request.rejected_at?.toDate
                        ? format(request.rejected_at.toDate(), 'MMM d, yyyy HH:mm')
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Admin Notes / Rejection Reason */}
                {(request.admin_notes || request.rejection_reason) && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">
                      {request.status === 'APPROVED' ? 'Notes' : 'Rejection Reason'}
                    </p>
                    <div className="bg-white rounded border border-gray-200 p-3">
                      <p className="text-sm text-gray-900">
                        {request.admin_notes || request.rejection_reason}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* First Request Notice */}
          {!request.last_odometer_reading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900">First Fuel Request</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    This is the first fuel request for this vehicle. Distance and fuel consumption
                    calculations will be available from the next request onwards.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

