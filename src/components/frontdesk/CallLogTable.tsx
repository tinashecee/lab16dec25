import React, { useState, useEffect } from "react";
import { Search, Filter, Phone, Clock } from "lucide-react";
import { CallLog, callLogService } from "../../services/callLogService";
import { format } from "date-fns";
import DetailModal from "../common/DetailModal";
import { Eye } from "lucide-react";
import ExcelJS from "exceljs";
import { TableControls } from '../common/TableControls';
import { Pagination } from '../common/Pagination';
import { PDFViewer } from '../common/PDFViewer';
import { Modal } from '../common/Modal';

export default function CallLogTable() {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [purposeFilter, setPurposeFilter] = useState<string>("all");
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');

  useEffect(() => {
    fetchCalls();
  }, []);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      const data = await callLogService.getRecentCalls();
      setCalls(data);
    } catch (err) {
      setError("Failed to fetch call logs");
    } finally {
      setLoading(false);
    }
  };

  const priorityColors = {
    Normal: "bg-blue-50 text-blue-700 border-blue-100",
    Urgent: "bg-amber-50 text-amber-700 border-amber-100",
    Emergency: "bg-red-50 text-red-700 border-red-100",
  };

  const purposeColors = {
    inquiry: "bg-purple-50 text-purple-700",
    complaint: "bg-orange-50 text-orange-700",
    follow_up: "bg-green-50 text-green-700",
    sample_collection: "bg-blue-50 text-blue-700",
  };

  const filteredCalls = calls.filter((call) => {
    const matchesSearch =
      call.callerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.callerNumber.includes(searchTerm) ||
      call.center.toLowerCase().includes(searchTerm.toLowerCase());

    const callDate = new Date(call.date);
    const isInDateRange = (!startDate || callDate >= new Date(startDate)) &&
                         (!endDate || callDate <= new Date(endDate));

    return matchesSearch && isInDateRange;
  });

  const totalPages = itemsPerPage === -1 ? 1 : Math.ceil(filteredCalls.length / itemsPerPage);
  const paginatedCalls = itemsPerPage === -1
    ? filteredCalls
    : filteredCalls.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      );

  const handleViewDetails = (call: CallLog) => {
    setSelectedCall(call);
    setIsModalOpen(true);
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (format === 'pdf') {
      const pdfUrl = await generatePDF(filteredCalls);
      setPdfUrl(pdfUrl);
      setShowPdfPreview(true);
    } else {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Call Logs');
      
      if (filteredCalls.length > 0) {
        const headers = Object.keys(filteredCalls[0]);
        worksheet.addRow(headers);
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
        
        filteredCalls.forEach(item => {
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
      link.download = 'CallLogs.xlsx';
      link.click();
      window.URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="animate-pulse">Loading call logs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <TableControls
        onSearch={setSearchTerm}
        onDateRangeChange={(start, end) => {
          setStartDate(start ? format(start, 'yyyy-MM-dd') : '');
          setEndDate(end ? format(end, 'yyyy-MM-dd') : '');
          setCurrentPage(1);
        }}
        onExport={handleExport}
      />

      <div className="flex gap-4 mb-4 items-center">
        <label className="text-sm text-gray-700">View: </label>
        <select
          value={itemsPerPage}
          onChange={e => {
            const val = e.target.value;
            setCurrentPage(1);
            if (val === 'all') {
              setItemsPerPage(-1);
            } else {
              setItemsPerPage(Number(val));
            }
          }}
          className="rounded-md border border-gray-300 px-3 py-2"
        >
          {[20, 40, 60, 80, 100].map(num => (
            <option key={num} value={num}>{num}</option>
          ))}
          <option value="all">All</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date & Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Caller
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Center
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Purpose
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Notes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedCalls.map((call) => (
              <tr key={call.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-secondary-900">
                      {call.date}
                    </span>
                    <div className="flex items-center gap-1 text-sm text-secondary-500">
                      <Clock className="w-4 h-4" />
                      <span>{call.time}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-secondary-900">
                      {call.callerName}
                    </span>
                    <div className="flex items-center gap-1 text-sm text-secondary-500">
                      <Phone className="w-4 h-4" />
                      <span>{call.callerNumber}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-secondary-600">
                  {call.center}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      purposeColors[call.callPurpose]
                    }`}>
                    {call.callPurpose.replace("_", " ").toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 text-xs rounded-full border ${
                      priorityColors[call.priority]
                    }`}>
                    {call.priority}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-secondary-600 max-w-xs truncate">
                    {call.callNotes || "-"}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleViewDetails(call)}
                    className="text-blue-600 hover:underline">
                    <Eye className="w-4 h-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      <DetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Call Log Details"
        content={
          selectedCall && (
            <div>
              <p>
                <strong>Caller Name:</strong> {selectedCall.callerName}
              </p>
              <p>
                <strong>Caller Number:</strong> {selectedCall.callerNumber}
              </p>
              <p>
                <strong>Center:</strong> {selectedCall.center}
              </p>
              <p>
                <strong>Purpose:</strong> {selectedCall.callPurpose}
              </p>
              <p>
                <strong>Notes:</strong>{" "}
                {selectedCall.callNotes || "No notes available."}
              </p>
              <p>
                <strong>Date:</strong> {selectedCall.date}
              </p>
              <p>
                <strong>Time:</strong> {selectedCall.time}
              </p>
              <p>
                <strong>Logged At:</strong>{" "}
                {selectedCall.loggedAt.toDate().toLocaleString()}
              </p>
              <p>
                <strong>Priority:</strong> {selectedCall.priority}
              </p>
            </div>
          )
        }
      />

      {/* PDF Preview Modal */}
      <Modal
        isOpen={showPdfPreview}
        onClose={() => setShowPdfPreview(false)}
        title="PDF Preview"
      >
        <div className="h-[600px]">
          <PDFViewer url={pdfUrl} />
        </div>
        <div className="mt-4 flex justify-end gap-4">
          <button
            onClick={() => setShowPdfPreview(false)}
            className="px-4 py-2 text-sm text-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={() => downloadPDF(pdfUrl)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg"
          >
            Download PDF
          </button>
        </div>
      </Modal>
    </div>
  );
}
