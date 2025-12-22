import { useEffect, useState } from 'react';

interface PDFPreviewModalProps {
  url: string;
  onClose: () => void;
}

export default function PDFPreviewModal({ url, onClose }: PDFPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);

  useEffect(() => {
    // Reset loading state when URL changes
    setLoading(true);
    setLoadProgress(0);

    // Simulate progress while document loads
    const interval = setInterval(() => {
      setLoadProgress(prev => {
        // Cap progress at 90% until actual load completes
        if (prev < 90) {
          return prev + 10;
        }
        return prev;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [url]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg p-4 w-[95%] h-[95%] relative">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Report Preview</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700">
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        
        <div className="relative h-[calc(100%-3rem)]">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50">
              <div className="w-48 h-2 bg-gray-200 rounded-full mb-4">
                <div 
                  className="h-full bg-primary-600 rounded-full transition-all duration-300"
                  style={{ width: `${loadProgress}%` }}
                />
              </div>
              <div className="text-sm text-gray-600">
                Loading... {loadProgress}%
              </div>
            </div>
          )}
          <iframe
            src={`${url}#toolbar=0`}
            className="w-full h-full rounded border border-gray-200"
            onLoad={() => {
              setLoadProgress(100);
              setLoading(false);
            }}
          />
        </div>
      </div>
    </div>
  );
} 