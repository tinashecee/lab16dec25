import { Timestamp } from 'firebase/firestore';
import type { Task } from '../types/task';

interface ExportRow {
  [key: string]: string | number | boolean | null | undefined;
}

export const formatTasksForCSV = (tasks: Task[]): ExportRow[] => {
  return tasks.map(task => ({
    'Title': task.title,
    'Description': task.description,
    'Status': task.status,
    'Priority': task.priority,
    'Due Date': new Date(task.dueDate).toLocaleDateString(),
    'Assigned To': task.assignedUsers.map(u => u.name).join(', '),
    'Created At': task.createdAt.toDate().toLocaleDateString()
  }));
};

export const downloadCSV = (data: ExportRow[], filename: string) => {
  // Convert object keys to header row
  const headers = Object.keys(data[0]);
  
  // Convert data to CSV rows
  const csvRows = [
    // Header row
    headers.join(','),
    // Data rows
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]?.toString() || '';
        // Escape commas and quotes in values
        return `"${value.replace(/"/g, '""')}"`;
      }).join(',')
    )
  ];

  // Create blob and download
  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
