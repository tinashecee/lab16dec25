import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, Printer } from 'lucide-react';
import { Product } from '../../lib/firestore/inventory';

interface QRModalProps {
  product: Product;
  onClose: () => void;
}

export default function QRModal({ product, onClose }: QRModalProps) {
  const qrValue = `${window.location.origin}/issue-stock/${product.id}`;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
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
          <h3 className="text-lg font-semibold text-gray-900">Product QR Code</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
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
            <p className="font-medium">{product.name}</p>
            <p>Code: {product.code}</p>
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