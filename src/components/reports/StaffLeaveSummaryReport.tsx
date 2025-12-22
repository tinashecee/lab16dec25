import React, { useState, useEffect } from 'react';
import { StaffLeaveSummary } from '../../services/reportService';
import '../../styles/staffLeaveSummary.css';
import { useLeaveRequestsSummary } from '../../hooks/queries/reports/useReports';

export default function StaffLeaveSummaryReport() {
  const [staffLeaveData, setStaffLeaveData] = useState<StaffLeaveSummary[]>([]);
  const { data, isLoading: loading, error } = useLeaveRequestsSummary();
  const [sortField, setSortField] = useState<keyof StaffLeaveSummary>('lastName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (data) {
      setStaffLeaveData(data as unknown as StaffLeaveSummary[]);
    }
  }, [data]);

  // Sort function
  const handleSort = (field: keyof StaffLeaveSummary) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Apply sorting
  const sortedData = [...staffLeaveData].sort((a, b) => {
    let compareA = a[sortField];
    let compareB = b[sortField];
    
    // Handle numeric fields
    if (typeof compareA === 'number') {
      return sortDirection === 'asc' 
        ? (compareA as number) - (compareB as number) 
        : (compareB as number) - (compareA as number);
    }
    
    // Handle string fields
    compareA = String(compareA).toLowerCase();
    compareB = String(compareB).toLowerCase();
    
    if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1;
    if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Export to CSV function
  const exportToCSV = () => {
    const headers = ["Staff ID", "First Name", "Last Name", "Department", "Position", 
                    "Leave Days Accrued", "Leave Days Taken", "Balance"];
    
    const csvData = staffLeaveData.map(employee => [
      employee.staffId,
      employee.firstName,
      employee.lastName,
      employee.department,
      employee.position,
      employee.leaveDaysAccrued.toFixed(1),
      employee.leaveDaysTaken.toFixed(1),
      employee.balance.toFixed(1)
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'staff_leave_summary.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="loading">Loading staff leave data...</div>;
  if (error) return <div className="error">Error loading data</div>;

  return (
    <div className="staff-leave-summary">
      <div className="report-header">
        <h2>Staff Leave Summary</h2>
        <button onClick={exportToCSV} className="export-btn">Export to CSV</button>
      </div>
      
      <table className="report-table">
        <thead>
          <tr>
            <th onClick={() => handleSort('staffId')}>
              Staff ID {sortField === 'staffId' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th onClick={() => handleSort('firstName')}>
              First Name {sortField === 'firstName' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th onClick={() => handleSort('lastName')}>
              Last Name {sortField === 'lastName' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th onClick={() => handleSort('department')}>
              Department {sortField === 'department' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th onClick={() => handleSort('position')}>
              Position {sortField === 'position' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th onClick={() => handleSort('leaveDaysAccrued')}>
              Leave Days Accrued {sortField === 'leaveDaysAccrued' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th onClick={() => handleSort('leaveDaysTaken')}>
              Leave Days Taken {sortField === 'leaveDaysTaken' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th onClick={() => handleSort('balance')}>
              Balance {sortField === 'balance' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((employee) => (
            <tr key={employee.staffId}>
              <td>{employee.staffId}</td>
              <td>{employee.firstName}</td>
              <td>{employee.lastName}</td>
              <td>{employee.department}</td>
              <td>{employee.position}</td>
              <td>{employee.leaveDaysAccrued.toFixed(2)}</td>
              <td>{employee.leaveDaysTaken.toFixed(2)}</td>
              <td className={employee.balance < 0 ? 'negative-balance' : ''}>{employee.balance.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 