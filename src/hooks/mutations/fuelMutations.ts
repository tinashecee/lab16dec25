import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fuelService } from '../../services/fuelService';
import type { Vehicle, FuelRequest } from '../../types/fuel';

// Create or update a vehicle
export function useSaveVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vehicleId, data }: { vehicleId?: string; data: Partial<Vehicle> }) =>
      vehicleId ? fuelService.updateVehicle(vehicleId, data) : fuelService.createVehicle(data as Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>),
    onSuccess: () => {
      // Invalidate all vehicle-related queries
      queryClient.invalidateQueries({ queryKey: ['fuel', 'vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['fuel', 'stats'] });
    },
  });
}

// Update vehicle fuel economy
export function useUpdateFuelEconomy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vehicleId, fuelEconomy, changedBy }: { vehicleId: string; fuelEconomy: number; changedBy: string }) =>
      fuelService.updateFuelEconomy(vehicleId, fuelEconomy, changedBy),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['fuel', 'vehicles', variables.vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['fuel', 'vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['fuel', 'audit', variables.vehicleId] });
    },
  });
}

// Submit a fuel request
export function useSubmitFuelRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: {
      driver_id: string;
      driver_name: string;
      vehicle_id: string;
      vehicle_registration: string;
      odometer_reading: number;
      fuel_requested_litres: number;
    }) => fuelService.submitFuelRequest(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel', 'requests'] });
      queryClient.invalidateQueries({ queryKey: ['fuel', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['fuel', 'alerts'] });
    },
  });
}

// Approve a fuel request
export function useApproveFuelRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      approverId,
      approverName,
      comments,
    }: {
      requestId: string;
      approverId: string;
      approverName: string;
      comments?: string;
    }) => fuelService.approveFuelRequest(requestId, approverId, approverName, comments),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['fuel', 'requests'] });
      queryClient.invalidateQueries({ queryKey: ['fuel', 'requests', variables.requestId] });
      queryClient.invalidateQueries({ queryKey: ['fuel', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['fuel', 'alerts'] });
    },
  });
}

// Reject a fuel request
export function useRejectFuelRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      approverId,
      approverName,
      comments,
    }: {
      requestId: string;
      approverId: string;
      approverName: string;
      comments: string;
    }) => fuelService.rejectFuelRequest(requestId, approverId, approverName, comments),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['fuel', 'requests'] });
      queryClient.invalidateQueries({ queryKey: ['fuel', 'requests', variables.requestId] });
      queryClient.invalidateQueries({ queryKey: ['fuel', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['fuel', 'alerts'] });
    },
  });
}

// Acknowledge a fuel alert
export function useAcknowledgeFuelAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) => fuelService.acknowledgeAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel', 'alerts'] });
    },
  });
}

// Delete a vehicle
export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vehicleId: string) => fuelService.deleteVehicle(vehicleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel', 'vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['fuel', 'stats'] });
    },
  });
}

