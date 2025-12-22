import { fetchDrivers, Driver } from '@/services/driverService';const [drivers, setDrivers] = useState<Driver[]>([]);useEffect(() => {
  const loadDrivers = async () => {
    try {
      const driversData = await fetchDrivers();
      setDrivers(driversData);
    } catch (err) {
      console.error('Error loading drivers:', err);
      setError('Failed to load drivers. Please try again.');
    }
  };

  if (isOpen) {
    loadDrivers();
  }
}, [isOpen]);<select value={formData.notifyDriver} onChange={...}>
  <option value="">Select Driver...</option>
  {drivers.map(driver => (
    <option key={driver.id} value={driver.id}>
      {driver.name} ({driver.status})
    </option>
  ))}
</select>const selectedDriver = drivers.find(d => d.id === formData.notifyDriver);
await sampleCollectionService.createRequest({
  // ...other fields
  assignedDriver: selectedDriver ? {
    id: selectedDriver.id,
    name: selectedDriver.name
  } : undefined
});{error && (
  <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
    {error}
  </div>
)}const [formattedAddress, setFormattedAddress] = useState('');export const RegisterSampleModal = ({ isOpen, onClose }: RegisterSampleModalProps) => {export const BillPatientForm = ({ onClose, patientData }: BillPatientFormProps) => {import { BillPatientForm } from './BillPatientForm';import React, { useState, useEffect } from 'react';
import { X, Search, MapPin } from 'lucide-react';
import { CollectionRequest, collectionRequestService } from '../../services/collectionRequestService';
import { Driver } from '../../types/driver';

interface DriverAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: CollectionRequest;
  onAssign: () => void;
}

// This would come from your driver service in a real app
const availableDrivers: Driver[] = [
  {
    id: '1',
    name: 'John Driver',
    status: 'Active',
    location: 'Memorial Hospital',
    lastUpdate: '2 mins ago',
    coordinates: { lat: -1.2921, lng: 36.8219 }
  },
  {
    id: '2',
    name: 'Sarah Connor',
    status: 'Active',
    location: 'Central Lab',
    lastUpdate: '5 mins ago',
    coordinates: { lat: -1.2975, lng: 36.8126 }
  }
];

export default function DriverAssignmentModal({ 
  isOpen, 
  onClose, 
  request, 
  onAssign 
}: DriverAssignmentModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredDrivers = availableDrivers.filter(driver => 
    driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAssign = async (driverId: string, driverName: string) => {
    try {
      setLoading(true);
      setError(null);
      await collectionRequestService.assignDriver(request.id!, driverId, driverName);
      onAssign();
      onClose();
    } catch (err) {
      setError('Failed to assign driver. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="px-4 pt-5 pb-4 bg-white sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-secondary-900">
                Assign Driver to Collection Request
              </h3>
              <button
                onClick={onClose}
                className="p-1 text-secondary-400 hover:text-secondary-500 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Request Details */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="font-medium text-secondary-900">{request.medicalCenter.name}</p>
              <div className="flex items-center gap-1 text-sm text-secondary-500 mt-1">
                <MapPin className="w-4 h-4" />
                <span>{request.medicalCenter.address}</span>
              </div>
              <div className="mt-2 text-sm">
                <p><span className="text-secondary-500">Expected Pickup:</span> <span className="text-secondary-700">{request.expectedPickupTime}</span></p>
                <p><span className="text-secondary-500">Priority:</span> <span className="text-secondary-700">{request.priority}</span></p>
              </div>
            </div>

            {/* Driver Search */}
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search drivers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            {/* Available Drivers */}
            <div className="max-h-60 overflow-y-auto">
              <div className="space-y-2">
                {filteredDrivers.map((driver) => (
                  <div
                    key={driver.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={`https://ui-avatars.com/api/?name=${driver.name}&background=random`}
                          alt={driver.name}
                          className="w-10 h-10 rounded-full"
                        />
                        <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                          driver.status === 'Active' ? 'bg-green-500' : 'bg-gray-500'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-secondary-900">{driver.name}</p>
                        <div className="flex items-center gap-1 text-sm text-secondary-500">
                          <MapPin className="w-4 h-4" />
                          <span>{driver.location}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAssign(driver.id, driver.name)}
                      disabled={loading}
                      className="px-3 py-1 text-sm text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
                    >
                      Assign
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 