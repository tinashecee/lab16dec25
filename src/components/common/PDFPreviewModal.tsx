import { X } from "lucide-react";
import { useState } from "react";

interface PDFPreviewModalProps {
  url: string;
  onClose: () => void;
  download?: boolean;
  print?: boolean;
}

export default function PDFPreviewModal({ url, onClose, download, print }: PDFPreviewModalProps) {
  const [loading, setLoading] = useState(true);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-6xl bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="text-lg font-medium">Document Preview</h3>
            <div className="flex items-center gap-2">
              {download && (
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'document.pdf';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="rounded-full p-2 hover:bg-gray-100 focus:outline-none"
                  title="Download PDF"
                >
                  <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" /></svg>
                </button>
              )}
              {/* Open in New Tab button */}
              <button
                onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                className="rounded-full p-2 hover:bg-gray-100 focus:outline-none"
                title="Open in New Tab"
              >
                <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3h7m0 0v7m0-7L10 14m-4 0h4v4" /></svg>
              </button>
              {print && (
                <button
                  onClick={() => {
                    const iframe = document.createElement('iframe');
                    iframe.style.display = 'none';
                    iframe.src = url;
                    document.body.appendChild(iframe);
                    iframe.onload = function () {
                      setTimeout(() => {
                        iframe.contentWindow?.focus();
                        iframe.contentWindow?.print();
                        document.body.removeChild(iframe);
                      }, 500);
                    };
                  }}
                  className="rounded-full p-2 hover:bg-gray-100 focus:outline-none"
                  title="Print PDF"
                >
                  <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9V4a2 2 0 012-2h8a2 2 0 012 2v5M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2m-6 0v4m0 0h4m-4 0H8" /></svg>
                </button>
              )}
              <button
                onClick={onClose}
                className="rounded-full p-2 hover:bg-gray-100 focus:outline-none"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* PDF Viewer */}
          <div className="relative" style={{ height: "calc(100vh - 200px)" }}>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
              </div>
            )}
            <iframe
              src={url}
              className="w-full h-full rounded-b-lg"
              onLoad={() => setLoading(false)}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 