import React, { useState } from 'react';
import { X, Package, Clock, CheckCircle } from 'lucide-react';
import type { Driver, Collection } from '../../types/driver';

interface DriverDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: Driver;
  collections: Collection[];
}

type TabType = 'pending' | 'completed';

export default function DriverDetailsModal({
  isOpen,
  onClose,
  driver,
  collections
}: DriverDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  
  if (!isOpen) return null;

  const driverCollections = collections.filter(c => c.driverId === driver.id);
  const pendingCollections = driverCollections.filter(c => c.status === 'Pending');
  const completedCollections = driverCollections.filter(c => c.status === 'Completed');

  const recentActivities = [
    { id: 1, time: '10:30 AM', action: 'Collected sample from City Medical Center' },
    { id: 2, time: '10:15 AM', action: 'Arrived at City Medical Center' },
    { id: 3, time: '09:45 AM', action: 'Started route' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl max-w-4xl w-full mx-4">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-50 rounded-xl">
                <Package className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-secondary-900">{driver.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 text-sm rounded-full ${
                    driver.status === 'Active' 
                      ? 'bg-green-50 text-green-700' 
                      : 'bg-yellow-50 text-yellow-700'
                  }`}>
                    {driver.status}
                  </span>
                  <span className="text-sm text-secondary-500">
                    Last updated {driver.lastUpdate}
                  </span>
                </div>
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

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="space-y-6">
            <h3 className="font-semibold text-secondary-900">Recent Activity</h3>
            <div className="space-y-4">
              {recentActivities.map(activity => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="p-2 bg-gray-100 rounded-full">
                    <Clock className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-secondary-900">{activity.action}</p>
                    <p className="text-xs text-secondary-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Collections with Tabs */}
          <div className="space-y-4">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`
                    py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2
                    ${activeTab === 'pending'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                    }
                  `}
                >
                  Pending
                  <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-50 text-yellow-700">
                    {pendingCollections.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`
                    py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2
                    ${activeTab === 'completed'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                    }
                  `}
                >
                  Completed
                  <span className="px-2 py-0.5 text-xs rounded-full bg-green-50 text-green-700">
                    {completedCollections.length}
                  </span>
                </button>
              </nav>
            </div>

            {/* Collections Content */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {activeTab === 'pending' ? (
                pendingCollections.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {pendingCollections.map(collection => (
                      <div key={collection.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-secondary-900">
                              {collection.facility}
                            </h4>
                            <p className="text-sm text-secondary-500">
                              {collection.sampleType}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              collection.priority === 'STAT' 
                                ? 'bg-red-50 text-red-700' 
                                : 'bg-blue-50 text-blue-700'
                            }`}>
                              {collection.priority}
                            </span>
                            <p className="text-xs text-secondary-500 mt-1">
                              {collection.scheduledTime}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-secondary-500">
                    No pending collections
                  </div>
                )
              ) : (
                completedCollections.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {completedCollections.map(collection => (
                      <div key={collection.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-secondary-900">
                              {collection.facility}
                            </h4>
                            <p className="text-sm text-secondary-500">
                              {collection.sampleType}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-sm">Completed</span>
                            </div>
                            <p className="text-xs text-secondary-500 mt-1">
                              {collection.scheduledTime}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-secondary-500">
                    No completed collections
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 