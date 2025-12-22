import React, { useState, useEffect } from 'react';
import { X, Fuel, Car, Clock, Route, Calendar } from 'lucide-react';
import { fuelService } from '../../services/fuelService';
import { FuelRequest, Vehicle } from '../../types/fuel';
import { format } from 'date-fns';

type StatType = 'fuel' | 'vehicles' | 'pending' | 'distance';

interface FuelStatsDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  statType: StatType | null;
  period: 'today' | 'week' | 'month' | 'year';
}

export default function FuelStatsDetailsModal({
  isOpen,
  onClose,
  statType,
  period,
}: FuelStatsDetailsModalProps) {
  const [loading, setLoading] = useState(true);
  const [fuelRequests, setFuelRequests] = useState<FuelRequest[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    if (isOpen && statType) {
      loadData();
    }
  }, [isOpen, statType, period]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (statType === 'vehicles') {
        const vehiclesData = await fuelService.getVehicles();
        setVehicles(vehiclesData);
      } else {
        const now = new Date();
        let startDate: Date;

        switch (period) {
          case 'today':
            startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'month':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 30);
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'year':
            startDate = new Date(now);
            startDate.setFullYear(now.getFullYear() - 1);
            startDate.setHours(0, 0, 0, 0);
            break;
        }

        const filters: any = {
          startDate,
          endDate: now,
        };

        if (statType === 'pending') {
          // Get pending and flagged requests
          const allRequests = await fuelService.getFuelRequests();
          setFuelRequests(
            allRequests.filter(
              (r) => r.status === 'PENDING' || r.status === 'FLAGGED'
            )
          );
        } else {
          // Get approved requests for fuel and distance
          filters.status = 'APPROVED';
          const requests = await fuelService.getFuelRequests(filters);
          setFuelRequests(requests);
        }
      }
    } catch (err) {
      console.error('Error loading stats details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !statType) return null;

  const getTitle = () => {
    switch (statType) {
      case 'fuel':
        return `Fuel Disbursed - ${period.charAt(0).toUpperCase() + period.slice(1)}`;
      case 'vehicles':
        return 'All Vehicles';
      case 'pending':
        return 'Pending Requests';
      case 'distance':
        return `Distance Covered - ${period.charAt(0).toUpperCase() + period.slice(1)}`;
    }
  };

  const getIcon = () => {
    switch (statType) {
      case 'fuel':
        return Fuel;
      case 'vehicles':
        return Car;
      case 'pending':
        return Clock;
      case 'distance':
        return Route;
    }
  };

  const Icon = getIcon();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-50 rounded-lg">
              <Icon className="w-5 h-5 text-primary-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{getTitle()}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : statType === 'vehicles' ? (
            /* Vehicles List */
            <div className="space-y-3">
              {vehicles.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No vehicles found</p>
              ) : (
                vehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-50 rounded-lg">
                          <Car className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {vehicle.registration_number}
                          </p>
                          {vehicle.fuel_economy_km_per_litre && (
                            <p className="text-sm text-gray-500">
                              Fuel Economy: {vehicle.fuel_economy_km_per_litre.toFixed(2)} km/L
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        {vehicle.updated_at?.toDate
                          ? format(vehicle.updated_at.toDate(), 'MMM d, yyyy')
                          : 'N/A'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Fuel Requests List */
            <div className="space-y-3">
              {fuelRequests.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No requests found for this period
                </p>
              ) : (
                <>
                  {/* Summary */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-sm text-gray-500">Total Requests</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {fuelRequests.length}
                        </p>
                      </div>
                      {statType === 'fuel' && (
                        <div>
                          <p className="text-sm text-gray-500">Total Fuel</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {fuelRequests
                              .reduce((sum, r) => sum + (r.fuel_requested_litres || 0), 0)
                              .toFixed(2)}{' '}
                            L
                          </p>
                        </div>
                      )}
                      {statType === 'distance' && (
                        <div>
                          <p className="text-sm text-gray-500">Total Distance</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {fuelRequests
                              .reduce((sum, r) => sum + (r.distance_travelled || 0), 0)
                              .toLocaleString()}{' '}
                            km
                          </p>
                        </div>
                      )}
                      {statType === 'pending' && (
                        <>
                          <div>
                            <p className="text-sm text-gray-500">Pending</p>
                            <p className="text-2xl font-bold text-yellow-600">
                              {fuelRequests.filter((r) => r.status === 'PENDING').length}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Flagged</p>
                            <p className="text-2xl font-bold text-orange-600">
                              {fuelRequests.filter((r) => r.status === 'FLAGGED').length}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Request List */}
                  {fuelRequests.map((request) => (
                    <div
                      key={request.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <p className="font-medium text-gray-900">
                              {request.vehicle_registration}
                            </p>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                request.status === 'PENDING'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : request.status === 'FLAGGED'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {request.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <p className="text-gray-500">Driver</p>
                              <p className="text-gray-900">{request.driver_name}</p>
                            </div>
                            {statType === 'fuel' && (
                              <div>
                                <p className="text-gray-500">Fuel</p>
                                <p className="text-gray-900 font-medium">
                                  {request.fuel_requested_litres?.toFixed(2)} L
                                </p>
                              </div>
                            )}
                            {statType === 'distance' && request.distance_travelled && (
                              <div>
                                <p className="text-gray-500">Distance</p>
                                <p className="text-gray-900 font-medium">
                                  {request.distance_travelled.toLocaleString()} km
                                </p>
                              </div>
                            )}
                            <div>
                              <p className="text-gray-500">Date</p>
                              <p className="text-gray-900">
                                {request.request_date?.toDate
                                  ? format(request.request_date.toDate(), 'MMM d, HH:mm')
                                  : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
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

