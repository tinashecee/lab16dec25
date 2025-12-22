import React, { useState } from "react";
import { X, Upload, FileSpreadsheet } from "lucide-react";
import ExcelJS from "exceljs";
import { addProduct } from "../../lib/firestore/inventory";
import { Timestamp } from "firebase/firestore";

interface BulkProductUploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

// Match your Excel columns exactly
interface ExcelRow {
  Number: string;
  Description: string;
  "Brand/Supplier": string;
}

export default function BulkProductUploadModal({
  onClose,
  onSuccess,
}: BulkProductUploadModalProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<ExcelRow[]>([]);
  const [file, setFile] = useState<File | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFile(file);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      
      const worksheet = workbook.worksheets[0];
      const jsonData: ExcelRow[] = [];
      
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
        if (Object.keys(rowData).length > 0) {
          jsonData.push(rowData as ExcelRow);
        }
      });
      
      setPreview(jsonData);
    } catch (error) {
      console.error("Error processing file:", error);
      alert("Error processing file. Please check the format.");
    }
  };

  const handleUpload = async () => {
    if (!preview.length) return;

    setUploading(true);
    try {
      const timestamp = Timestamp.now();

      // Upload products in batches of 10
      const batchSize = 10;
      for (let i = 0; i < preview.length; i += batchSize) {
        const batch = preview.slice(i, i + batchSize);
        await Promise.all(
          batch.map((row) =>
            addProduct({
              code: row.Number,
              name: row.Description, // Using Description as product name
              category: `Supplier: ${row["Brand/Supplier"]}`,
              quantity: 0, // Default value
              unitPrice: 0, // Default value
              createdBy: "Current User", // Replace with actual user ID
            })
          )
        );
      }

      alert(`Successfully uploaded ${preview.length} products`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error uploading products:", error);
      alert("Error uploading products. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl max-w-4xl w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-secondary-900">
            Bulk Upload Products
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-secondary-500" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Upload Excel File
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
              <div className="space-y-1 text-center">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label className="relative cursor-pointer rounded-md font-medium text-primary-600 hover:text-primary-500">
                    <span>Upload a file</span>
                    <input
                      type="file"
                      className="sr-only"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">Excel files only</p>
              </div>
            </div>
          </div>

          {/* Preview Table */}
          {preview.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-secondary-900 mb-3">
                Preview ({preview.length} products)
              </h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Number
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Description
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Brand/Supplier
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {preview.slice(0, 5).map((row, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-secondary-900">
                          {row.Number}
                        </td>
                        <td className="px-4 py-2 text-sm text-secondary-900">
                          {row.Description}
                        </td>
                        <td className="px-4 py-2 text-sm text-secondary-900">
                          {row["Brand/Supplier"]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 5 && (
                  <div className="px-4 py-2 bg-gray-50 text-sm text-secondary-600">
                    And {preview.length - 5} more items...
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-secondary-600 hover:text-secondary-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading || !preview.length}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 ${
                uploading || !preview.length
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-primary-600 hover:bg-primary-700"
              }`}>
              <Upload className="w-4 h-4" />
              {uploading ? "Uploading..." : "Upload Products"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
