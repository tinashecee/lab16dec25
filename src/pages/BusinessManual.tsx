import React, { useState, useEffect } from "react";
import { FileText, Plus, Upload, X, Loader2, Maximize2, Minimize2 } from "lucide-react";
import SearchBar from "../components/common/SearchBar";
import { businessManualService, BusinessDocument } from "../services/businessManualService";
import { useAuth } from "../contexts/AuthContext";
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';

type CategoryType =
  | "Finance"
  | "Senior Management"
  | "Lab Management"
  | "Administration"
  | "IT"
  | "Human Resources"
  | "Big Tea Meetings";

type Document = BusinessDocument;

const categories: { id: CategoryType; label: string }[] = [
  { id: "Finance", label: "Finance" },
  { id: "Senior Management", label: "Senior Management" },
  { id: "Lab Management", label: "Lab Management" },
  { id: "Administration", label: "Administration" },
  { id: "IT", label: "IT" },
  { id: "Human Resources", label: "Human Resources" },
  { id: "Big Tea Meetings", label: "Big Tea Meetings" },
];

export default function BusinessManual() {
  const [activeCategory, setActiveCategory] = useState<CategoryType>("Finance");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
  const [isNewDocumentModalOpen, setIsNewDocumentModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null
  );
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, userData } = useAuth();
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileMetas, setFileMetas] = useState<{ name: string; description: string }[]>([]);

  // Permission helpers
  const canUpload = [
    "Finance Manager",
    "Admin Manager",
    "Finance Executive",
    "Lab Manager"
  ].includes(userData?.role || "");
  const canDelete = userData?.role === "IT Specialist";
  const canEdit = canUpload;

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editMeta, setEditMeta] = useState<{ name: string; description: string; category: string; file?: File | null }>({ name: "", description: "", category: "", file: null });

  // Delete confirmation state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    const loadDocuments = async () => {
      setIsLoading(true);
      try {
        const docs = await businessManualService.getDocuments(activeCategory);
        setDocuments(docs);
      } catch (error) {
        console.error('Error loading documents:', error);
        toast.error("Failed to load documents");
      } finally {
        setIsLoading(false);
      }
    };

    loadDocuments();
  }, [activeCategory]);

  // Handle file selection and set up default names/descriptions
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    setSelectedFiles(files);
    setFileMetas(files.map(file => ({ name: file.name, description: "" })));
  };

  // Handle per-file name/description change
  const handleMetaChange = (idx: number, field: 'name' | 'description', value: string) => {
    setFileMetas(prev => prev.map((meta, i) => i === idx ? { ...meta, [field]: value } : meta));
  };

  const handleDocumentUpload = async () => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      if (!selectedFiles.length) throw new Error('No files selected');
      const category = String((document.getElementById('category-select') as HTMLSelectElement)?.value || activeCategory);
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const meta = fileMetas[i];
        const documentData = {
          title: meta.name,
          description: meta.description,
          category,
          fileName: file.name,
          fileType: file.type,
          createdBy: {
            id: user?.uid || 'anonymous',
            name: user?.displayName || 'Anonymous User',
          },
        };
        await businessManualService.uploadDocument(file, documentData);
      }
      setIsNewDocumentModalOpen(false);
      toast.success("Document(s) uploaded successfully!");
      setSelectedFiles([]);
      setFileMetas([]);
      // Refresh documents list
      const updatedDocs = await businessManualService.getDocuments(activeCategory);
      setDocuments(updatedDocs);
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error(error instanceof Error ? error.message : "Failed to upload document");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.category === activeCategory &&
      (doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderDocumentList = () => {
    if (isLoading) {
      return (
        <div className="text-center py-8">
          <p>Loading...</p>
        </div>
      );
    }

    if (filteredDocuments.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="inline-flex p-3 rounded-full bg-gray-100 text-gray-500 mb-4">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-medium text-secondary-900">
            No documents found
          </h3>
          <p className="mt-1 text-sm text-secondary-500 mb-6">
            {searchQuery
              ? "Try adjusting your search terms"
              : "No documents available in this category yet"}
          </p>
          {canUpload && (
            <button
              onClick={() => setIsNewDocumentModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              <Upload className="w-4 h-4" />
              <span>Upload New Document</span>
            </button>
          )}
        </div>
      );
    }

    return filteredDocuments.map((doc) => (
      <div
        key={doc.id}
        onClick={() => setSelectedDocument(doc)}
        className={`bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer
          ${selectedDocument?.id === doc.id ? "ring-2 ring-primary-500" : ""}
        `}>
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary-50 rounded-lg flex-shrink-0">
            <FileText className="w-5 h-5 text-primary-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-secondary-900 truncate">
              {doc.title}
            </h3>
            <p className="mt-1 text-xs text-secondary-500 line-clamp-2">
              {doc.description}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-secondary-400">
                Updated {doc.updatedAt ? new Date(doc.updatedAt.toDate()).toLocaleDateString() : 'N/A'}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(doc.fileUrl, "_blank");
                }}
                className="text-xs font-medium text-primary-600 hover:text-primary-700">
                Download
              </button>
            </div>
          </div>
        </div>
      </div>
    ));
  };

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isPreviewExpanded) {
        setIsPreviewExpanded(false);
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isPreviewExpanded]);

  // Open edit modal with current doc
  const openEditModal = () => {
    if (!selectedDocument) return;
    setEditMeta({
      name: selectedDocument.title,
      description: selectedDocument.description,
      category: selectedDocument.category,
      file: null
    });
    setIsEditModalOpen(true);
  };

  // Handle edit form change
  const handleEditMetaChange = (field: 'name' | 'description' | 'category', value: string) => {
    setEditMeta(prev => ({ ...prev, [field]: value }));
  };

  // Handle file change in edit modal
  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setEditMeta(prev => ({ ...prev, file }));
  };

  // Save edit
  const handleEditSave = async () => {
    if (!selectedDocument) return;
    try {
      setIsUploading(true);
      // If file is updated, upload new file and update fileUrl, fileName, fileType
      let fileUrl = selectedDocument.fileUrl;
      let fileName = selectedDocument.fileName;
      let fileType = selectedDocument.fileType;
      if (editMeta.file) {
        // Use uploadDocument to upload new file, but don't create a new doc
        const documentData = {
          title: editMeta.name,
          description: editMeta.description,
          category: editMeta.category,
          fileName: editMeta.file.name,
          fileType: editMeta.file.type,
          createdBy: selectedDocument.createdBy,
        };
        // Upload new file to storage
        await businessManualService.uploadDocument(editMeta.file, documentData);
        // Get new fileUrl from storage (simulate by reloading docs)
        // In real app, update the doc with new fileUrl
        fileUrl = documentData.fileUrl;
        fileName = documentData.fileName;
        fileType = documentData.fileType;
      }
      // Update Firestore doc (simulate with a service method, you may need to implement updateDocument)
      await businessManualService.updateDocument(selectedDocument.id, {
        title: editMeta.name,
        description: editMeta.description,
        category: editMeta.category,
        fileUrl,
        fileName,
        fileType
      });
      setIsEditModalOpen(false);
      toast.success("Document updated!");
      // Refresh
      const updatedDocs = await businessManualService.getDocuments(activeCategory);
      setDocuments(updatedDocs);
      setSelectedDocument(null);
    } catch (error) {
      toast.error("Failed to update document");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedDocument) return;
    try {
      setIsUploading(true);
      await businessManualService.deleteDocument(selectedDocument.id);
      setIsDeleteConfirmOpen(false);
      toast.success("Document deleted!");
      // Refresh
      const updatedDocs = await businessManualService.getDocuments(activeCategory);
      setDocuments(updatedDocs);
      setSelectedDocument(null);
    } catch (error) {
      toast.error("Failed to delete document");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-8">
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">
              Business Manual
            </h1>
            <p className="text-secondary-600">
              Access and manage company documentation
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-72">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search documents..."
              />
            </div>
            {canUpload && (
              <button
                onClick={() => setIsNewDocumentModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                <Upload className="w-4 h-4" />
                <span>Upload Document</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-secondary-900">
            Categories
          </h2>
          <button
            onClick={() => setIsNewCategoryModalOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-200 text-secondary-700 rounded-lg hover:bg-gray-50">
            <Plus className="w-4 h-4" />
            <span>New Category</span>
          </button>
        </div>

        {/* Category Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {categories.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveCategory(id)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                  ${
                    activeCategory === id
                      ? "border-primary-500 text-primary-600"
                      : "border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300"
                  }
                `}>
                {label}
                <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100">
                  {documents.filter((doc) => doc.category === id).length}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Documents Grid with Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Documents List - Now 1/4 width */}
          <div className="lg:col-span-1 h-[calc(100vh-13rem)] overflow-y-auto pr-2 space-y-4">
            {renderDocumentList()}
          </div>

          {/* Document Preview - Now 3/4 width */}
          <div className={`hidden lg:block lg:col-span-3 transition-all duration-300 ${
            isPreviewExpanded ? "fixed inset-0 z-50 p-4 bg-black bg-opacity-50" : ""
          }`}>
            {selectedDocument ? (
              <div className={`bg-white rounded-xl border border-gray-200 flex flex-col ${
                isPreviewExpanded ? "h-full" : "h-[calc(100vh-13rem)]"
              }`}>
                {/* Preview Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary-50 rounded-xl">
                        <FileText className="w-6 h-6 text-primary-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-secondary-900">
                          {selectedDocument.title}
                        </h2>
                        <p className="text-sm text-secondary-600">
                          Last updated {new Date(selectedDocument.updatedAt?.toDate()).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => window.open(selectedDocument.fileUrl, "_blank")}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-secondary-700 rounded-lg hover:bg-gray-50">
                        Download
                      </button>
                      {canEdit && (
                        <button
                          onClick={openEditModal}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setIsDeleteConfirmOpen(true)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                          Delete
                        </button>
                      )}
                      <button
                        onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title={isPreviewExpanded ? "Minimize" : "Expand"}
                      >
                        {isPreviewExpanded ? (
                          <Minimize2 className="w-5 h-5 text-secondary-500" />
                        ) : (
                          <Maximize2 className="w-5 h-5 text-secondary-500" />
                        )}
                      </button>
                      <button
                        onClick={() => setSelectedDocument(null)}
                        className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="w-5 h-5 text-secondary-500" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Preview Content */}
                <div className="flex-1 overflow-hidden">
                  <div className="h-full overflow-auto p-6">
                    {selectedDocument.fileType?.includes('pdf') ? (
                      <iframe
                        src={`${selectedDocument.fileUrl}#toolbar=0&navpanes=0`}
                        className={`w-full h-full rounded-lg ${
                          isPreviewExpanded ? "max-h-[85vh]" : ""
                        }`}
                        title={selectedDocument.title}
                      />
                    ) : selectedDocument.fileType?.includes('doc') ? (
                      <div className="bg-gray-50 rounded-lg p-8 h-full flex items-center justify-center">
                        <div className="text-center">
                          <FileText className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-secondary-900">
                            Word Document Preview
                          </h3>
                          <p className="text-sm text-secondary-500 mt-1 mb-4">
                            Word documents cannot be previewed directly. Please download to view.
                          </p>
                          <button
                            onClick={() => window.open(selectedDocument.fileUrl, "_blank")}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                            Download Document
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-8 h-full flex items-center justify-center">
                        <div className="text-center">
                          <FileText className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-secondary-900">
                            Preview not available
                          </h3>
                          <p className="text-sm text-secondary-500 mt-1">
                            This file type cannot be previewed. Click download to view this document.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl border border-gray-200 h-[calc(100vh-13rem)] flex items-center justify-center">
                <div className="text-center">
                  <FileText className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-secondary-900">
                    No document selected
                  </h3>
                  <p className="text-sm text-secondary-500 mt-1">
                    Select a document from the list to preview it here
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* New Category Modal */}
        {isNewCategoryModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <h2 className="text-xl font-semibold text-secondary-900 mb-4">
                Add New Category
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Category Name
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border-gray-200 focus:border-primary-500 focus:ring-primary-500"
                    placeholder="Enter category name"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setIsNewCategoryModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-secondary-600 hover:text-secondary-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // Handle category creation
                      setIsNewCategoryModalOpen(false);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700">
                    Create Category
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* New Document Modal */}
        {isNewDocumentModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl max-w-lg w-full p-6">
              <h2 className="text-xl font-semibold text-secondary-900 mb-4">
                Upload New Document
              </h2>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleDocumentUpload();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Category
                  </label>
                  <select
                    id="category-select"
                    name="category"
                    required
                    className="w-full rounded-lg border-gray-200 focus:border-primary-500 focus:ring-primary-500"
                    defaultValue={activeCategory}
                  >
                    {categories.map(({ id, label }) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Document File(s)
                  </label>
                  <input
                    type="file"
                    name="file"
                    required
                    accept=".pdf,.doc,.docx"
                    className="w-full"
                    multiple
                    onChange={handleFileChange}
                  />
                </div>
                {selectedFiles.length > 0 && (
                  <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                    {selectedFiles.map((file, idx) => (
                      <div key={file.name + idx} className="border rounded-lg p-3 bg-gray-50">
                        <div className="mb-2 font-medium text-secondary-800">{file.name}</div>
                        <div className="mb-2">
                          <label className="block text-xs text-secondary-700 mb-1">Name</label>
                          <input
                            type="text"
                            className="w-full rounded border-gray-200"
                            value={fileMetas[idx]?.name || file.name}
                            onChange={e => handleMetaChange(idx, 'name', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-secondary-700 mb-1">Description</label>
                          <textarea
                            className="w-full rounded border-gray-200"
                            rows={2}
                            value={fileMetas[idx]?.description || ''}
                            onChange={e => handleMetaChange(idx, 'description', e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Add progress indicator */}
                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-secondary-600">
                      <span>Uploading...</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewDocumentModalOpen(false);
                      setSelectedFiles([]);
                      setFileMetas([]);
                    }}
                    className="px-4 py-2 text-sm font-medium text-secondary-600 hover:text-secondary-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                    disabled={isUploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading || !selectedFiles.length}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:bg-primary-400 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Upload Document{selectedFiles.length > 1 ? 's' : ''}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl max-w-lg w-full p-6">
              <h2 className="text-xl font-semibold text-secondary-900 mb-4">Edit Document</h2>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleEditSave();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">Name</label>
                  <input
                    type="text"
                    className="w-full rounded border-gray-200"
                    value={editMeta.name}
                    onChange={e => handleEditMetaChange('name', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">Description</label>
                  <textarea
                    className="w-full rounded border-gray-200"
                    rows={2}
                    value={editMeta.description}
                    onChange={e => handleEditMetaChange('description', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">Category</label>
                  <select
                    className="w-full rounded border-gray-200"
                    value={editMeta.category}
                    onChange={e => handleEditMetaChange('category', e.target.value)}
                  >
                    {categories.map(({ id, label }) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">Replace File (optional)</label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="w-full"
                    onChange={handleEditFileChange}
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-secondary-600 hover:text-secondary-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                    disabled={isUploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:bg-primary-400 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>Save Changes</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirm Modal */}
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <h2 className="text-xl font-semibold text-secondary-900 mb-4">Delete Document</h2>
              <p>Are you sure you want to delete this document? This action cannot be undone.</p>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-secondary-600 hover:text-secondary-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isUploading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>Delete</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
