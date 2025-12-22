import React from "react";
import { X } from "lucide-react";

interface NewProductModalProps {
  onClose: () => void;
}

export default function NewProductModal({ onClose }: NewProductModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl max-w-lg w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-secondary-900">
            Add New Product
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-secondary-500" />
          </button>
        </div>
        <p>New product form coming soon...</p>
      </div>
    </div>
  );
}
