import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vpService, VPSettingsUpdate } from '../../services/vpService';
import toast from 'react-hot-toast';

/**
 * Mutation hook for allocating driver float
 */
export function useAllocateFloat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      driverId: string;
      driverName?: string;
      amount: number;
      currency: string;
      allocatedByUserId: string;
      allocatedByUserName?: string;
    }) => vpService.allocateDriverFloat(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverFloats'] });
      toast.success('Float allocated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to allocate float');
    },
  });
}

/**
 * Mutation hook for recording VP disbursement
 */
export function useRecordDisbursement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      sampleId: string;
      nurseId: string;
      nurseName?: string;
      driverId: string;
      driverName?: string;
      amount: number;
      currency: string;
      notes?: string;
      createdByUserId: string;
      createdByUserName?: string;
      floatId?: string;
    }) => vpService.recordVPDisbursement(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vpDisbursements'] });
      queryClient.invalidateQueries({ queryKey: ['driverFloats'] });
      queryClient.invalidateQueries({ queryKey: ['driverStatement'] });
      toast.success('Disbursement recorded successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to record disbursement');
    },
  });
}

/**
 * Mutation hook for updating VP settings
 */
export function useSetVPSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (update: VPSettingsUpdate) => vpService.setSettings(update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vpSettings'] });
      toast.success('Settings updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update settings');
    },
  });
}

/**
 * Mutation hook for closing driver float
 */
export function useCloseDriverFloat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (floatId: string) => vpService.closeDriverFloat(floatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverFloats'] });
      queryClient.invalidateQueries({ queryKey: ['driverStatement'] });
      toast.success('Float closed successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to close float');
    },
  });
}

