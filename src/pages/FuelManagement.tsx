import React, { useState } from 'react';
import { Fuel, Settings, AlertTriangle, Plus } from 'lucide-react';
import { useCurrentUser } from '../hooks/useCurrentUser';
import FuelRequestForm from '../components/fuel/FuelRequestForm';
import FuelRequestsTable from '../components/fuel/FuelRequestsTable';
import VehicleFuelEconomyConfig from '../components/fuel/VehicleFuelEconomyConfig';
import FuelStats from '../components/fuel/FuelStats';
import { useFuelAlerts } from '../hooks/queries/fuel/useFuelManagement';

type TabType = 'requests' | 'config' | 'settings';

export default function FuelManagement() {
  const { role } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<TabType>('requests');
  const [showFuelRequestForm, setShowFuelRequestForm] = useState(false);

  const isDriver = role === 'Driver';
  const isAdminManager = role === 'Admin Manager';
  const canManageRequests = isAdminManager; // Only Admin Managers can approve/reject
  const canSubmitRequests = isDriver; // Only Drivers can submit requests
  const canConfigureVehicles = isAdminManager; // Only Admin Managers can configure vehicles

  // Fetch unread alerts using TanStack Query
  const { data: unreadAlerts = [], refetch: refetchAlerts } = useFuelAlerts(false);

  const handleRefresh = () => {
    refetchAlerts();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900 flex items-center">
          <Fuel className="w-7 h-7 mr-2" />
          Fuel Management
        </h1>
        <p className="text-secondary-600 mt-1">
          Manage fuel requests, vehicle configurations, and monitor fuel usage
        </p>
      </div>

      {/* Alerts Banner */}
      {isAdminManager && unreadAlerts.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-orange-800">
                {unreadAlerts.length} Unread Alert{unreadAlerts.length > 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-orange-700 mt-1">
                There {unreadAlerts.length > 1 ? 'are' : 'is'} {unreadAlerts.length} flagged fuel
                request{unreadAlerts.length > 1 ? 's' : ''} requiring your attention.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <FuelStats />

      {/* Driver View */}
      {isDriver && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">My Fuel Requests</h2>
            <button
              onClick={() => setShowFuelRequestForm(true)}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Fuel Request
            </button>
          </div>

          <FuelRequestsTable onRefresh={handleRefresh} />

          <FuelRequestForm
            isOpen={showFuelRequestForm}
            onClose={() => setShowFuelRequestForm(false)}
            onSuccess={handleRefresh}
          />
        </div>
      )}

      {/* Admin Manager View */}
      {isAdminManager && (
        <div className="space-y-6">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('requests')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'requests'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Fuel Requests
              </button>
              <button
                onClick={() => setActiveTab('config')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'config'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Settings className="w-4 h-4 inline mr-2" />
                Vehicle Configuration
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'requests' && (
            <div>
              <FuelRequestsTable onRefresh={handleRefresh} />
            </div>
          )}

          {activeTab === 'config' && <VehicleFuelEconomyConfig />}
        </div>
      )}

      {/* Other Users View (Read-only) */}
      {!isDriver && !isAdminManager && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Fuel Requests</h2>
            <p className="text-sm text-gray-500">
              View-only access. Contact an Admin Manager to manage requests.
            </p>
          </div>

          <FuelRequestsTable onRefresh={handleRefresh} />
        </div>
      )}
    </div>
  );
}

