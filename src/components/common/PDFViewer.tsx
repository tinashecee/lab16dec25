import React from 'react';

interface PDFViewerProps {
  url: string;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ url }) => {
  return (
    <div className="w-full h-full">
      <object
        data={url}
        type="application/pdf"
        className="w-full h-full"
      >
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">
            Unable to display PDF. Please{' '}
            <a 
              href={url}
              download
              className="text-primary-600 hover:text-primary-700"
            >
              download
            </a>{' '}
            to view it.
          </p>
        </div>
      </object>
    </div>
  );
}; 