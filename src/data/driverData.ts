import { Driver, Collection } from '../types/driver';

export const drivers: Driver[] = [
  {
    id: '1',
    name: 'John Smith',
    vehicle: 'Toyota Hiace (LAB-001)',
    status: 'Active',
    progress: 75,
    lastUpdate: '10 mins ago',
    location: {
      lat: -1.2921,
      lng: 36.8219,
    },
  },
  // Add more drivers...
];

export const collections: Collection[] = [
  {
    id: '1',
    facility: 'City Medical Center',
    address: '123 Healthcare Ave',
    sampleType: 'Blood Samples',
    priority: 'STAT',
    status: 'In Progress',
    scheduledTime: '10:30 AM',
    driverId: '1',
    location: {
      lat: -1.2921,
      lng: 36.8219,
    },
  },
  // Add more collections...
]; 