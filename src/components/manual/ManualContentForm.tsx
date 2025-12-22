import React from 'react';
import FileUpload from '../common/FileUpload';
import { businessManualService } from '../../services/businessManualService';

export default function ManualContentForm({ sectionId }: { sectionId: string }) {
  const handleFileUpload = async (file: File) => {
    try {
      const attachment = await businessManualService.uploadAttachment(file, sectionId);
      // Add attachment to your form data or content
      console.log('Uploaded attachment:', attachment);
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      {/* Other form fields */}
      
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Attachments
        </label>
        <div className="mt-1">
          <FileUpload 
            onFileSelect={handleFileUpload}
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            maxSize={10}
            label="Attach Document"
          />
        </div>
      </div>
      
      {/* Other form fields */}
    </div>
  );
} 