import { useQuery } from '@tanstack/react-query';
import { vpService } from '../../../services/vpService';
import { DriverFloat, VPDisbursement, VPSettings } from '../../../types/finance';
import { useEffect, useState } from 'react';

/**
 * Hook to fetch VP Settings with realtime updates
 */
export function useVPSettings() {
  const [settings, setSettings] = useState<VPSettings | null>(null);

  // Initial fetch using TanStack Query
  const query = useQuery({
    queryKey: ['vpSettings'],
    queryFn: () => vpService.getSettings(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const unsubscribe = vpService.onSettingsChange((s) => {
      setSettings(s);
    });
    return () => unsubscribe();
  }, []);

  // Use realtime data if available, otherwise fall back to query data
  return {
    ...query,
    data: settings ?? query.data,
  };
}

/**
 * Hook to fetch active driver floats
 */
export function useDriverFloats() {
  return useQuery({
    queryKey: ['driverFloats'],
    queryFn: () => vpService.listActiveDriverFloats(),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch VP disbursements
 */
export function useVPDisbursements(filters?: {
  driverId?: string;
  nurseId?: string;
  start?: Date;
  end?: Date;
}) {
  return useQuery({
    queryKey: ['vpDisbursements', filters],
    queryFn: () => vpService.listDisbursements(filters),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch driver statement for a specific float
 */
export function useDriverStatement(floatId: string | null) {
  return useQuery({
    queryKey: ['driverStatement', floatId],
    queryFn: () => {
      if (!floatId) throw new Error('Float ID is required');
      return vpService.getDriverStatement(floatId);
    },
    enabled: !!floatId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

