import { useQuery } from '@tanstack/react-query';
import { fuelService } from '../../../services/fuelService';
import type { Vehicle, FuelRequest } from '../../../types/fuel';

// Fetch all vehicles
export function useVehicles() {
  return useQuery<Vehicle[]>({
    queryKey: ['fuel', 'vehicles'],
    queryFn: () => fuelService.getVehicles(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Fetch a single vehicle
export function useVehicle(vehicleId: string | undefined) {
  return useQuery<Vehicle | null>({
    queryKey: ['fuel', 'vehicles', vehicleId],
    queryFn: () => vehicleId ? fuelService.getVehicle(vehicleId) : Promise.resolve(null),
    enabled: !!vehicleId,
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch fuel requests with optional filters
export function useFuelRequests(params?: {
  status?: string;
  vehicleId?: string;
  driverId?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  return useQuery<FuelRequest[]>({
    queryKey: ['fuel', 'requests', params],
    queryFn: () => fuelService.getFuelRequests(params),
    staleTime: 2 * 60 * 1000, // 2 minutes - more frequent updates
    gcTime: 15 * 60 * 1000,
  });
}

// Fetch a single fuel request
export function useFuelRequest(requestId: string | undefined) {
  return useQuery<FuelRequest | null>({
    queryKey: ['fuel', 'requests', requestId],
    queryFn: () => requestId ? fuelService.getFuelRequest(requestId) : Promise.resolve(null),
    enabled: !!requestId,
  });
}

// Fetch fuel statistics
export function useFuelStats(period: 'today' | 'week' | 'month' | 'year') {
  return useQuery({
    queryKey: ['fuel', 'stats', period],
    queryFn: () => fuelService.getFuelStats(period),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

// Fetch all fuel statistics at once
export function useAllFuelStats() {
  return useQuery({
    queryKey: ['fuel', 'stats', 'all'],
    queryFn: async () => {
      const [today, week, month, year] = await Promise.all([
        fuelService.getFuelStats('today'),
        fuelService.getFuelStats('week'),
        fuelService.getFuelStats('month'),
        fuelService.getFuelStats('year'),
      ]);
      return { today, week, month, year };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

// Fetch fuel economy audit history for a vehicle
export function useFuelEconomyAudit(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['fuel', 'audit', vehicleId],
    queryFn: () => vehicleId ? fuelService.getFuelEconomyAudit(vehicleId) : Promise.resolve([]),
    enabled: !!vehicleId,
    staleTime: 10 * 60 * 1000,
  });
}

// Fetch fuel alerts
export function useFuelAlerts(acknowledged: boolean = false) {
  return useQuery({
    queryKey: ['fuel', 'alerts', acknowledged],
    queryFn: () => fuelService.getAlerts(acknowledged),
    staleTime: 2 * 60 * 1000,
  });
}

// Fetch last approved fuel request for a vehicle
export function useLastApprovedFuelRequest(vehicleId: string | undefined) {
  return useQuery<FuelRequest | null>({
    queryKey: ['fuel', 'lastApproved', vehicleId],
    queryFn: () => vehicleId ? fuelService.getLastApprovedFuelRequest(vehicleId) : Promise.resolve(null),
    enabled: !!vehicleId,
    staleTime: 5 * 60 * 1000,
  });
}

