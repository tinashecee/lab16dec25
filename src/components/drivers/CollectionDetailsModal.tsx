import React from 'react';
import { X, Package, MapPin, Clock, User, AlertCircle } from 'lucide-react';
import { Collection } from '../../types/driver';

interface CollectionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection: Collection;
  onAssignDriver: (driverId: string) => void;
  availableDrivers: Array<{ id: string; name: string; status: string }>;
}

export default function CollectionDetailsModal({
  isOpen,
  onClose,
  collection,
  onAssignDriver,
  availableDrivers
}: CollectionDetailsModalProps) {
  if (!isOpen) return null;

  const priorityColors = {
    STAT: 'bg-red-50 text-red-700 border-red-100',
    Urgent: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    Normal: 'bg-blue-50 text-blue-700 border-blue-100'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl max-w-2xl w-full mx-4">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-50 rounded-xl">
                <Package className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-secondary-900">Collection Details</h2>
                <p className="text-secondary-600">Manage sample collection request</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-secondary-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Priority Badge */}
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm border ${priorityColors[collection.priority]}`}>
              {collection.priority}
            </span>
            {collection.priority === 'STAT' && (
              <span className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Immediate attention required
              </span>
            )}
          </div>

          {/* Collection Info */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-secondary-600 mb-1">Facility</h3>
              <div className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-secondary-400 mt-0.5" />
                <div>
                  <p className="font-medium text-secondary-900">{collection.facility}</p>
                  <p className="text-sm text-secondary-500">{collection.address}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-secondary-600 mb-1">Schedule</h3>
              <div className="flex items-start gap-2">
                <Clock className="w-5 h-5 text-secondary-400 mt-0.5" />
                <div>
                  <p className="font-medium text-secondary-900">{collection.scheduledTime}</p>
                  <p className="text-sm text-secondary-500">Expected collection time</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-secondary-600 mb-1">Sample Type</h3>
              <p className="font-medium text-secondary-900">{collection.sampleType}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-secondary-600 mb-1">Status</h3>
              <p className="font-medium text-secondary-900">{collection.status}</p>
            </div>
          </div>

          {/* Driver Assignment */}
          <div>
            <h3 className="text-sm font-medium text-secondary-600 mb-3">Assign Driver</h3>
            <div className="grid grid-cols-2 gap-4">
              {availableDrivers.map(driver => (
                <button
                  key={driver.id}
                  onClick={() => onAssignDriver(driver.id)}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border
                    ${collection.driverId === driver.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:bg-gray-50'
                    }
                  `}
                >
                  <div className="p-2 bg-gray-100 rounded-full">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-secondary-900">{driver.name}</p>
                    <p className="text-sm text-secondary-500">{driver.status}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-secondary-600 hover:text-secondary-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 