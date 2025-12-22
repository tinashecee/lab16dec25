export interface Driver {
  id: string;
  name: string;
  vehicle: string;
  status: 'Active' | 'On Break' | 'Maintenance';
  progress: number;
  lastUpdate: string;
  location: {
    lat: number;
    lng: number;
  };
}

export interface Collection {
  id: string;
  facility: string;
  address: string;
  sampleType: string;
  priority: 'Normal' | 'Urgent' | 'STAT';
  status: 'Pending' | 'In Progress' | 'Completed';
  scheduledTime: string;
  driverId?: string;
  location: {
    lat: number;
    lng: number;
  };
} 