import React, { useState } from "react";
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle, Download } from "lucide-react";
import ExcelJS from "exceljs";
import { updateProduct, getProducts, Product } from "../../lib/firestore/inventory";

interface QuantityUpdateModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

// Excel columns for quantity update
interface QuantityUpdateRow {
  "Product Code": string;
  "Description": string;
  "Quantity": number;
}

interface UpdateResult {
  success: boolean;
  productCode: string;
  productName: string;
  oldQuantity: number;
  newQuantity: number;
  error?: string;
}

export default function QuantityUpdateModal({
  onClose,
  onSuccess,
}: QuantityUpdateModalProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<QuantityUpdateRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [updateResults, setUpdateResults] = useState<UpdateResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFile(file);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      
      const worksheet = workbook.worksheets[0];
      const jsonData: QuantityUpdateRow[] = [];
      
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
          jsonData.push(rowData as QuantityUpdateRow);
        }
      });
      
      // Validate required columns
      if (jsonData.length > 0) {
        const firstRow = jsonData[0];
        if (!firstRow["Product Code"] || !firstRow["Description"] || firstRow["Quantity"] === undefined) {
          alert("Invalid file format. Required columns: Product Code, Description, Quantity");
          return;
        }
      }
      
      setPreview(jsonData);
      setUpdateResults([]);
      setShowResults(false);
    } catch (error) {
      console.error("Error processing file:", error);
      alert("Error processing file. Please check the format.");
    }
  };

  const handleUpdate = async () => {
    if (!preview.length) return;

    setUploading(true);
    setUpdateResults([]);
    
    try {
      // Get all current products
      const currentProducts = await getProducts();
      const productMap = new Map(currentProducts.map(p => [p.code, p]));
      
      const results: UpdateResult[] = [];
      
      // Process each row
      for (const row of preview) {
        const productCode = row["Product Code"]?.toString().trim();
        const description = row["Description"]?.toString().trim();
        const newQuantity = Number(row["Quantity"]);
        
        if (!productCode || !description || isNaN(newQuantity)) {
          results.push({
            success: false,
            productCode: productCode || "N/A",
            productName: description || "N/A",
            oldQuantity: 0,
            newQuantity: newQuantity || 0,
            error: "Invalid data format"
          });
          continue;
        }
        
        const existingProduct = productMap.get(productCode);
        
        if (!existingProduct) {
          results.push({
            success: false,
            productCode,
            productName: description,
            oldQuantity: 0,
            newQuantity,
            error: "Product not found"
          });
          continue;
        }
        
        // Verify description matches (case-insensitive)
        if (existingProduct.name.toLowerCase() !== description.toLowerCase()) {
          results.push({
            success: false,
            productCode,
            productName: description,
            oldQuantity: existingProduct.quantity,
            newQuantity,
            error: "Description mismatch"
          });
          continue;
        }
        
        try {
          // Update the product quantity
          await updateProduct(existingProduct.id, { quantity: newQuantity });
          
          results.push({
            success: true,
            productCode,
            productName: description,
            oldQuantity: existingProduct.quantity,
            newQuantity
          });
        } catch (error) {
          results.push({
            success: false,
            productCode,
            productName: description,
            oldQuantity: existingProduct.quantity,
            newQuantity,
            error: "Update failed"
          });
        }
      }
      
      setUpdateResults(results);
      setShowResults(true);
      
      // Check if all updates were successful
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      
      if (successCount === totalCount) {
        alert(`Successfully updated ${successCount} product quantities!`);
        onSuccess();
        onClose();
      } else {
        alert(`Updated ${successCount} out of ${totalCount} products. Check results for details.`);
      }
      
    } catch (error) {
      console.error("Error updating quantities:", error);
      alert("Error updating quantities. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      // Create sample data
      const templateData = [
        {
          "Product Code": "PRD001",
          "Description": "Sample Product Name",
          "Quantity": 100,
        },
      ];

      // Create workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Template");

      const headers = Object.keys(templateData[0]);
      worksheet.addRow(headers);
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      templateData.forEach(item => {
        worksheet.addRow(Object.values(item));
      });

      // Set column widths
      const colWidths = [15, 40, 10];
      worksheet.columns.forEach((column, index) => {
        column.width = colWidths[index] || 10;
      });

      // Save file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = "quantity_update_template.xlsx";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error creating template:", error);
      alert("Failed to create template. Please try again.");
    }
  };

  const resetModal = () => {
    setPreview([]);
    setFile(null);
    setUpdateResults([]);
    setShowResults(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-secondary-900">
            Update Product Quantities
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-secondary-500" />
          </button>
        </div>

        {!showResults ? (
          <div className="space-y-6">
            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">Instructions:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Upload an Excel file with columns: Product Code, Description, Quantity</li>
                <li>• Product Code must match exactly with existing products</li>
                <li>• Description must match the product name (case-insensitive)</li>
                <li>• Quantity should be a positive number</li>
                <li>• Download the template to see the correct format</li>
              </ul>
            </div>

            {/* File Upload */}
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
                          Product Code
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Description
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          New Quantity
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {preview.slice(0, 10).map((row, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-secondary-900">
                            {row["Product Code"]}
                          </td>
                          <td className="px-4 py-2 text-sm text-secondary-900">
                            {row["Description"]}
                          </td>
                          <td className="px-4 py-2 text-sm text-secondary-900">
                            {row["Quantity"]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.length > 10 && (
                    <div className="px-4 py-2 bg-gray-50 text-sm text-secondary-600">
                      And {preview.length - 10} more items...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-4 py-2 text-sm font-medium text-secondary-600 hover:text-secondary-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                  <Download className="w-4 h-4 inline mr-2" />
                  Download Template
                </button>
                {preview.length > 0 && (
                  <button
                    type="button"
                    onClick={resetModal}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                    Clear
                  </button>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-secondary-600 hover:text-secondary-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={uploading || !preview.length}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 ${
                    uploading || !preview.length
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-primary-600 hover:bg-primary-700"
                  }`}>
                  <Upload className="w-4 h-4" />
                  {uploading ? "Updating..." : "Update Quantities"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Results View */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-secondary-900">
                Update Results
              </h3>
              <button
                onClick={resetModal}
                className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700">
                Upload Another File
              </button>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Product Code
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Product Name
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Old Quantity
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      New Quantity
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Error
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {updateResults.map((result, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2">
                        {result.success ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-secondary-900">
                        {result.productCode}
                      </td>
                      <td className="px-4 py-2 text-sm text-secondary-900">
                        {result.productName}
                      </td>
                      <td className="px-4 py-2 text-sm text-secondary-900">
                        {result.oldQuantity}
                      </td>
                      <td className="px-4 py-2 text-sm text-secondary-900">
                        {result.newQuantity}
                      </td>
                      <td className="px-4 py-2 text-sm text-red-600">
                        {result.error || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
