import React, { useState } from 'react';
import { Settings, Save, History, X, Plus } from 'lucide-react';
import { fuelService } from '../../services/fuelService';
import { Vehicle } from '../../types/fuel';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { useVehicles, useFuelEconomyAudit } from '../../hooks/queries/fuel/useFuelManagement';
import { useUpdateFuelEconomy, useSaveVehicle } from '../../hooks/mutations/fuelMutations';

export default function VehicleFuelEconomyConfig() {
  const { userData } = useAuth();
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [fuelEconomy, setFuelEconomy] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyVehicleId, setHistoryVehicleId] = useState<string | null>(null);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    registrationNumber: '',
    fuelEconomy: '',
  });

  // TanStack Query hooks
  const { data: vehicles = [], isLoading: loading, error } = useVehicles();
  const { data: auditHistory = [] } = useFuelEconomyAudit(historyVehicleId || undefined);
  const updateFuelEconomyMutation = useUpdateFuelEconomy();
  const saveVehicleMutation = useSaveVehicle();

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFuelEconomy(vehicle.fuel_economy_km_per_litre?.toString() || '');
  };

  const handleCancel = () => {
    setEditingVehicle(null);
    setFuelEconomy('');
  };

  const handleSave = async () => {
    if (!editingVehicle || !userData) return;

    const value = parseFloat(fuelEconomy);
    if (isNaN(value) || value <= 0) {
      alert('Fuel economy must be a positive number');
      return;
    }

    try {
      await updateFuelEconomyMutation.mutateAsync({
        vehicleId: editingVehicle.id,
        fuelEconomy: value,
        changedBy: userData.name,
      });
      handleCancel();
    } catch (err) {
      console.error('Error updating fuel economy:', err);
      alert(err instanceof Error ? err.message : 'Failed to update fuel economy');
    }
  };

  const handleViewHistory = (vehicleId: string) => {
    setHistoryVehicleId(vehicleId);
    setShowHistoryModal(true);
  };

  const handleAddVehicle = async () => {
    if (!userData) return;

    if (!newVehicle.registrationNumber.trim()) {
      alert('Please enter a registration number');
      return;
    }

    const fuelEconomyValue = newVehicle.fuelEconomy.trim() 
      ? parseFloat(newVehicle.fuelEconomy) 
      : undefined;

    if (fuelEconomyValue !== undefined && (isNaN(fuelEconomyValue) || fuelEconomyValue <= 0)) {
      alert('Fuel economy must be a positive number');
      return;
    }

    try {
      await saveVehicleMutation.mutateAsync({
        data: {
          registration_number: newVehicle.registrationNumber.trim(),
          fuel_economy_km_per_litre: fuelEconomyValue,
        },
      });
      setShowAddVehicleModal(false);
      setNewVehicle({ registrationNumber: '', fuelEconomy: '' });
    } catch (err) {
      console.error('Error adding vehicle:', err);
      alert(err instanceof Error ? err.message : 'Failed to add vehicle');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading vehicles...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-500">Failed to load vehicles. Please try again.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Vehicle Fuel Economy Configuration
          </h3>
          <button
            onClick={() => setShowAddVehicleModal(true)}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Vehicle
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registration Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fuel Economy (km/L)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {vehicles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    No vehicles found
                  </td>
                </tr>
              ) : (
                vehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {vehicle.registration_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {editingVehicle?.id === vehicle.id ? (
                        <input
                          type="number"
                          value={fuelEconomy}
                          onChange={(e) => setFuelEconomy(e.target.value)}
                          placeholder="Enter km/L"
                          min="0"
                          step="0.01"
                          className="w-32 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      ) : (
                        vehicle.fuel_economy_km_per_litre
                          ? `${vehicle.fuel_economy_km_per_litre.toFixed(2)} km/L`
                          : <span className="text-gray-400">Not configured</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {vehicle.updated_at?.toDate
                        ? format(vehicle.updated_at.toDate(), 'MMM d, yyyy HH:mm')
                        : vehicle.created_at?.toDate
                        ? format(vehicle.created_at.toDate(), 'MMM d, yyyy HH:mm')
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {editingVehicle?.id === vehicle.id ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center text-green-600 hover:text-green-900 disabled:opacity-50"
                          >
                            <Save className="w-4 h-4 mr-1" />
                            {updateFuelEconomyMutation.isPending ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={handleCancel}
                            disabled={updateFuelEconomyMutation.isPending}
                            className="flex items-center text-gray-600 hover:text-gray-900 disabled:opacity-50"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(vehicle)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleViewHistory(vehicle.id)}
                            className="text-gray-600 hover:text-gray-900 flex items-center"
                          >
                            <History className="w-4 h-4 mr-1" />
                            History
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Vehicle Modal */}
      {showAddVehicleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Add New Vehicle</h3>
              <button
                onClick={() => {
                  setShowAddVehicleModal(false);
                  setNewVehicle({ registrationNumber: '', fuelEconomy: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newVehicle.registrationNumber}
                  onChange={(e) =>
                    setNewVehicle({ ...newVehicle, registrationNumber: e.target.value })
                  }
                  placeholder="e.g., ABC-1234"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fuel Economy (km/L) <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <input
                  type="number"
                  value={newVehicle.fuelEconomy}
                  onChange={(e) =>
                    setNewVehicle({ ...newVehicle, fuelEconomy: e.target.value })
                  }
                  placeholder="e.g., 12.5"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  You can configure this later if not known
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddVehicleModal(false);
                  setNewVehicle({ registrationNumber: '', fuelEconomy: '' });
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={saveVehicleMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleAddVehicle}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={saveVehicleMutation.isPending}
              >
                {saveVehicleMutation.isPending ? 'Adding...' : 'Add Vehicle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit History Modal */}
      {showHistoryModal && historyVehicleId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Fuel Economy History
              </h3>
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setHistoryVehicleId(null);
                  setAuditHistory([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {auditHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No history available for this vehicle
                </p>
              ) : (
                <div className="space-y-4">
                  {auditHistory.map((audit) => (
                    <div
                      key={audit.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Changed by: {audit.changed_by_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {audit.changed_at?.toDate
                              ? format(audit.changed_at.toDate(), 'MMM d, yyyy HH:mm')
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center space-x-2">
                        <span className="text-sm text-gray-600">
                          {audit.old_value !== undefined
                            ? `${audit.old_value.toFixed(2)} km/L`
                            : 'Not set'}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="text-sm font-medium text-gray-900">
                          {audit.new_value.toFixed(2)} km/L
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

