export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Task {
  id: string;
  title: string;
  sampleId: string;
  priority: TaskPriority;
  dueTime: string;
  patientName: string;
  status: 'pending' | 'in_progress' | 'completed';
}