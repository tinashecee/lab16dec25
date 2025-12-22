import React, { useState, useEffect } from 'react';
import { 
  X, Clock, MessageSquare, Send, Trash2, Search, Paperclip 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { taskService } from '../../services/taskService';
import { Task, TaskAttachment } from '../../types/task';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';
import { Timestamp, serverTimestamp } from 'firebase/firestore';
import { User as UserType, userService } from '../../services/userService';
import TaskAttachments from './TaskAttachments';
import TaskTimeline from './TaskTimeline';
import FileUpload from '../common/FileUpload';
import { fileStorageService } from '../../services/fileStorageService';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task;
  isNewTask?: boolean;
  onSubmit?: (task: Omit<Task, 'id' | 'status' | 'createdAt'>) => void;
  onUpdate?: (updates: Partial<Task>) => void;
  onAccept?: () => void;
  onComplete?: () => void;
}

export default function TaskDetailModal({ 
  isOpen, 
  onClose, 
  task, 
  isNewTask,
  onSubmit,
  onUpdate,
  onAccept,
  onComplete 
}: TaskDetailModalProps) {
  const { user, userData } = useAuth();
  const [formData, setFormData] = useState<Partial<Task>>(
    isNewTask 
      ? {
          title: '',
          description: '',
          priority: 'Normal',
          dueDate: new Date().toISOString().split('T')[0],
          status: 'Pending',
          attachments: []
        }
      : task || {}
  );

  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [users, setUsers] = useState<UserType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UserType[]>([]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        console.log('TaskDetailModal: Loading users');
        // Create an array to hold all users
        let allUsers: UserType[] = [];
        let lastDoc = null;
        let hasMore = true;
        
        // Loop to fetch all users using pagination
        while (hasMore) {
          const result = await userService.getUsers(lastDoc, {
            status: "Active" // Only fetch active users
          });
          
          allUsers = [...allUsers, ...result.users];
          lastDoc = result.lastDoc;
          hasMore = result.hasMore;
        }
        
        console.log(`TaskDetailModal: Loaded ${allUsers.length} users`);
        setUsers(allUsers);
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };
    loadUsers();
  }, []);

  useEffect(() => {
    const searchUsers = async () => {
      setIsSearching(true);
      try {
        if (!searchTerm.trim()) {
          // If no search term, show all users
          setSearchResults(users);
        } else {
          // Client-side filtering instead of API call
          const filtered = users.filter(user => 
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (user.department && user.department.toLowerCase().includes(searchTerm.toLowerCase()))
          );
          setSearchResults(filtered);
        }
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchResults(users);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, users]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.dueDate) {
      console.log('TaskDetailModal: Form validation failed - missing required fields');
      return; // Don't submit if required fields are missing
    }
    
    if (isCreatingTask) return; // Prevent double submission
    
    console.log('TaskDetailModal: Form submitted with user:', user);
    
    try {
      setIsCreatingTask(true);
      
      // Upload files first if there are any
      const processedAttachments: TaskAttachment[] = [];
      
      if (formData.attachments && formData.attachments.length > 0) {
        console.log('TaskDetailModal: Uploading', formData.attachments.length, 'files...');
        const filesToUpload = formData.attachments.filter(att => (att as TaskAttachment & { file?: File }).file);
        
        if (filesToUpload.length > 0) {
          toast.loading(`Uploading ${filesToUpload.length} file${filesToUpload.length > 1 ? 's' : ''}...`, {
            id: 'upload-progress'
          });
        }
        
        for (const attachment of formData.attachments) {
          const attachmentWithFile = attachment as TaskAttachment & { file?: File };
          
          if (attachmentWithFile.file) {
            console.log('TaskDetailModal: Uploading file:', attachmentWithFile.name);
            // Upload the file to Firebase Storage
            const tempTaskId = `temp_${Date.now()}`;
            const uploadedAttachment = await fileStorageService.uploadTaskAttachment(
              tempTaskId,
              attachmentWithFile.file,
              userData?.id || ''
            );
            processedAttachments.push(uploadedAttachment);
          } else if (attachment.url && !attachment.url.startsWith('blob:')) {
            // Already uploaded attachment
            processedAttachments.push(attachment);
          }
        }
        
        if (filesToUpload.length > 0) {
          toast.dismiss('upload-progress');
        }
      }
      
      // Include the current user's name as the createdBy field (not ID)
      const taskSubmitData = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority || 'Normal',
        dueDate: formData.dueDate,
        assignedUsers: formData.assignedUsers || [],
        createdBy: userData?.name || user?.email?.split('@')[0] || 'Unknown User', // Store name instead of ID
        assignedBy: userData?.name || user?.email?.split('@')[0] || 'Unknown User', // Use name instead of ID for assignedBy
        attachments: processedAttachments,
        updatedAt: serverTimestamp() as unknown as Timestamp
      };
      
      console.log('TaskDetailModal: Submitting task with data:', {
        ...taskSubmitData,
        updatedAt: 'serverTimestamp'
      });
      
      onSubmit?.(taskSubmitData);
      onClose();
      toast.success('Task created successfully');
    } catch (error) {
      console.error('Error creating task:', error);
      // Keep modal open on error so user can try again
      toast.error('Failed to create task. Please try again.');
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleAcceptTask = () => {
    onAccept?.();
    onClose();
  };

  const handleCompleteTask = () => {
    onComplete?.();
    onClose();
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !task) return;

    try {
      setIsSubmitting(true);
      
      // Make sure we're using the correct user name
      const commentData = {
        id: `comment-${Date.now()}`,
        text: newComment.trim(),
        userId: userData?.id || '',
        userName: userData?.name || user?.email?.split('@')[0] || 'Anonymous', // Fallback if name isn't available
        createdAt: Timestamp.now(),
      };

      // Optimistically update the UI
      onUpdate?.({
        ...task,
        comments: [...(task.comments || []), commentData]
      });

      // Clear input immediately
      setNewComment('');

      // Save the comment
      await taskService.addComment(task.id, commentData);

      // Fetch the latest task data
      const updatedTask = await taskService.getTaskById(task.id);
      if (updatedTask) {
        onUpdate?.(updatedTask);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      // Revert optimistic update on error
      const updatedTask = await taskService.getTaskById(task.id);
      if (updatedTask) {
        onUpdate?.(updatedTask);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      console.log('TaskDetailModal: handleFileUpload called with:', file.name);
      // Store the file object directly instead of creating a temporary URL
      const attachment: TaskAttachment & { file?: File } = {
        id: `temp-${Date.now()}`,
        name: file.name,
        url: '', // Will be set after upload
        size: file.size,
        type: file.type,
        uploadedAt: Timestamp.now(),
        uploadedBy: userData?.id || '',
        file: file // Store the actual file for later upload
      };

      console.log('TaskDetailModal: created attachment:', attachment);

      setFormData(prev => {
        const newFormData = {
          ...prev,
          attachments: [...(prev.attachments || []), attachment]
        };
        console.log('TaskDetailModal: updated formData attachments:', newFormData.attachments);
        return newFormData;
      });
    } catch (error) {
      console.error('Error handling file upload:', error);
    }
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments?.filter(att => att.id !== attachmentId) || []
    }));
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user || !task) return;
    
    try {
      await taskService.deleteComment(task.id, commentId);
      // Refresh task data
      const updatedTask = await taskService.getTaskById(task.id);
      if (updatedTask) {
        onUpdate?.(updatedTask);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-50 rounded-xl">
                <Clock className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-secondary-900">
                  {isNewTask ? 'New Task' : task?.title}
                </h2>
                <p className="text-secondary-600">
                  {isNewTask ? 'Create a new task' : 'Task details and updates'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isCreatingTask}
              className={`p-2 rounded-lg transition-colors ${
                isCreatingTask
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-gray-100'
              }`}
            >
              <X className="w-5 h-5 text-secondary-500" />
            </button>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {/* Single form for task details */}
          <form id="task-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isNewTask ? (
                // New Task Form Fields
                <>
                  {/* Title */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Task Title
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full rounded-lg border-gray-200 focus:border-primary-500 focus:ring-primary-500"
                      placeholder="Enter task title"
                      required
                      disabled={!isNewTask}
                    />
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={e => setFormData(prev => ({ ...prev, priority: e.target.value as Task['priority'] }))}
                      className="w-full rounded-lg border-gray-200 focus:border-primary-500 focus:ring-primary-500"
                      disabled={!isNewTask}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>

                  {/* Due Date and Time */}
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Due Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.dueDate}
                      onChange={e => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full rounded-lg border-gray-200 focus:border-primary-500 focus:ring-primary-500"
                      required
                      disabled={!isNewTask}
                    />
                  </div>

                  {/* Description */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                      className="w-full rounded-lg border-gray-200 focus:border-primary-500 focus:ring-primary-500"
                      placeholder="Enter task description"
                      required
                      disabled={!isNewTask}
                    />
                  </div>

                  {/* Assign To (for new tasks) */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Assign To
                    </label>
                    
                    {formData.assignedUsers && formData.assignedUsers.length > 0 ? (
                      <div className="flex items-center justify-between p-2 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-700">
                              {formData.assignedUsers[0]?.name[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{formData.assignedUsers[0]?.name}</div>
                            <div className="text-sm text-gray-500">
                              {users.find(u => u.id === formData.assignedUsers?.[0]?.id)?.department || ''}
                            </div>
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              assignedTo: undefined,
                              assignedUsers: []
                            }));
                            setSearchTerm('');
                          }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 rounded-lg border-gray-200 focus:border-primary-500 focus:ring-primary-500"
                          placeholder="Search users..."
                        />
                        {/* User dropdown */}
                        {(searchTerm.length > 0 || searchResults.length > 0) && (
                          <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg max-h-60 overflow-auto">
                            {isSearching ? (
                              <div className="px-4 py-2 text-sm text-gray-500">
                                Searching...
                              </div>
                            ) : searchResults.length === 0 ? (
                              <div className="px-4 py-2 text-sm text-gray-500">
                                No users found
                              </div>
                            ) : (
                              searchResults.map((user) => (
                                <button
                                  key={user.id}
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      assignedUsers: [user]
                                    }));
                                    setSearchTerm('');
                                    setSearchResults([]);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                                >
                                  <div className="flex items-center">
                                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                                      <span className="text-sm font-medium text-primary-700">
                                        {user.name[0].toUpperCase()}
                                      </span>
                                    </div>
                                    <div>
                                      <div className="font-medium text-gray-900">{user.name}</div>
                                      <div className="text-sm text-gray-500">{user.department}</div>
                                    </div>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* File Upload Section for New Tasks */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      <Paperclip className="w-4 h-4 inline mr-1" />
                      Attachments
                    </label>
                    <FileUpload
                      onFileSelect={handleFileUpload}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt,.xlsx"
                      maxSize={10}
                      label="Upload File"
                    />
                    
                    {formData.attachments && formData.attachments.length > 0 && (
                      <TaskAttachments
                        attachments={formData.attachments}
                        canRemove={true}
                        onRemoveAttachment={handleRemoveAttachment}
                      />
                    )}
                  </div>
                </>
              ) : (
                // Task Details View
                <>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Title
                    </label>
                    <p className="text-gray-900">{task?.title}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Priority
                    </label>
                    <p className="text-gray-900">{task?.priority}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Due Date & Time
                    </label>
                    <p className="text-gray-900">
                      {task?.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy HH:mm') : ''}
                    </p>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Description
                    </label>
                    <p className="text-gray-900">{task?.description}</p>
                  </div>

                  <div className="col-span-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          Assigned To
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {task?.assignedUsers?.map(user => (
                            <div key={user.id} className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
                              <span className="text-sm text-gray-700">{user.name}</span>
                            </div>
                          ))}
                          {!task?.assignedUsers?.length && (
                            <span className="text-sm text-gray-500">No users assigned</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          Assigned By
                        </label>
                        <div className="flex items-center gap-2">
                          {task?.assignedBy ? (
                            <div className="flex items-center gap-2 bg-primary-50 px-3 py-1 rounded-full">
                              <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                                <span className="text-xs font-medium text-primary-700">
                                  {(() => {
                                    // Handle both new format (name) and old format (ID)
                                    const assignedBy = task.assignedBy;
                                    
                                    // If assignedBy is already a name (string and not an ID format), display it
                                    if (typeof assignedBy === 'string' && !assignedBy.includes('-')) {
                                      return assignedBy[0]?.toUpperCase() || 'A';
                                    }
                                    
                                    // If it's an ID, try to find the user
                                    const assigner = users.find(u => u.id === assignedBy);
                                    return assigner?.name?.[0]?.toUpperCase() || 'A';
                                  })()}
                                </span>
                              </div>
                              <span className="text-sm text-gray-700">
                                {(() => {
                                  // Handle both new format (name) and old format (ID)
                                  const assignedBy = task.assignedBy;
                                  
                                  // If assignedBy is already a name (string and not an ID format), display it
                                  if (typeof assignedBy === 'string' && !assignedBy.includes('-')) {
                                    return assignedBy;
                                  }
                                  
                                  // If it's an ID, try to find the user
                                  const assigner = users.find(u => u.id === assignedBy);
                                  return assigner?.name || 'Unknown User';
                                })()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">Not assigned</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Task Timeline Section */}
                  {task && (
                    <div className="col-span-2">
                      <TaskTimeline task={task} />
                    </div>
                  )}

                  {/* Attachments Section */}
                  {task?.attachments && task.attachments.length > 0 && (
                    <div className="col-span-2">
                      <TaskAttachments
                        attachments={task.attachments}
                        canRemove={false}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </form>

          {/* Comments Section */}
          {!isNewTask && task && (
            <div className="mt-6 border-t border-gray-200 pt-4">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-medium text-gray-900">Comments</h3>
              </div>

              {/* Comments List */}
              <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                {task.comments?.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-3 bg-gray-50 rounded-lg p-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-700">
                          {comment.userName?.[0]?.toUpperCase() || 'A'}
                        </span>
                      </div>
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {comment.userName || 'Anonymous'}
                          </span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-500">
                            {comment.createdAt?.toDate 
                              ? format(comment.createdAt.toDate(), 'MMM d, yyyy HH:mm')
                              : 'Just now'}
                          </span>
                        </div>
                                                      {userData?.id === comment.userId && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete comment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-gray-700 mt-1 whitespace-pre-wrap">{comment.text}</p>
                    </div>
                  </div>
                ))}
                {(!task.comments || task.comments.length === 0) && (
                  <div className="text-center text-gray-500 py-4">
                    No comments yet. Be the first to comment!
                  </div>
                )}
              </div>

              {/* Comment Input */}
              <div className="mt-4 flex items-center gap-2">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-700">
                                                    {userData?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'A'}
                    </span>
                  </div>
                </div>
                <div className="flex-grow flex items-center gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-grow rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={isSubmitting}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment(e);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddComment}
                    disabled={isSubmitting || !newComment.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <span>Sending...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            disabled={isCreatingTask}
            className={`px-4 py-2 text-sm font-medium rounded-lg border ${
              isCreatingTask
                ? 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed'
                : 'text-secondary-600 hover:text-secondary-700 bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            Cancel
          </button>

          {isNewTask ? (
            <button
              type="submit"
              form="task-form" // Connect to the task form
              disabled={isCreatingTask}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                isCreatingTask
                  ? 'text-white bg-gray-400 cursor-not-allowed'
                  : 'text-white bg-primary-600 hover:bg-primary-700'
              }`}
            >
              {isCreatingTask ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating Task...</span>
                </div>
              ) : (
                'Create Task'
              )}
            </button>
          ) : task?.status === 'Pending' ? (
            <button
              type="button"
              onClick={handleAcceptTask}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
            >
              Accept Task
            </button>
          ) : task?.status === 'InProgress' ? (
            <button
              type="button"
              onClick={handleCompleteTask}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
            >
              Mark as Complete
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
