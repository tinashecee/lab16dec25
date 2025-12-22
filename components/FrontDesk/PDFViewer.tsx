interface PDFViewerProps {
  url: string;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ url }) => {
  return (
    <div className="w-full h-[600px]">
      <iframe
        src={`${url}#toolbar=0`}
        className="w-full h-full"
        title="PDF Preview"
      />
    </div>
  );
}; 