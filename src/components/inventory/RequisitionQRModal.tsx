import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer } from 'lucide-react';
import { Requisition } from '../../lib/firestore/inventory';

interface RequisitionQRModalProps {
  requisition: Requisition;
  onClose: () => void;
}

export default function RequisitionQRModal({ requisition, onClose }: RequisitionQRModalProps) {
  const qrValue = `${window.location.origin}/issue-requisition/${requisition.id}`;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print QR Code - Requisition ${requisition.dispatchNumber}</title>
            <style>
              body { font-family: system-ui; padding: 20px; }
              .container { text-align: center; }
              .requisition-info { margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="requisition-info">
                <h2>Requisition ${requisition.dispatchNumber}</h2>
                <p>Department: ${requisition.department}</p>
                <p>Requested By: ${requisition.requestedBy}</p>
                <p>Date: ${requisition.requestDate.toDate().toLocaleDateString()}</p>
              </div>
              ${document.getElementById('qr-code')?.innerHTML}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Requisition QR Code</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center" id="qr-code">
          <QRCodeSVG
            value={qrValue}
            size={200}
            level="H"
            includeMargin
            className="mx-auto"
          />
          <div className="mt-4 text-sm text-gray-600">
            <p className="font-medium">Requisition {requisition.dispatchNumber}</p>
            <p>Department: {requisition.department}</p>
            <p>Requested By: {requisition.requestedBy}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>
    </div>
  );
} 