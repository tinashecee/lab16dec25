import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Upload, Trash2, Plus, FileSpreadsheet } from 'lucide-react';
import ExcelJS from 'exceljs';

interface ICDCode {
  id: string;
  code: string;
  description: string;
}

export default function ICDCodesSettings() {
  const [icdCodes, setICDCodes] = useState<ICDCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadICDCodes();
  }, []);

  const loadICDCodes = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'icd_codes'));
      const codes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ICDCode[];
      setICDCodes(codes);
    } catch (error) {
      console.error('Error loading ICD codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      
      const worksheet = workbook.worksheets[0];
      const jsonData: { code: string; description: string }[] = [];
      
      // Get headers from first row
      const headers: string[] = [];
      worksheet.getRow(1).eachCell((cell) => {
        headers.push(cell.value?.toString() || '');
      });
      
      // Process data rows
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row
        const rowData: any = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber - 1];
          if (header) {
            rowData[header] = cell.value;
          }
        });
        if (rowData.code && rowData.description) {
          jsonData.push({ code: rowData.code, description: rowData.description });
        }
      });

      // Batch add to Firestore
      const icdCodesRef = collection(db, 'icd_codes');
      for (const row of jsonData) {
        await addDoc(icdCodesRef, {
          code: row.code,
          description: row.description
        });
      }

      await loadICDCodes(); // Reload the list
    } catch (error) {
      console.error('Error uploading ICD codes:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'icd_codes', id));
      await loadICDCodes(); // Reload the list
    } catch (error) {
      console.error('Error deleting ICD code:', error);
    }
  };

  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template');
    
    // Add headers
    worksheet.addRow(['code', 'description']);
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Add example row
    worksheet.addRow(['A00.0', 'Sample ICD Code Description']);
    
    // Set column widths
    worksheet.columns.forEach((column, index) => {
      column.width = index === 0 ? 15 : 40;
    });
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'icd_codes_template.xlsx';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">ICD Codes</h2>
          <p className="text-sm text-gray-500">Manage International Classification of Diseases (ICD) codes</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Download Template
          </button>
          <label className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 cursor-pointer">
            <Upload className="w-4 h-4" />
            Import Excel
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ICD Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {icdCodes.map((code) => (
              <tr key={code.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {code.code}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {code.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleDelete(code.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 