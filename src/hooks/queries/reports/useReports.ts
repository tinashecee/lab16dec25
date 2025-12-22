import { useQuery } from '@tanstack/react-query';
import {
  getDriverHandoverSummary,
  getDriverCollectionSummary,
  getCenterCollectionSummary,
  getRegistrationSummary,
  getStaffLeaveSummary,
  getLeaveRequestsSummary,
  getTATAnalysisReport,
  getTestSummaryReport,
  getUserActivityLog,
} from '../../../services/reportService';

export function useDriverHandoverSummary(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ['reports', 'driverHandover', startDate?.toISOString() ?? null, endDate?.toISOString() ?? null],
    queryFn: () => getDriverHandoverSummary(startDate, endDate),
    staleTime: 5 * 60 * 1000,
  });
}

export function useStaffLeaveSummary(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ['reports', 'staffLeaveSummary', startDate?.toISOString() ?? null, endDate?.toISOString() ?? null],
    queryFn: () => getStaffLeaveSummary(startDate, endDate),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDriverCollectionSummary(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ['reports', 'driverCollection', startDate?.toISOString() ?? null, endDate?.toISOString() ?? null],
    queryFn: () => getDriverCollectionSummary(startDate, endDate),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCenterCollectionSummary(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ['reports', 'centerCollection', startDate?.toISOString() ?? null, endDate?.toISOString() ?? null],
    queryFn: () => getCenterCollectionSummary(startDate, endDate),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRegistrationSummary(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ['reports', 'registration', startDate?.toISOString() ?? null, endDate?.toISOString() ?? null],
    queryFn: () => getRegistrationSummary(startDate, endDate),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLeaveRequestsSummary(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ['reports', 'leaveRequests', startDate?.toISOString() ?? null, endDate?.toISOString() ?? null],
    queryFn: () => getLeaveRequestsSummary(startDate, endDate),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTATAnalysisReport(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ['reports', 'tatAnalysis', startDate?.toISOString() ?? null, endDate?.toISOString() ?? null],
    queryFn: () => getTATAnalysisReport(startDate, endDate),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTestSummaryReport(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ['reports', 'testSummary', startDate?.toISOString() ?? null, endDate?.toISOString() ?? null],
    queryFn: () => getTestSummaryReport(startDate, endDate),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUserActivityLog(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ['reports', 'userActivity', startDate?.toISOString() ?? null, endDate?.toISOString() ?? null],
    queryFn: () => getUserActivityLog(startDate, endDate),
    staleTime: 5 * 60 * 1000,
  });
}


