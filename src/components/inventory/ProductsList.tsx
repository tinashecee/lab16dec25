import React, { useState } from "react";
import { Download, ArrowUpDown, Upload, ChevronLeft, ChevronRight, Printer, QrCode, Edit3 } from "lucide-react";
import { Product } from "../../lib/firestore/inventory";
import BulkProductUploadModal from "./BulkProductUploadModal";
import QuantityUpdateModal from "./QuantityUpdateModal";
import ProductMovementHistoryModal from "./ProductMovementHistoryModal";
import ExcelJS from "exceljs";
import { QRCodeSVG } from 'qrcode.react';
import QRModal from './QRModal';
import { useProducts } from "../../hooks/queries/inventory/useProducts";
import { useQueryClient } from "@tanstack/react-query";

interface ProductsListProps {
  searchQuery: string;
}

const PAGE_SIZE_OPTIONS = [20, 40, 60, 100, 'all'];

export default function ProductsList({ searchQuery }: ProductsListProps) {
  const { data: products = [], isLoading: loading, isError } = useProducts();
  const error = isError ? "Failed to fetch products" : null;
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isQuantityUpdateModalOpen, setIsQuantityUpdateModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(20);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showMovementHistory, setShowMovementHistory] = useState(false);
  const queryClient = useQueryClient();

  const refetchProducts = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory', 'products'] });
  };

  const [sortConfig, setSortConfig] = useState<{
    key: keyof Product;
    direction: "asc" | "desc";
  }>({ key: "name", direction: "asc" });

  const handleSort = (key: keyof Product) => {
    setSortConfig({
      key,
      direction:
        sortConfig.key === key && sortConfig.direction === "asc"
          ? "desc"
          : "asc",
    });
  };

  const sortedProducts = [...products].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === "asc" ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === "asc" ? 1 : -1;
    }
    return 0;
  });

  const filteredProducts = sortedProducts.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExport = async () => {
    try {
      // Convert products to the required format
      const exportData = products.map((product) => ({
        Number: product.code,
        Description: product.name,
        "Brand/Supplier": product.category.replace("Supplier: ", ""),
        "Date Added": product.createdAt.toDate().toLocaleDateString(),
        "Last Updated": product.lastUpdated.toDate().toLocaleDateString(),
        "Unit Measure": "Unit",
        Quantity: product.quantity,
        "Unit Price": product.unitPrice,
      }));

      // Create workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Products");

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

        // Set column widths
        const colWidths = [15, 40, 20, 15, 15, 15, 10, 10];
        worksheet.columns.forEach((column, index) => {
          column.width = colWidths[index] || 10;
        });
      }

      // Generate filename with current date
      const fileName = `products_export_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;

      // Save file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Failed to export data. Please try again.");
    }
  };

  // Create a template for bulk upload
  const handleDownloadTemplate = async () => {
    try {
      // Create sample data
      const templateData = [
        {
          Number: "PRD001",
          Description: "Sample Product Name",
          "Brand/Supplier": "Sample Supplier",
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
      const colWidths = [15, 40, 20];
      worksheet.columns.forEach((column, index) => {
        column.width = colWidths[index] || 10;
      });

      // Save file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = "product_upload_template.xlsx";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error creating template:", error);
      alert("Failed to create template. Please try again.");
    }
  };

  // Calculate pagination
  const totalItems = filteredProducts.length;
  const totalPages = pageSize === 'all' ? 1 : Math.ceil(totalItems / Number(pageSize));

  // Get current page items
  const getCurrentPageItems = () => {
    if (pageSize === 'all') return filteredProducts;
    
    const startIndex = (currentPage - 1) * Number(pageSize);
    const endIndex = startIndex + Number(pageSize);
    return filteredProducts.slice(startIndex, endIndex);
  };

  const paginatedProducts = getCurrentPageItems();

  const handlePrintQR = (product: Product) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const qrValue = `${window.location.origin}/issue-stock/${product.id}`;
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Print QR Code - ${product.name}</title>
            <style>
              body { font-family: system-ui; padding: 20px; }
              .container { text-align: center; }
              .product-info { margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="product-info">
                <h2>${product.name}</h2>
                <p>Code: ${product.code}</p>
              </div>
              <div>
                <img src="${new QRCodeSVG({ value: qrValue, size: 200 }).outerHTML}" />
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsBulkUploadModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-primary-600 hover:text-primary-700">
            <Upload className="w-4 h-4" />
            Bulk Upload
          </button>
          <button
            onClick={() => setIsQuantityUpdateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-primary-600 hover:text-primary-700">
            <Edit3 className="w-4 h-4" />
            Update Quantities
          </button>
          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-primary-600 hover:text-primary-700">
            <Download className="w-4 h-4" />
            Download Template
          </button>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm text-primary-600 hover:text-primary-700">
          <Download className="w-4 h-4" />
          Export to Excel
        </button>
      </div>

      {/* Page Size Selector */}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Show:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value));
              setCurrentPage(1);
            }}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size === 'all' ? 'All' : size}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-500">entries</span>
        </div>
      </div>

      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            {[
              { key: "code", label: "Code" },
              { key: "name", label: "Name" },
              { key: "category", label: "Category" },
              { key: "quantity", label: "Quantity" },
              { key: "unitPrice", label: "Unit Price" },
              { key: "lastUpdated", label: "Last Updated" },
              { key: "actions", label: "Actions" },
            ].map((column) => (
              <th
                key={column.key}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort(column.key as keyof Product)}>
                <div className="flex items-center gap-2">
                  {column.label}
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {paginatedProducts.map((product) => (
            <tr
              key={product.id}
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                setSelectedProduct(product);
                setShowMovementHistory(true);
              }}
            >
              <td className="px-6 py-4 text-sm text-secondary-900">
                {product.code}
              </td>
              <td className="px-6 py-4 text-sm text-secondary-900">
                {product.name}
              </td>
              <td className="px-6 py-4 text-sm text-secondary-600">
                {product.category}
              </td>
              <td className="px-6 py-4 text-sm text-secondary-900">
                {product.quantity}
              </td>
              <td className="px-6 py-4 text-sm text-secondary-900">
                ${product.unitPrice.toFixed(2)}
              </td>
              <td className="px-6 py-4 text-sm text-secondary-600">
                {product.lastUpdated.toDate().toLocaleString()}
              </td>
              <td className="px-6 py-4 text-sm text-secondary-600">
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowQRModal(true);
                    }}
                    className="p-1 text-primary-600 hover:bg-primary-50 rounded"
                    title="View QR Code"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handlePrintQR(product)}
                    className="p-1 text-primary-600 hover:bg-primary-50 rounded"
                    title="Print QR Code"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Showing {pageSize === 'all' ? 'all' : `${Math.min(((currentPage - 1) * Number(pageSize)) + 1, totalItems)} to ${Math.min(currentPage * Number(pageSize), totalItems)}`} of {totalItems} entries
        </div>
        
        {pageSize !== 'all' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  const distance = Math.abs(page - currentPage);
                  return distance === 0 || distance === 1 || page === 1 || page === totalPages;
                })
                .map((page, index, array) => {
                  if (index > 0 && array[index - 1] !== page - 1) {
                    return (
                      <React.Fragment key={`ellipsis-${page}`}>
                        <span className="px-3 py-1">...</span>
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 rounded-lg ${
                            currentPage === page
                              ? 'bg-primary-50 text-primary-600'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 rounded-lg ${
                        currentPage === page
                          ? 'bg-primary-50 text-primary-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Bulk Upload Modal */}
      {isBulkUploadModalOpen && (
        <BulkProductUploadModal
          onClose={() => setIsBulkUploadModalOpen(false)}
          onSuccess={() => {
            // Refresh the products list
            refetchProducts();
          }}
        />
      )}

      {/* Quantity Update Modal */}
      {isQuantityUpdateModalOpen && (
        <QuantityUpdateModal
          onClose={() => setIsQuantityUpdateModalOpen(false)}
          onSuccess={() => {
            // Refresh the products list
            refetchProducts();
          }}
        />
      )}

      {/* Add QR Modal */}
      {showQRModal && selectedProduct && (
        <QRModal
          product={selectedProduct}
          onClose={() => {
            setShowQRModal(false);
            setSelectedProduct(null);
          }}
        />
      )}

      {/* Product Movement History Modal */}
      {showMovementHistory && selectedProduct && (
        <ProductMovementHistoryModal
          product={selectedProduct}
          onClose={() => {
            setShowMovementHistory(false);
            setSelectedProduct(null);
          }}
        />
      )}
    </div>
  );
}
