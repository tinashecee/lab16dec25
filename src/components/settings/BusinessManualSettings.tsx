import React, { useState } from "react";
import { FileText, Plus, Download, Trash2, Upload } from "lucide-react";

interface Document {
  id: string;
  title: string;
  category: string;
  uploadedBy: string;
  uploadDate: string;
  fileSize: string;
  fileType: string;
}

export default function BusinessManualSettings() {
  // Mock data instead of Firebase
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: "1",
      title: "Sample Collection SOP",
      category: "Laboratory Procedures",
      uploadedBy: "Admin User",
      uploadDate: "2024-03-15",
      fileSize: "2.5 MB",
      fileType: "PDF",
    },
    {
      id: "2",
      title: "Quality Control Guidelines",
      category: "Quality Control",
      uploadedBy: "Lab Manager",
      uploadDate: "2024-03-14",
      fileSize: "1.8 MB",
      fileType: "PDF",
    },
    {
      id: "3",
      title: "Safety Protocol 2024",
      category: "Safety Guidelines",
      uploadedBy: "Safety Officer",
      uploadDate: "2024-03-10",
      fileSize: "3.2 MB",
      fileType: "PDF",
    },
  ]);

  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = [
    "Laboratory Procedures",
    "Quality Control",
    "Safety Guidelines",
    "Administrative Procedures",
    "Equipment Maintenance",
  ];

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Mock document creation instead of Firebase upload
    const newDocument: Document = {
      id: (documents.length + 1).toString(),
      title: file.name,
      category: selectedCategory !== "all" ? selectedCategory : "Uncategorized",
      uploadedBy: "Current User",
      uploadDate: new Date().toISOString().split("T")[0],
      fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      fileType: file.type.split("/")[1].toUpperCase(),
    };

    setDocuments([newDocument, ...documents]);
  };

  const handleDelete = (id: string) => {
    setDocuments(documents.filter((doc) => doc.id !== id));
  };

  const filteredDocuments =
    selectedCategory === "all"
      ? documents
      : documents.filter((doc) => doc.category === selectedCategory);

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-secondary-900">
            Business Manual
          </h2>
          <p className="text-secondary-600">
            Manage standard operating procedures and documentation
          </p>
        </div>
        <div className="relative">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleUpload}
            accept=".pdf,.doc,.docx,.txt"
          />
          <label
            htmlFor="file-upload"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Upload Document</span>
          </label>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="all">All Categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Document Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Uploaded By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Upload Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredDocuments.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-secondary-500">
                  No documents found. Upload a document to get started.
                </td>
              </tr>
            ) : (
              filteredDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-secondary-400" />
                      <div>
                        <p className="font-medium text-secondary-900">
                          {doc.title}
                        </p>
                        <p className="text-sm text-secondary-500">
                          {doc.fileType} • {doc.fileSize}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-secondary-600">
                    {doc.category}
                  </td>
                  <td className="px-6 py-4 text-secondary-600">
                    {doc.uploadedBy}
                  </td>
                  <td className="px-6 py-4 text-secondary-600">
                    {doc.uploadDate}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-secondary-400 hover:text-secondary-600 rounded-lg">
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 text-red-400 hover:text-red-600 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
