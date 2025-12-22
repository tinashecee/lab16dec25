import { Timestamp } from 'firebase/firestore';

export interface Vehicle {
  id: string;
  registration_number: string;
  fuel_economy_km_per_litre?: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export type FuelRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED';

export interface FuelRequest {
  id: string;
  vehicle_id: string;
  vehicle_registration?: string; // Denormalized for easier queries
  driver_id: string;
  driver_name?: string; // Denormalized for easier queries
  request_date: Timestamp;
  odometer_reading: number;
  last_odometer_reading?: number;
  distance_travelled?: number;
  fuel_requested_litres: number;
  expected_fuel_litres?: number;
  variance_percentage?: number;
  status: FuelRequestStatus;
  created_at: Timestamp;
  updated_at?: Timestamp;
  approved_by?: string;
  approved_by_name?: string;
  approved_at?: Timestamp;
  rejected_by?: string;
  rejected_by_name?: string;
  rejected_at?: Timestamp;
  rejection_reason?: string;
  admin_notes?: string;
}

export interface FuelEconomyAudit {
  id: string;
  vehicle_id: string;
  vehicle_registration?: string;
  old_value?: number;
  new_value: number;
  changed_by: string;
  changed_by_name?: string;
  changed_at: Timestamp;
}

export type AlertType = 'OVER_REQUEST' | 'DATA_ANOMALY';

export interface FuelAlert {
  id: string;
  fuel_request_id: string;
  alert_type: AlertType;
  message: string;
  acknowledged: boolean;
  created_at: Timestamp;
  acknowledged_by?: string;
  acknowledged_at?: Timestamp;
}

export interface FuelManagementSettings {
  id: string;
  variance_threshold_percentage: number; // Default: 15
  updated_at: Timestamp;
  updated_by: string;
}

