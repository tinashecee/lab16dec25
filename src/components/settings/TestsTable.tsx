import React, { useState } from 'react';
import { DataTable } from '../ui/DataTable';
import { Button } from '../ui/button';
import { RefreshCw, Upload, Download } from 'lucide-react';
import ExcelJS from 'exceljs';
import { toast } from '../ui/use-toast';
import { Progress } from '../ui/progress';
import { syncTestsWithFirebase } from '../../services/crelioTests';

interface Test {
  id: string;
  testID: number;
  testName: string;
  testAmount: string;
  isProfile: boolean;
  normalTAT?: string; // Format: "DD:HH:MM:SS"
  urgentTAT?: string; // Format: "DD:HH:MM:SS"
}

interface TestsTableProps {
  data: Test[];
  onRowClick?: (test: Test) => void;
  onSync: () => Promise<void>;
  isSyncing: boolean;
  onUpdateTATs?: (updates: { testID: number; normalTAT: string; urgentTAT: string }[]) => Promise<void>;
}

const formatTAT = (value?: string | number): string => {
  if (!value) return '-';

  // If it's a number (decimal days), convert to DD:HH:MM:SS
  if (typeof value === 'number') {
    const totalSeconds = Math.round(value * 24 * 60 * 60); // Convert days to seconds
    const days = Math.floor(totalSeconds / (24 * 60 * 60));
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;

    return `${String(days).padStart(2, '0')}:${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  // If it's a string, ensure it's in the correct format
  const parts = value.split(':');
  if (parts.length === 3) {
    // Add seconds if the format is DD:HH:MM
    parts.push('00');
  }
  
  if (parts.length !== 4) {
    return value; // Return original if format is invalid
  }

  // Pad all parts with zeros
  return parts.map(part => String(parseInt(part)).padStart(2, '0')).join(':');
};

export function TestsTable({ 
  data = [],
  onRowClick, 
  onSync = async () => {},
  isSyncing = false,
  onUpdateTATs
}: TestsTableProps) {
  const [pageSize, setPageSize] = useState<number>(20);
  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [isSyncingState, setIsSyncingState] = useState(isSyncing);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter data based on search query
  const filteredData = React.useMemo(() => {
    if (!searchQuery) return data;

    const searchLower = searchQuery.toLowerCase();
    return data.filter(test => {
      // Search in all relevant fields
      return (
        test.testID.toString().includes(searchLower) ||
        test.testName.toLowerCase().includes(searchLower) ||
        test.testAmount.toString().includes(searchLower) ||
        (test.normalTAT || '').toLowerCase().includes(searchLower) ||
        (test.urgentTAT || '').toLowerCase().includes(searchLower) ||
        (test.isProfile ? 'profile' : 'test').includes(searchLower)
      );
    });
  }, [data, searchQuery]);

  const columns = [
    {
      key: 'testID',
      label: 'ID',
      width: '80px'
    },
    {
      key: 'testName',
      label: 'Test Name',
      width: '300px'
    },
    {
      key: 'testAmount',
      label: 'Amount',
      width: '120px',
      render: (value: string) => `ZWL$ ${value}`
    },
    {
      key: 'normalTAT',
      label: 'Normal TAT',
      width: '120px',
      render: (value?: string | number) => value ? formatTAT(value) : '-'
    },
    {
      key: 'urgentTAT',
      label: 'Urgent TAT',
      width: '120px',
      render: (value?: string | number) => value ? formatTAT(value) : '-'
    },
    {
      key: 'isProfile',
      label: 'Type',
      width: '100px',
      render: (value: boolean) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
          value ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
        }`}>
          {value ? 'Profile' : 'Test'}
        </span>
      )
    }
  ];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      const file = event.target.files?.[0];
      if (!file) return;

      const arrayBuffer = await file.arrayBuffer();
      
      try {
        setUploadProgress(20);
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        const worksheet = workbook.worksheets[0];
        
        setUploadProgress(40);
        
        // Get the raw data
        const rawRows: any[] = [];
        const headers: string[] = [];
        
        worksheet.getRow(1).eachCell((cell) => {
          headers.push(cell.value?.toString() || '');
        });
        
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // Skip header row
          const rowData: any = {};
          row.eachCell((cell, colNumber) => {
            const header = headers[colNumber - 1];
            if (header) {
              rowData[header] = cell.value;
            }
          });
          if (Object.keys(rowData).length > 0) {
            rawRows.push(rowData);
          }
        });
        
        console.log('Raw Excel data:', rawRows);

        setUploadProgress(60);

        // Map the data with exact column names and format TATs
        const updates = rawRows.map(row => {
            console.log('Processing row:', row);
            
            // Ensure we have the required fields
            if (!row['Test ID']) {
              throw new Error(`Missing Test ID in row: ${JSON.stringify(row)}`);
            }

            // Handle both uppercase and regular case column names
            const normalTAT = row['NORMAL TAT'] || row['Normal TAT'];
            const urgentTAT = row['URGENT TAT'] || row['Urgent TAT'];

            // Format TAT values ensuring they're in DD:HH:MM:SS format
            const formattedNormalTAT = normalTAT ? formatTAT(normalTAT) : null;
            const formattedUrgentTAT = urgentTAT ? formatTAT(urgentTAT) : null;

            // Log the values for debugging
            console.log('TAT Values:', {
              testId: row['Test ID'],
              normalTAT,
              urgentTAT,
              formattedNormalTAT,
              formattedUrgentTAT
            });

            // Only skip if both formatted TATs are null or '-'
            if ((!formattedNormalTAT || formattedNormalTAT === '-') && 
                (!formattedUrgentTAT || formattedUrgentTAT === '-')) {
              console.log(`Skipping row ${row['Test ID']} - no valid TAT values`);
              return null;
            }

          return {
            testID: parseInt(row['Test ID']),
            normalTAT: formattedNormalTAT === '-' ? undefined : formattedNormalTAT,
            urgentTAT: formattedUrgentTAT === '-' ? undefined : formattedUrgentTAT
          };
        }).filter((update): update is NonNullable<typeof update> => update !== null);

        console.log('Formatted updates:', updates);
        setUploadProgress(80);

        // Process updates
        if (updates.length > 0 && onUpdateTATs) {
          try {
            await onUpdateTATs(updates);
            toast({
              title: "Update Successful",
              description: `Updated TATs for ${updates.length} tests`,
            });
          } catch (error) {
            console.error('Failed to update TATs:', error);
            toast({
              variant: "destructive",
              title: "Update Failed",
              description: error instanceof Error ? error.message : "Failed to update TATs"
            });
          }
        } else {
          toast({
            title: "No Updates",
            description: "No valid TAT updates found in the file",
          });
        }

        setUploadProgress(100);
      } catch (error) {
          console.error('Error processing file:', error);
          toast({
            variant: "destructive",
            title: "Error",
            description: error instanceof Error ? error.message : "Failed to process file"
          });
        } finally {
          // Clear the file input
          const fileInput = document.getElementById('tat-upload') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
          
          // Reset states after a delay
          setTimeout(() => {
            setIsUploading(false);
            setUploadProgress(0);
          }, 1000);
        }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to upload file"
      });
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);

      // Transform data for export
      const exportData = data.map(test => ({
        'Test ID': test.testID,
        'Test Name': test.testName,
        'Amount (ZWL$)': test.testAmount,
        'NORMAL TAT': test.normalTAT || '',  // Match the import format
        'URGENT TAT': test.urgentTAT || '',  // Match the import format
        'Type': test.isProfile ? 'Profile' : 'Test'
      }));

      // Create workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Tests');

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

      // Generate filename with current date
      const date = new Date().toISOString().split('T')[0];
      const fileName = `tests_list_${date}.xlsx`;

      // Save file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: "Test list has been exported to Excel"
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export data"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSync = async () => {
    try {
      setIsSyncingState(true);
      const syncedTests = await syncTestsWithFirebase();
      toast({
        title: "Sync Successful",
        description: `Successfully synchronized ${syncedTests.length} tests with Crelio`,
      });
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error instanceof Error 
          ? error.message 
          : "Failed to sync with server. Please check your connection and try again."
      });
    } finally {
      setIsSyncingState(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Tests</h2>
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Search tests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white 
                       hover:border-gray-400 focus:outline-none focus:ring-2 
                       focus:ring-primary-500 focus:border-primary-500
                       min-w-[200px]"
            />
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value === 'all' ? filteredData.length : parseInt(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white 
                       hover:border-gray-400 focus:outline-none focus:ring-2 
                       focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="20">20 rows</option>
              <option value="40">40 rows</option>
              <option value="80">80 rows</option>
              <option value="100">100 rows</option>
              <option value="all">All rows</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={handleExport}
            disabled={isExporting || data.length === 0}
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exporting...' : 'Export to Excel'}
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => document.getElementById('tat-upload')?.click()}
            disabled={isUploading}
          >
            <Upload className="w-4 h-4" />
            {isUploading ? 'Uploading...' : 'Upload TATs'}
          </Button>
          <input
            type="file"
            id="tat-upload"
            className="hidden"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
          />
          <Button
            onClick={handleSync}
            variant="outline"
            className="flex items-center gap-2"
            disabled={isSyncingState}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingState ? 'animate-spin' : ''}`} />
            {isSyncingState ? 'Syncing...' : 'Sync with Crelio'}
          </Button>
        </div>
      </div>

      {/* Progress bars */}
      {(isUploading || uploadProgress > 0) && (
        <div className="mb-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Uploading file</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <Progress value={uploadProgress} className="w-full" />
        </div>
      )}

      {(updateProgress > 0) && (
        <div className="mb-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Updating TATs</span>
            <span>{Math.round(updateProgress)}%</span>
          </div>
          <Progress value={updateProgress} className="w-full" />
        </div>
      )}

      <DataTable
        data={filteredData}
        columns={columns}
        title="Tests"
        pageSize={pageSize}
        onRowClick={onRowClick}
      />

      {filteredData.length === 0 && searchQuery && (
        <div className="text-center py-4 text-gray-500">
          No tests found matching "{searchQuery}"
        </div>
      )}
    </div>
  );
}