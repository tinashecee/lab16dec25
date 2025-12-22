import { sampleService } from '../services/sampleService';
import type { Sample } from '../services/sampleService';

const initialSamples: Omit<Sample, 'id'>[] = [
  {
    patientName: 'John Smith',
    type: 'Blood Test',
    priority: 'High',
    status: 'Processing',
    receivedAt: '2024-03-15 09:30 AM',
    expectedCompletion: '2024-03-15 02:30 PM'
  },
  {
    patientName: 'Emma Davis',
    type: 'Urinalysis',
    priority: 'Medium',
    status: 'Pending',
    receivedAt: '2024-03-15 10:15 AM',
    expectedCompletion: '2024-03-15 03:45 PM'
  },
  {
    patientName: 'Michael Chen',
    type: 'CBC',
    priority: 'High',
    status: 'Awaiting',
    receivedAt: '2024-03-15 11:00 AM',
    expectedCompletion: '2024-03-15 04:00 PM'
  },
  {
    patientName: 'Sarah Johnson',
    type: 'Lipid Panel',
    priority: 'Low',
    status: 'Completed',
    receivedAt: '2024-03-15 08:30 AM',
    expectedCompletion: '2024-03-15 01:30 PM'
  }
];

export const initializeData = async () => {
  try {
    for (const sample of initialSamples) {
      await sampleService.addSample(sample);
    }
    console.log('Sample data initialized successfully');
  } catch (error) {
    console.error('Error initializing sample data:', error);
  }
}; 