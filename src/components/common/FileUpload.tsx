import React, { useState, useRef } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface FileUploadProps {
  onFileSelect: (file: File) => Promise<void>;
  accept?: string;
  maxSize?: number; // in MB
  label?: string;
}

export default function FileUpload({ 
  onFileSelect, 
  accept = '.pdf,.doc,.docx', 
  maxSize = 5, 
  label = 'Upload Document' 
}: FileUploadProps) {
  console.log('FileUpload component rendered with props:', { accept, maxSize, label });
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`File size must be less than ${maxSize}MB`);
      return false;
    }

    // Check file type
    const fileType = file.name.split('.').pop()?.toLowerCase();
    const acceptedTypes = accept.split(',').map(type => 
      type.trim().replace('.', '').toLowerCase()
    );

    if (!fileType || !acceptedTypes.includes(fileType)) {
      toast.error(`Only ${accept} files are allowed`);
      return false;
    }

    return true;
  };

  const handleFile = async (file: File) => {
    console.log('FileUpload: handleFile called with:', file.name);
    if (!validateFile(file)) return;

    setSelectedFile(file);
    setIsUploading(true);

    try {
      console.log('FileUpload: calling onFileSelect with file:', file.name);
      await onFileSelect(file);
      toast.success('Document attached successfully');
      setSelectedFile(null);
    } catch (error) {
      toast.error('Failed to attach document');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      await handleFile(file);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('FileUpload: handleFileInput called');
    const file = e.target.files?.[0];
    console.log('FileUpload: selected file:', file?.name);
    if (file) {
      await handleFile(file);
      // Clear the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="w-full">
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 ${
          isDragging 
            ? 'border-primary-500 bg-primary-50' 
            : 'border-gray-300 hover:border-primary-500'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept={accept}
          onChange={handleFileInput}
        />

        <div className="text-center">
          <Upload 
            className={`mx-auto h-12 w-12 ${
              isDragging ? 'text-primary-500' : 'text-gray-400'
            }`}
          />
          <div className="mt-4">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              {label}
            </button>
            <p className="mt-1 text-sm text-gray-500">
              or drag and drop your file here
            </p>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {`${accept.split(',').join(', ')} up to ${maxSize}MB`}
          </p>
        </div>

        {selectedFile && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-700">{selectedFile.name}</span>
              </div>
              {isUploading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600" />
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto" />
              <p className="mt-2 text-sm text-gray-600">Uploading document...</p>
            </div>
          </div>
        )}
      </div>


    </div>
  );
} 