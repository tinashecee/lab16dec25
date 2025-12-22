import React, { useState, useEffect } from 'react';
import { X, Paperclip } from 'lucide-react';
import { User } from '../../services/userService';
import { NewTask } from '../../services/taskService';
import { Task, TaskAttachment } from '../../types/task';
import UserMultiSelect from '../common/UserMultiSelect';
import FileUpload from '../common/FileUpload';
import TaskAttachments from './TaskAttachments';
import { userService } from '../../services/userService';
import { Timestamp } from 'firebase/firestore';
import { fileStorageService } from '../../services/fileStorageService';

interface TaskFormProps {
  onClose: () => void;
  onSubmit: (task: NewTask) => void;
  initialData?: Task;
  currentUserId: string;
}

export default function TaskForm({ onClose, onSubmit, initialData, currentUserId }: TaskFormProps) {
  const [formData, setFormData] = useState<NewTask>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    priority: initialData?.priority || 'Normal',
    dueDate: initialData?.dueDate || new Date().toISOString().slice(0, 16),
    assignedUsers: initialData?.assignedUsers || [],
    createdBy: currentUserId,
    assignedBy: currentUserId,
    attachments: initialData?.attachments || []
  });

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await userService.getUsers();
        const activeUsers = response.users?.filter(user => user.status === 'Active') || [];
        setUsers(activeUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (submitting) return; // Prevent double submission
    
    try {
      setSubmitting(true);
      
      // Upload files first if there are any
      const processedAttachments: TaskAttachment[] = [];
      
      if (formData.attachments && formData.attachments.length > 0) {
        for (const attachment of formData.attachments) {
          const attachmentWithFile = attachment as TaskAttachment & { file?: File };
          
          if (attachmentWithFile.file) {
            // Upload the file to Firebase Storage
            const tempTaskId = `temp_${Date.now()}`;
            const uploadedAttachment = await fileStorageService.uploadTaskAttachment(
              tempTaskId,
              attachmentWithFile.file,
              currentUserId
            );
            processedAttachments.push(uploadedAttachment);
          } else if (attachment.url && !attachment.url.startsWith('blob:')) {
            // Already uploaded attachment
            processedAttachments.push(attachment);
          }
        }
      }
      
      // Create task data with uploaded attachments
      const taskDataWithAttachments = {
        ...formData,
        attachments: processedAttachments
      };
      
      onSubmit(taskDataWithAttachments);
      onClose();
    } catch (error) {
      console.error('Error creating task:', error);
      // Add error notification here if needed
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUserAssignment = (users: User[]) => {
    setFormData(prev => ({
      ...prev,
      assignedUsers: users
    }));
  };

  const handleFileUpload = async (file: File) => {
    try {
      // Store the file object directly instead of creating a temporary URL
      // We'll upload it to Firebase Storage when the task is created
      const attachment: TaskAttachment & { file?: File } = {
        id: `temp-${Date.now()}`,
        name: file.name,
        url: '', // Will be set after upload
        size: file.size,
        type: file.type,
        uploadedAt: Timestamp.now(),
        uploadedBy: currentUserId,
        file: file // Store the actual file for later upload
      };

      setFormData(prev => ({
        ...prev,
        attachments: [...(prev.attachments || []), attachment]
      }));
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-secondary-900">
            {initialData ? 'Edit Task' : 'New Task'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-secondary-700">
              Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-secondary-700">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-secondary-700">
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm"
              required
            >
              <option value="Low">Low</option>
              <option value="Normal">Normal</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-secondary-700">
              Due Date
            </label>
            <input
              type="datetime-local"
              id="dueDate"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Assign To
            </label>
            <UserMultiSelect
              selectedUsers={formData.assignedUsers}
              onSelect={handleUserAssignment}
              placeholder="Select users to assign..."
              isLoading={loading}
              availableUsers={users}
            />
          </div>

          {/* File Upload Section */}
          <div>
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

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-secondary-700 hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                submitting
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
            >
              {submitting
                ? (initialData ? 'Updating...' : 'Creating...')
                : (initialData ? 'Update Task' : 'Create Task')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 