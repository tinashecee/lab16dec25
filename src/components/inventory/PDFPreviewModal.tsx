import React from 'react';
import { X, Download } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { RequisitionPDF } from './RequisitionPDF';
import { Requisition } from '../../lib/firestore/inventory';
import { pdf } from '@react-pdf/renderer';

interface PDFPreviewModalProps {
  requisition: Requisition;
  onClose: () => void;
}

export default function PDFPreviewModal({ requisition, onClose }: PDFPreviewModalProps) {
  const [pdfUrl, setPdfUrl] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const generatePreview = async () => {
      try {
        const blob = await pdf(<RequisitionPDF requisition={requisition} />).toBlob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        setLoading(false);
      } catch (error) {
        console.error('Error generating PDF preview:', error);
      }
    };

    generatePreview();

    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [requisition]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Preview Requisition {requisition.dispatchNumber}
          </h3>
          <div className="flex items-center gap-2">
            <PDFDownloadLink
              document={<RequisitionPDF requisition={requisition} />}
              fileName={`requisition-${requisition.dispatchNumber}.pdf`}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
            >
              {({ loading: downloadLoading }) => (
                <>
                  <Download className="w-4 h-4" />
                  {downloadLoading ? 'Generating...' : 'Download'}
                </>
              )}
            </PDFDownloadLink>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 bg-gray-50 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <iframe
              src={pdfUrl}
              className="w-full h-full rounded-lg border border-gray-200"
              title="PDF Preview"
            />
          )}
        </div>
      </div>
    </div>
  );
} 