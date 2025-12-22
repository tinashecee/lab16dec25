import React, { useState, useEffect } from "react";
import { X, Download, FileText, Calendar, TrendingUp, TrendingDown, Package, AlertCircle, Loader2 } from "lucide-react";
import { Product } from "../../lib/firestore/inventory";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";

interface ProductMovementHistoryModalProps {
  product: Product;
  onClose: () => void;
}

interface MovementRecord {
  id: string;
  date: Date;
  type: "Issue" | "Receipt" | "Adjustment" | "Requisition Issue";
  quantity: number;
  balance: number;
  reference: string;
  department?: string;
  issuedTo?: string;
  issuedBy?: string;
  notes?: string;
}

export default function ProductMovementHistoryModal({
  product,
  onClose,
}: ProductMovementHistoryModalProps) {
  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [filteredMovements, setFilteredMovements] = useState<MovementRecord[]>([]);

  useEffect(() => {
    fetchMovementHistory();
  }, [product.id]);

  useEffect(() => {
    filterMovements();
  }, [movements, startDate, endDate]);

  const fetchMovementHistory = async () => {
    try {
      setLoading(true);
      const allMovements: MovementRecord[] = [];

      // Fetch requisitions where this product was issued
      const requisitionsRef = collection(db, "requisitions");
      const requisitionsQuery = query(
        requisitionsRef,
        where("status", "in", ["Issued", "Delivered", "Completed"]),
        orderBy("issuedAt", "desc")
      );
      const requisitionsSnapshot = await getDocs(requisitionsQuery);

      requisitionsSnapshot.forEach((doc) => {
        const requisition = doc.data();
        if (requisition.issuedProducts) {
          const productIssue = requisition.issuedProducts.find(
            (p: any) => p.productId === product.id
          );
          if (productIssue && requisition.issuedAt) {
            allMovements.push({
              id: `req-${doc.id}`,
              date: requisition.issuedAt.toDate(),
              type: "Requisition Issue",
              quantity: -productIssue.issuedQuantity,
              balance: 0, // Will calculate later
              reference: requisition.dispatchNumber || doc.id,
              department: requisition.department,
              issuedBy: requisition.issuedBy,
              notes: requisition.issuanceNotes,
            });
          }
        }
      });

      // Fetch direct issue records
      const issueRecordsRef = collection(db, "issueRecords");
      const issueRecordsQuery = query(
        issueRecordsRef,
        where("productId", "==", product.id),
        orderBy("timestamp", "desc")
      );
      const issueRecordsSnapshot = await getDocs(issueRecordsQuery);

      issueRecordsSnapshot.forEach((doc) => {
        const record = doc.data();
        if (record.timestamp) {
          const timestamp = record.timestamp instanceof Timestamp 
            ? record.timestamp.toDate() 
            : new Date(record.timestamp);
          
          allMovements.push({
            id: `issue-${doc.id}`,
            date: timestamp,
            type: "Issue",
            quantity: -record.quantity,
            balance: 0,
            reference: `ISSUE-${doc.id.substring(0, 8)}`,
            department: record.department,
            issuedTo: record.issuedTo,
          });
        }
      });

      // Sort all movements by date (oldest first)
      allMovements.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Calculate running balance forward from oldest to newest
      // We need to work backwards from current balance to find starting balance
      // Then calculate forward to show balance after each movement
      
      // First, calculate what the balance was before all movements
      const totalIssued = allMovements
        .filter(m => m.quantity < 0)
        .reduce((sum, m) => sum + Math.abs(m.quantity), 0);
      const totalReceived = allMovements
        .filter(m => m.quantity > 0)
        .reduce((sum, m) => sum + m.quantity, 0);
      
      // Starting balance = current balance + total issued - total received
      const initialStock = product.quantity + totalIssued - totalReceived;
      
      // Add initial stock entry at product creation date
      const initialStockEntry: MovementRecord = {
        id: 'initial-stock',
        date: product.createdAt.toDate(),
        type: "Receipt",
        quantity: initialStock,
        balance: initialStock,
        reference: "Initial Stock",
        notes: "Product created with initial stock",
      };

      // Start with initial stock balance
      let runningBalance = initialStock;
      
      // Now calculate balance after each movement (forward)
      const movementsWithBalance = allMovements.map((movement) => {
        runningBalance += movement.quantity;
        return {
          ...movement,
          balance: runningBalance,
        };
      });

      // Combine initial stock entry with other movements and sort chronologically
      const allMovementsWithBalance = [initialStockEntry, ...movementsWithBalance];
      
      // Sort by date (oldest first) to ensure initial stock is first
      allMovementsWithBalance.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Reverse to show newest first
      allMovementsWithBalance.reverse();

      setMovements(allMovementsWithBalance);
    } catch (error) {
      console.error("Error fetching movement history:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterMovements = () => {
    let filtered = [...movements];

    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter((m) => m.date >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((m) => m.date <= end);
    }

    setFilteredMovements(filtered);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const margin = 15;

    // Header
    doc.setFontSize(16);
    doc.text("Product Movement History", margin, 20);
    doc.setFontSize(12);
    doc.text(`Product: ${product.name} (${product.code})`, margin, 30);
    doc.text(`Category: ${product.category}`, margin, 36);
    
    if (startDate || endDate) {
      doc.setFontSize(10);
      doc.text(
        `Date Range: ${startDate || "Start"} to ${endDate || "End"}`,
        margin,
        42
      );
    }

    // Prepare table data
    const tableData = filteredMovements.map((movement) => [
      movement.date.toLocaleDateString(),
      movement.date.toLocaleTimeString(),
      movement.type,
      movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity.toString(),
      movement.balance.toString(),
      movement.reference,
      movement.department || "-",
      movement.issuedBy || movement.issuedTo || "-",
    ]);

    // Add table
    autoTable(doc, {
      startY: startDate || endDate ? 48 : 42,
      head: [
        [
          "Date",
          "Time",
          "Type",
          "Quantity",
          "Balance",
          "Reference",
          "Department",
          "Issued To/By",
        ],
      ],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [250, 74, 64] },
    });

    // Save PDF
    const fileName = `product_movement_${product.code}_${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(fileName);
  };

  const exportToCSV = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Movement History");

    // Add headers
    const headers = [
      "Date",
      "Time",
      "Type",
      "Quantity",
      "Balance",
      "Reference",
      "Department",
      "Issued To/By",
      "Notes",
    ];
    worksheet.addRow(headers);
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data
    filteredMovements.forEach((movement) => {
      worksheet.addRow([
        movement.date.toLocaleDateString(),
        movement.date.toLocaleTimeString(),
        movement.type,
        movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity.toString(),
        movement.balance.toString(),
        movement.reference,
        movement.department || "",
        movement.issuedBy || movement.issuedTo || "",
        movement.notes || "",
      ]);
    });

    // Auto-fit columns
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

    const fileName = `product_movement_${product.code}_${new Date().toISOString().split("T")[0]}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "Issue":
      case "Requisition Issue":
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case "Receipt":
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case "Adjustment":
        return <Package className="w-4 h-4 text-blue-600" />;
      default:
        return <Package className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-white">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Package className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Product Movement History</h2>
                <p className="text-blue-100 mt-1">
                  {product.name} ({product.code})
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Product Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Current Stock:</span>
                <p className="text-lg font-bold text-gray-900">{product.quantity} {product.category}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Category:</span>
                <p className="text-gray-900">{product.category}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Unit Price:</span>
                <p className="text-gray-900">${product.unitPrice.toFixed(2)}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Last Updated:</span>
                <p className="text-gray-900">
                  {product.lastUpdated.toDate().toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Date Filters */}
          <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center gap-4">
              <Calendar className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Filter by Date Range</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="mb-6 flex justify-end gap-3">
            <button
              onClick={exportToCSV}
              disabled={filteredMovements.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={exportToPDF}
              disabled={filteredMovements.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4" />
              Export PDF
            </button>
          </div>

          {/* Movements Table */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
                <p className="text-gray-600">Loading movement history...</p>
              </div>
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No movement history found for this product</p>
              {startDate || endDate ? (
                <p className="text-sm text-gray-500 mt-2">
                  Try adjusting your date filters
                </p>
              ) : null}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Balance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reference
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Issued To/By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredMovements.map((movement, index) => (
                      <tr
                        key={movement.id}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>{movement.date.toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">
                            {movement.date.toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getMovementIcon(movement.type)}
                            <span className="text-sm font-medium text-gray-900">
                              {movement.type}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <span
                            className={`font-medium ${
                              movement.quantity > 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {movement.quantity > 0 ? "+" : ""}
                            {movement.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                          {movement.balance}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {movement.reference}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {movement.department || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {movement.issuedBy || movement.issuedTo || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Summary */}
          {filteredMovements.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium text-blue-800">Total Records:</span>
                  <p className="text-lg font-bold text-blue-900">{filteredMovements.length}</p>
                </div>
                <div>
                  <span className="font-medium text-blue-800">Total Issued:</span>
                  <p className="text-lg font-bold text-red-600">
                    {Math.abs(
                      filteredMovements
                        .filter((m) => m.quantity < 0)
                        .reduce((sum, m) => sum + Math.abs(m.quantity), 0)
                    )}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-blue-800">Total Received:</span>
                  <p className="text-lg font-bold text-green-600">
                    {filteredMovements
                      .filter((m) => m.quantity > 0)
                      .reduce((sum, m) => sum + m.quantity, 0)}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-blue-800">Current Balance:</span>
                  <p className="text-lg font-bold text-blue-900">{product.quantity}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

