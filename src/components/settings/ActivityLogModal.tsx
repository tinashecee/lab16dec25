import React, { useState, useEffect } from 'react';
import { X, Activity, Clock, UserCircle } from 'lucide-react';
import { ActivityLog, activityLogService } from '../../services/activityLogService';
import { format } from 'date-fns';
import type { User } from '../../services/userService';
import { subDays } from 'date-fns';
import type { ActivityType } from '../../services/activityLogService';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

export default function ActivityLogModal({ isOpen, onClose, user }: ActivityLogModalProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<ActivityType[]>([]);
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: new Date()
  });

  useEffect(() => {
    if (isOpen && user.id) {
      fetchActivities();
    }
  }, [isOpen, user.id, selectedTypes, dateRange]);

  const fetchActivities = async () => {
    try {
      const data = await activityLogService.getUserActivities(user.id!, {
        activityTypes: selectedTypes.length ? selectedTypes : undefined,
        startDate: dateRange.start,
        endDate: dateRange.end
      });
      setActivities(data);
    } catch {
      // Error handling can be added here if needed
    }
  };

  const activityTypes: ActivityType[] = [
    'LOGIN',
    'LOGOUT',
    'PROFILE_UPDATE',
    'PASSWORD_CHANGE',
    'STATUS_CHANGE',
    'ROLE_CHANGE',
    'DEPARTMENT_CHANGE',
    'SETTINGS_UPDATE'
  ];

  // Export to Excel
  const handleExportExcel = async () => {
    const exportData = activities.map((activity) => ({
      Action: activity.action,
      Details: activity.details,
      Timestamp: activity.timestamp ? format(activity.timestamp.toDate(), 'yyyy-MM-dd HH:mm') : '',
      IP: activity.ipAddress || '',
      Metadata: activity.metadata ? JSON.stringify(activity.metadata) : '',
    }));
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Activity Logs');
    
    if (exportData.length > 0) {
      const headers = Object.keys(exportData[0]);
      worksheet.addRow(headers);
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      
      exportData.forEach(item => {
        worksheet.addRow(Object.values(item));
      });
      
      worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell?.({ includeEmpty: true }, cell => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = maxLength < 10 ? 10 : maxLength + 2;
      });
    }
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ActivityLog-${user.name}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Export to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Activity Log - ${user.name}`, 14, 16);
    const tableData = activities.map((activity) => [
      activity.action,
      activity.details,
      activity.timestamp ? format(activity.timestamp.toDate(), 'yyyy-MM-dd HH:mm') : '',
      activity.ipAddress || '',
      activity.metadata ? JSON.stringify(activity.metadata) : '',
    ]);
    autoTable(doc, {
      head: [['Action', 'Details', 'Timestamp', 'IP', 'Metadata']],
      body: tableData,
      startY: 22,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [52, 58, 64] },
    });
    doc.save(`ActivityLog-${user.name}.pdf`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle max-w-4xl w-full">
          <div className="px-4 pt-5 pb-4 bg-white sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary-500" />
                <h3 className="text-xl font-semibold text-secondary-900">
                  Activity Log - {user.name}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-secondary-400 hover:text-secondary-500 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg items-center justify-between">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Activity Types
                  </label>
                  <select
                    multiple
                    value={selectedTypes}
                    onChange={(e) => setSelectedTypes(
                      Array.from(e.target.selectedOptions, option => option.value as ActivityType)
                    )}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200"
                  >
                    {activityTypes.map(type => (
                      <option key={type} value={type}>
                        {type.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={format(dateRange.start, 'yyyy-MM-dd')}
                      onChange={(e) => setDateRange(prev => ({
                        ...prev,
                        start: new Date(e.target.value)
                      }))}
                      className="px-3 py-2 rounded-lg border border-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={format(dateRange.end, 'yyyy-MM-dd')}
                      onChange={(e) => setDateRange(prev => ({
                        ...prev,
                        end: new Date(e.target.value)
                      }))}
                      className="px-3 py-2 rounded-lg border border-gray-200"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2 min-w-[180px]">
                  <button
                    onClick={handleExportExcel}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                  >
                    Export to Excel
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    Export to PDF
                  </button>
                </div>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                <div className="relative border-l-2 border-primary-100 ml-6">
                  {activities.length === 0 && (
                    <div className="text-center text-secondary-400 py-8">No activity logs found for this user.</div>
                  )}
                  {activities.map((activity) => (
                    <div key={activity.id} className="mb-8 ml-4 flex items-start group relative">
                      <span className="absolute -left-6 flex items-center justify-center w-8 h-8 bg-primary-50 border-2 border-primary-200 rounded-full">
                        <UserCircle className="w-5 h-5 text-primary-500" />
                      </span>
                      <div className="flex-1 bg-white rounded-lg shadow p-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-primary-700">
                            {activity.action.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-secondary-400 ml-2">
                            <Clock className="w-3 h-3 inline-block mr-1" />
                            {activity.timestamp && format(activity.timestamp.toDate(), 'MMM d, yyyy HH:mm')}
                          </span>
                        </div>
                        <div className="text-sm text-secondary-700 mb-1">{activity.details}</div>
                        {activity.ipAddress && (
                          <div className="text-xs text-secondary-400">IP: {activity.ipAddress}</div>
                        )}
                        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                          <div className="mt-1 text-xs text-secondary-500">
                            <span className="font-medium">Metadata:</span> {JSON.stringify(activity.metadata)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="px-4 py-3 bg-gray-50 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-secondary-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 