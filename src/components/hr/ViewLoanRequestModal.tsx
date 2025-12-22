import React from "react";
import { X, Download } from "lucide-react";
import { LoanRequest } from "../../services/loanService";
import jsPDF from "jspdf";

interface ViewLoanRequestModalProps {
  request: LoanRequest;
  onClose: () => void;
}

const ViewLoanRequestModal: React.FC<ViewLoanRequestModalProps> = ({
  request,
  onClose,
}) => {
  const exportToPDF = () => {
    const doc = new jsPDF();
    const logo = new Image();
    logo.src = "/images/logo.png";

    // Add logo
    doc.addImage(logo, "PNG", 15, 15, 30, 30);

    // Add title
    doc.setFontSize(20);
    doc.text("Loan Request Details", 50, 30);

    // Add horizontal line
    doc.setLineWidth(0.5);
    doc.line(15, 45, 195, 45);

    // Add content
    doc.setFontSize(12);
    let y = 60;

    const addField = (label: string, value: string | number) => {
      doc.text(`${label}: ${value}`, 15, y);
      y += 10;
    };

    addField("Employee Name", request.employeeName);
    addField("Department", request.department);
    addField("Amount", `$${request.amount.toLocaleString()}`);
    addField("Purpose", request.purpose);
    addField("Repayment Period", `${request.repaymentMonths} months`);
    addField(
      "Status",
      request.status.charAt(0).toUpperCase() + request.status.slice(1)
    );
    addField("Created At", new Date(request.createdAt).toLocaleString());

    if (request.approvedBy) {
      addField("Approved By", request.approvedBy);
    }
    if (request.approvedAt) {
      addField("Approved At", new Date(request.approvedAt).toLocaleString());
    }

    doc.save(`loan-request-${request.id}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-3xl w-full">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div className="flex items-center space-x-4">
            <img
              src="/images/logo.png"
              alt="Company Logo"
              className="h-12 w-auto"
            />
            <h2 className="text-2xl font-semibold text-gray-900">
              Loan Request Details
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={exportToPDF}
              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 p-2">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Employee Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Name
                  </label>
                  <p className="text-gray-900">{request.employeeName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Department
                  </label>
                  <p className="text-gray-900">{request.department}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Employee ID
                  </label>
                  <p className="text-gray-900">{request.employeeId}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Loan Details
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Amount
                  </label>
                  <p className="text-gray-900 text-xl font-semibold">
                    ${request.amount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Purpose
                  </label>
                  <p className="text-gray-900">{request.purpose}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Repayment Period
                  </label>
                  <p className="text-gray-900">
                    {request.repaymentMonths} months
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Status Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Current Status
                  </label>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-1
                    ${
                      request.status === "PENDING"
                        ? "bg-yellow-100 text-yellow-800"
                        : request.status === "CONFIRMED"
                        ? "bg-blue-100 text-blue-800"
                        : request.status === "APPROVED"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                    {request.status.charAt(0).toUpperCase() +
                      request.status.slice(1)}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Created At
                  </label>
                  <p className="text-gray-900">
                    {new Date(request.createdAt).toLocaleString()}
                  </p>
                </div>
                {request.approvedBy && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Approved By
                    </label>
                    <p className="text-gray-900">{request.approvedBy}</p>
                  </div>
                )}
                {request.approvedAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Approved At
                    </label>
                    <p className="text-gray-900">
                      {new Date(request.approvedAt).toLocaleString()}
                    </p>
                  </div>
                )}
                {request.rejectionReason && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Rejection Reason
                    </label>
                    <p className="text-gray-900">{request.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewLoanRequestModal;
