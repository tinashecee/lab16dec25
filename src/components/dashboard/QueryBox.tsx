import React, { useState, useEffect, useMemo } from 'react';
import { MessageSquare, Plus, Search, Filter, CheckCircle, Clock, AlertCircle, X, ChevronLeft, ChevronRight, Paperclip, Download, Trash2, Send, FileText } from 'lucide-react';
import { queryService } from '../../services/queryService';
import { Query, NewQuery, QueryAttachment } from '../../types/query';
import { useAuth } from '../../contexts/AuthContext';
import { Timestamp } from 'firebase/firestore';
import { fileStorageService } from '../../services/fileStorageService';
import toast from 'react-hot-toast';
import { useQueries } from '../../hooks/queries/queryBox/useQueries';
import { useCreateQuery, useAddSolution, useUpdateQueryStatus, useAddComment, useAddAttachment } from '../../hooks/mutations/queryBox';
import { useQueryClient } from '@tanstack/react-query';

type TabType = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

interface QueryItemProps {
  query: Query;
  onViewDetails: (query: Query) => void;
  showSolution?: boolean;
}

function QueryItem({ query, onViewDetails, showSolution = false }: QueryItemProps) {
  const getStatusColor = (status: Query['status']) => {
    switch (status) {
      case 'Open':
        return 'bg-blue-100 text-blue-800';
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'Resolved':
        return 'bg-green-100 text-green-800';
      case 'Closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: Query['priority']) => {
    switch (priority) {
      case 'Low':
        return 'text-gray-600';
      case 'Normal':
        return 'text-blue-600';
      case 'High':
        return 'text-orange-600';
      case 'Urgent':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: Query['status']) => {
    switch (status) {
      case 'Resolved':
        return <CheckCircle className="w-4 h-4" />;
      case 'In Progress':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => onViewDetails(query)}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{query.title}</h3>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{query.description}</p>
        </div>
        <div className={`ml-4 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(query.status)}`}>
          {getStatusIcon(query.status)}
          {query.status}
        </div>
      </div>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <span className="text-gray-600">
            <span className="font-medium">Category:</span> {query.category}
          </span>
          <span className={`font-medium ${getPriorityColor(query.priority)}`}>
            {query.priority}
          </span>
        </div>
        <span className="text-gray-500 text-xs">
          {query.createdAt?.toDate?.().toLocaleDateString()}
        </span>
      </div>
      {query.solution && showSolution && (
        <div className="mt-3 pt-3 border-t border-gray-200 bg-green-50 rounded p-3">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="font-medium text-sm text-green-900">Solution</span>
          </div>
          <p className="text-sm text-gray-700 line-clamp-3">{query.solution.text}</p>
          <div className="text-xs text-green-700 mt-2">
            By {query.solution.providedByName} • {query.solution.createdAt?.toDate?.().toLocaleDateString()}
          </div>
        </div>
      )}
      {query.solution && !showSolution && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="w-4 h-4" />
            <span className="font-medium">Solution provided by {query.solution.providedByName}</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface QueryDetailsModalProps {
  query: Query | null;
  isOpen: boolean;
  onClose: () => void;
  onAddSolution: (queryId: string, solution: string) => void;
  onUpdateStatus: (queryId: string, status: Query['status']) => void;
  onAddComment: (queryId: string, comment: string) => void;
  onAddAttachment: (queryId: string, file: File) => void;
  onRefresh: () => void;
  currentUserId: string;
  currentUserName: string;
}

function QueryDetailsModal({ query, isOpen, onClose, onAddSolution, onUpdateStatus, onAddComment, onAddAttachment, onRefresh, currentUserId, currentUserName }: QueryDetailsModalProps) {
  const [solution, setSolution] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  if (!isOpen || !query) return null;

  const handleAddSolution = async () => {
    if (!solution.trim()) {
      toast.error('Please enter a solution');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddSolution(query.id, solution);
      setSolution('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    setIsAddingComment(true);
    try {
      await onAddComment(query.id, comment);
      setComment('');
      onRefresh();
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setIsUploadingFile(true);
    try {
      await onAddAttachment(query.id, file);
      toast.success('File uploaded successfully');
      onRefresh();
      // Reset file input
      e.target.value = '';
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const getPriorityColor = (priority: Query['priority']) => {
    switch (priority) {
      case 'Low':
        return 'text-gray-600';
      case 'Normal':
        return 'text-blue-600';
      case 'High':
        return 'text-orange-600';
      case 'Urgent':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">{query.title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Meta Information */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Status:</span>{' '}
                <span className={`font-medium ${query.status === 'Resolved' ? 'text-green-600' : 'text-blue-600'}`}>
                  {query.status}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Priority:</span>{' '}
                <span className={`font-medium ${getPriorityColor(query.priority)}`}>
                  {query.priority}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Category:</span>{' '}
                <span className="text-gray-900">{query.category}</span>
              </div>
            </div>

            {/* Submitted By */}
            <div className="text-sm">
              <span className="font-medium text-gray-700">Submitted by:</span>{' '}
              <span className="text-gray-900">{query.submittedByName}</span>
              <span className="text-gray-500 ml-2">
                on {query.createdAt?.toDate?.().toLocaleDateString()}
              </span>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{query.description}</p>
            </div>

            {/* Solution Section */}
            {query.solution ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="font-medium text-green-900">Solution</h3>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap mb-2">{query.solution.text}</p>
                <div className="text-sm text-green-700">
                  Provided by <span className="font-medium">{query.solution.providedByName}</span> on{' '}
                  {query.solution.createdAt?.toDate?.().toLocaleDateString()}
                </div>
              </div>
            ) : (
              query.status !== 'Closed' && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Add Solution</h3>
                  <textarea
                    value={solution}
                    onChange={(e) => setSolution(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows={4}
                    placeholder="Describe the solution to this query..."
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={handleAddSolution}
                      disabled={isSubmitting || !solution.trim()}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Solution'}
                    </button>
                  </div>
                </div>
              )
            )}

            {/* Attachments Section */}
            {query.attachments && query.attachments.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Attachments</h3>
                <div className="space-y-2">
                  {query.attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gray-600" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{attachment.name}</div>
                          <div className="text-xs text-gray-500">
                            {fileStorageService.formatFileSize(attachment.size)} • 
                            Uploaded by {attachment.uploadedByName}
                          </div>
                        </div>
                      </div>
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        <Download className="w-5 h-5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload New Attachment */}
            {query.status !== 'Closed' && (
              <div>
                <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors w-fit">
                  <Paperclip className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {isUploadingFile ? 'Uploading...' : 'Attach File'}
                  </span>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploadingFile}
                  />
                </label>
                <p className="text-xs text-gray-500 mt-1">Max file size: 10MB</p>
              </div>
            )}

            {/* Comments Section */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Comments ({query.comments?.length || 0})</h3>
              
              {/* Comment List */}
              {query.comments && query.comments.length > 0 && (
                <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                  {query.comments.map((comment) => (
                    <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="text-sm font-medium text-gray-900">{comment.userName}</div>
                        <div className="text-xs text-gray-500">
                          {comment.createdAt?.toDate?.().toLocaleDateString()} at{' '}
                          {comment.createdAt?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Comment */}
              {query.status !== 'Closed' && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={isAddingComment || !comment.trim()}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {isAddingComment ? 'Sending...' : 'Send'}
                  </button>
                </div>
              )}
            </div>

            {/* Status Update */}
            {query.status !== 'Closed' && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Update Status</h3>
                <div className="flex gap-2">
                  {query.status === 'Open' && (
                    <button
                      onClick={() => onUpdateStatus(query.id, 'In Progress')}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                    >
                      Mark as In Progress
                    </button>
                  )}
                  {query.status !== 'Closed' && (
                    <button
                      onClick={() => onUpdateStatus(query.id, 'Closed')}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Close Query
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface NewQueryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (query: NewQuery) => void;
}

function NewQueryModal({ isOpen, onClose, onSubmit }: NewQueryModalProps) {
  const { userData } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'General' as Query['category'],
    priority: 'Normal' as Query['priority'],
  });
  const [attachments, setAttachments] = useState<Array<QueryAttachment & { file: File }>>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    files.forEach(file => {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max file size is 10MB`);
        return;
      }

      const attachment: QueryAttachment & { file: File } = {
        id: `temp_${Date.now()}_${Math.random()}`,
        name: file.name,
        url: URL.createObjectURL(file),
        size: file.size,
        type: file.type,
        uploadedAt: Timestamp.now(),
        uploadedBy: userData?.id || '',
        uploadedByName: userData?.name || '',
        file: file
      };

      setAttachments(prev => [...prev, attachment]);
    });

    // Reset file input
    e.target.value = '';
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => {
      const attachment = prev.find(a => a.id === id);
      if (attachment?.url.startsWith('blob:')) {
        URL.revokeObjectURL(attachment.url);
      }
      return prev.filter(a => a.id !== id);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) {
      toast.error('User not authenticated');
      return;
    }

    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newQuery: NewQuery = {
      ...formData,
      submittedBy: userData.id,
      submittedByName: userData.name,
      attachments: attachments.length > 0 ? attachments : undefined
    };

    onSubmit(newQuery);
    
    // Clean up blob URLs
    attachments.forEach(att => {
      if (att.url.startsWith('blob:')) {
        URL.revokeObjectURL(att.url);
      }
    });
    
    setFormData({
      title: '',
      description: '',
      category: 'General',
      priority: 'Normal',
    });
    setAttachments([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Submit New Query</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Brief title of your query"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={4}
                placeholder="Describe your query or challenge in detail"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as Query['category'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="Equipment">Equipment</option>
                  <option value="Sample Processing">Sample Processing</option>
                  <option value="Reporting">Reporting</option>
                  <option value="Safety">Safety</option>
                  <option value="Quality Control">Quality Control</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as Query['priority'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="Low">Low</option>
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* File Attachments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>
              
              {/* Attachment List */}
              {attachments.length > 0 && (
                <div className="space-y-2 mb-3">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gray-600" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{attachment.name}</div>
                          <div className="text-xs text-gray-500">
                            {fileStorageService.formatFileSize(attachment.size)}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(attachment.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Button */}
              <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors w-fit">
                <Paperclip className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Attach Files</span>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  multiple
                />
              </label>
              <p className="text-xs text-gray-500 mt-1">Max file size: 10MB per file</p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Submit Query
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function QueryBox() {
  const { userData } = useAuth();
  const { data: queries = [], isLoading: loading } = useQueries();
  const qc = useQueryClient();
  const createMutation = useCreateQuery();
  const addSolutionMutation = useAddSolution();
  const updateStatusMutation = useUpdateQueryStatus();
  const addCommentMutation = useAddComment();
  const addAttachmentMutation = useAddAttachment();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('Open');
  const [categoryFilter, setCategoryFilter] = useState<Query['category'] | 'All'>('All');
  const [isNewQueryModalOpen, setIsNewQueryModalOpen] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Use useMemo to compute filtered queries instead of useEffect to avoid infinite loops
  const filteredQueries = useMemo(() => {
    let filtered = [...queries];

    // Tab filter (status)
    filtered = filtered.filter((q) => q.status === activeTab);

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (q) =>
          q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== 'All') {
      filtered = filtered.filter((q) => q.category === categoryFilter);
    }

    return filtered;
  }, [queries, searchTerm, activeTab, categoryFilter]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab, categoryFilter]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredQueries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedQueries = filteredQueries.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1); // Reset to first page
  };

  const handleSubmitQuery = async (newQuery: NewQuery) => {
    try {
      await createMutation.mutateAsync(newQuery);
      toast.success('Query submitted successfully!');
      setIsNewQueryModalOpen(false);
    } catch (error) {
      console.error('Error submitting query:', error);
      toast.error('Failed to submit query');
    }
  };

  const handleAddSolution = async (queryId: string, solutionText: string) => {
    if (!userData) {
      toast.error('User not authenticated');
      return;
    }

    try {
      await addSolutionMutation.mutateAsync({ queryId, solutionText, userId: userData.id, userName: userData.name });
      toast.success('Solution added successfully!');
      qc.invalidateQueries({ queryKey: ['queries'] });
      setIsDetailsModalOpen(false);
    } catch (error) {
      console.error('Error adding solution:', error);
      toast.error('Failed to add solution');
    }
  };

  const handleUpdateStatus = async (queryId: string, status: Query['status']) => {
    try {
      await updateStatusMutation.mutateAsync({ queryId, status });
      toast.success('Query status updated!');
      qc.invalidateQueries({ queryKey: ['queries'] });
      setIsDetailsModalOpen(false);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleAddComment = async (queryId: string, commentText: string) => {
    if (!userData) {
      toast.error('User not authenticated');
      return;
    }

    try {
      const commentData = {
        id: `comment_${Date.now()}`,
        text: commentText,
        userId: userData.id,
        userName: userData.name,
        createdAt: Timestamp.now()
      };
      await addCommentMutation.mutateAsync({ queryId, commentData });
      toast.success('Comment added successfully!');
      // Refresh the selected query
      const updatedQuery = await queryService.getQueryById(queryId);
      if (updatedQuery) {
        setSelectedQuery(updatedQuery);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const handleAddAttachment = async (queryId: string, file: File) => {
    if (!userData) {
      toast.error('User not authenticated');
      return;
    }

    try {
      await addAttachmentMutation.mutateAsync({ queryId, file, userId: userData.id, userName: userData.name });
      // Refresh the selected query
      const updatedQuery = await queryService.getQueryById(queryId);
      if (updatedQuery) {
        setSelectedQuery(updatedQuery);
      }
    } catch (error) {
      console.error('Error adding attachment:', error);
      throw error;
    }
  };

  const handleRefreshQuery = async () => {
    if (selectedQuery) {
      const updatedQuery = await queryService.getQueryById(selectedQuery.id);
      if (updatedQuery) {
        setSelectedQuery(updatedQuery);
      }
    }
    qc.invalidateQueries({ queryKey: ['queries'] });
  };

  const handleViewDetails = (query: Query) => {
    setSelectedQuery(query);
    setIsDetailsModalOpen(true);
  };

  const openQueries = queries.filter((q) => q.status === 'Open').length;
  const inProgressQueries = queries.filter((q) => q.status === 'In Progress').length;
  const resolvedQueries = queries.filter((q) => q.status === 'Resolved').length;
  const closedQueries = queries.filter((q) => q.status === 'Closed').length;

  const getTabCount = (tab: TabType) => {
    switch (tab) {
      case 'Open':
        return openQueries;
      case 'In Progress':
        return inProgressQueries;
      case 'Resolved':
        return resolvedQueries;
      case 'Closed':
        return closedQueries;
      default:
        return 0;
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <MessageSquare className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Lab Operations Query Box</h2>
                <p className="text-sm text-gray-600">Post queries, share solutions, and build knowledge</p>
              </div>
            </div>
            <button
              onClick={() => setIsNewQueryModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Query
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-900">{openQueries}</div>
              <div className="text-sm text-blue-700">Open</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-yellow-900">{inProgressQueries}</div>
              <div className="text-sm text-yellow-700">In Progress</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-900">{resolvedQueries}</div>
              <div className="text-sm text-green-700">Resolved</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-900">{closedQueries}</div>
              <div className="text-sm text-gray-700">Closed</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            {(['Open', 'In Progress', 'Resolved', 'Closed'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {tab}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {getTabCount(tab)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search queries..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as Query['category'] | 'All')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none"
              >
                <option value="All">All Categories</option>
                <option value="Equipment">Equipment</option>
                <option value="Sample Processing">Sample Processing</option>
                <option value="Reporting">Reporting</option>
                <option value="Safety">Safety</option>
                <option value="Quality Control">Quality Control</option>
                <option value="General">General</option>
              </select>
            </div>

            {/* Items per page */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none"
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>
          </div>
        </div>

        {/* Query List */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading queries...</div>
          ) : filteredQueries.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No {activeTab.toLowerCase()} queries found</p>
              {activeTab === 'Open' && (
                <button
                  onClick={() => setIsNewQueryModalOpen(true)}
                  className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
                >
                  Submit the first query
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-4">
                {paginatedQueries.map((query) => (
                  <QueryItem 
                    key={query.id} 
                    query={query} 
                    onViewDetails={handleViewDetails}
                    showSolution={activeTab === 'Closed' || activeTab === 'Resolved'}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredQueries.length)} of {filteredQueries.length} queries
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        // Show first page, last page, current page, and pages around current
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              className={`px-3 py-1 rounded-lg transition-colors ${
                                currentPage === page
                                  ? 'bg-primary-600 text-white'
                                  : 'border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        } else if (
                          page === currentPage - 2 ||
                          page === currentPage + 2
                        ) {
                          return <span key={page} className="px-2 text-gray-400">...</span>;
                        }
                        return null;
                      })}
                    </div>

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <NewQueryModal
        isOpen={isNewQueryModalOpen}
        onClose={() => setIsNewQueryModalOpen(false)}
        onSubmit={handleSubmitQuery}
      />

      <QueryDetailsModal
        query={selectedQuery}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        onAddSolution={handleAddSolution}
        onUpdateStatus={handleUpdateStatus}
        onAddComment={handleAddComment}
        onAddAttachment={handleAddAttachment}
        onRefresh={handleRefreshQuery}
        currentUserId={userData?.id || ''}
        currentUserName={userData?.name || ''}
      />
    </>
  );
}

