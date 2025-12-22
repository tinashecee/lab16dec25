import React from 'react';
import { 
  Paperclip, 
  Download, 
  X, 
  FileText, 
  Image as ImageIcon,
  File 
} from 'lucide-react';
import { TaskAttachment } from '../../types/task';
import { fileStorageService } from '../../services/fileStorageService';

interface TaskAttachmentsProps {
  attachments: TaskAttachment[];
  canRemove?: boolean;
  onRemoveAttachment?: (attachmentId: string) => void;
}



export default function TaskAttachments({ 
  attachments, 
  canRemove = false, 
  onRemoveAttachment 
}: TaskAttachmentsProps) {
  console.log('TaskAttachments: Component rendered with attachments:', attachments);

  if (!attachments || attachments.length === 0) {
    console.log('TaskAttachments: No attachments, returning null');
    return null;
  }

  const handleDownload = (attachment: TaskAttachment) => {
    if (attachment.url && attachment.url.length > 0) {
      window.open(attachment.url, '_blank');
    } else {
      // Handle case where file hasn't been uploaded yet
      console.warn('File not yet uploaded to storage:', attachment.name);
      // Could show a message to the user that the file will be available after task creation
    }
  };

  return (
    <>
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-3">
          <Paperclip className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            Attachments ({attachments.length})
          </span>
        </div>

        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="text-xl flex-shrink-0">
                  {fileStorageService.isImageFile(attachment.type) ? (
                    <ImageIcon className="w-5 h-5 text-blue-500" />
                  ) : fileStorageService.isPdfFile(attachment.type) ? (
                    <FileText className="w-5 h-5 text-red-500" />
                  ) : (
                    <File className="w-5 h-5 text-gray-500" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {attachment.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {fileStorageService.formatFileSize(attachment.size)}
                    {attachment.uploadedAt && (
                      <span className="ml-2">
                        • {attachment.uploadedAt.toDate?.()?.toLocaleDateString() || 'Unknown date'}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => {
                    console.log('TaskAttachments: Download button clicked!');
                    handleDownload(attachment);
                  }}
                  className={`p-1 rounded ${
                    attachment.url && attachment.url.length > 0
                      ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                      : 'text-gray-300 cursor-not-allowed'
                  }`}
                  title={
                    attachment.url && attachment.url.length > 0
                      ? 'Download'
                      : 'File will be available after task creation'
                  }
                  disabled={!attachment.url || attachment.url.length === 0}
                >
                  <Download className="w-4 h-4" />
                </button>

                {canRemove && onRemoveAttachment && (
                  <button
                    onClick={() => onRemoveAttachment(attachment.id)}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded"
                    title="Remove"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
} 