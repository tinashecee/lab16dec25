import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { fuelService } from '../../services/fuelService';
import { useAuth } from '../../contexts/AuthContext';
import { Vehicle } from '../../types/fuel';

interface FuelRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FuelRequestForm({
  isOpen,
  onClose,
  onSuccess,
}: FuelRequestFormProps) {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [lastMileage, setLastMileage] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    vehicleId: '',
    currentMileage: '',
    requestedFuel: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      loadVehicles();
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.vehicleId) {
      loadLastMileage(formData.vehicleId);
    } else {
      setLastMileage(null);
    }
  }, [formData.vehicleId]);

  const loadVehicles = async () => {
    try {
      const vehiclesList = await fuelService.getVehicles();
      setVehicles(vehiclesList);
    } catch (err) {
      console.error('Error loading vehicles:', err);
      setError('Failed to load vehicles');
    }
  };

  const loadLastMileage = async (vehicleId: string) => {
    try {
      const requests = await fuelService.getFuelRequests({
        vehicleId,
        status: 'APPROVED',
      });
      if (requests.length > 0) {
        setLastMileage(requests[0].odometer_reading);
      } else {
        setLastMileage(null);
      }
    } catch (err) {
      console.error('Error loading last mileage:', err);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.vehicleId) {
      errors.vehicleId = 'Vehicle selection is required';
    }

    if (!formData.currentMileage.trim()) {
      errors.currentMileage = 'Current mileage is required';
    } else {
      const mileage = parseFloat(formData.currentMileage);
      if (isNaN(mileage) || mileage <= 0) {
        errors.currentMileage = 'Mileage must be a positive number';
      } else if (lastMileage !== null && mileage <= lastMileage) {
        errors.currentMileage = `Mileage must be greater than last recorded value (${lastMileage} km)`;
      }
    }

    if (!formData.requestedFuel.trim()) {
      errors.requestedFuel = 'Requested fuel quantity is required';
    } else {
      const fuel = parseFloat(formData.requestedFuel);
      if (isNaN(fuel) || fuel <= 0) {
        errors.requestedFuel = 'Fuel quantity must be a positive number';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    if (!userData) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);

    try {
      await fuelService.submitFuelRequest(
        userData.id,
        userData.name,
        formData.vehicleId,
        parseFloat(formData.currentMileage),
        parseFloat(formData.requestedFuel)
      );

      // Reset form
      setFormData({
        vehicleId: '',
        currentMileage: '',
        requestedFuel: '',
      });
      setFormErrors({});
      setLastMileage(null);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error submitting fuel request:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit fuel request');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      vehicleId: '',
      currentMileage: '',
      requestedFuel: '',
    });
    setFormErrors({});
    setError(null);
    setLastMileage(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Submit Fuel Request</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Vehicle Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vehicle <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.vehicleId}
              onChange={(e) =>
                setFormData({ ...formData, vehicleId: e.target.value })
              }
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                formErrors.vehicleId ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select a vehicle</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.registration_number}
                  {vehicle.fuel_economy_km_per_litre
                    ? ` (${vehicle.fuel_economy_km_per_litre} km/L)`
                    : ''}
                </option>
              ))}
            </select>
            {formErrors.vehicleId && (
              <p className="mt-1 text-sm text-red-600">{formErrors.vehicleId}</p>
            )}
          </div>

          {/* Last Mileage Display */}
          {lastMileage !== null && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                <strong>Last recorded mileage:</strong> {lastMileage.toLocaleString()} km
              </p>
            </div>
          )}

          {/* Current Mileage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Odometer Reading (km) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.currentMileage}
              onChange={(e) =>
                setFormData({ ...formData, currentMileage: e.target.value })
              }
              placeholder="Enter current mileage"
              min={lastMileage ? lastMileage + 1 : 0}
              step="0.01"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                formErrors.currentMileage ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {formErrors.currentMileage && (
              <p className="mt-1 text-sm text-red-600">{formErrors.currentMileage}</p>
            )}
            {lastMileage !== null && !formErrors.currentMileage && (
              <p className="mt-1 text-sm text-gray-500">
                Must be greater than {lastMileage.toLocaleString()} km
              </p>
            )}
          </div>

          {/* Requested Fuel */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Requested Fuel (Litres) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.requestedFuel}
              onChange={(e) =>
                setFormData({ ...formData, requestedFuel: e.target.value })
              }
              placeholder="Enter fuel quantity in litres"
              min="0"
              step="0.01"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                formErrors.requestedFuel ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {formErrors.requestedFuel && (
              <p className="mt-1 text-sm text-red-600">{formErrors.requestedFuel}</p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

