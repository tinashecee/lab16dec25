import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';
import { TaskAttachment } from '../types/task';
import { QueryAttachment } from '../types/query';
import { Timestamp } from 'firebase/firestore';

export class FileStorageService {
  private readonly TASK_STORAGE_PATH = 'task-attachments';
  private readonly QUERY_STORAGE_PATH = 'query-attachments';

  async uploadTaskAttachment(
    taskId: string, 
    file: File, 
    uploadedBy: string
  ): Promise<TaskAttachment> {
    try {
      // Create a unique filename
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${this.TASK_STORAGE_PATH}/${taskId}/${fileName}`;

      // Create storage reference
      const storageRef = ref(storage, filePath);

      // Upload file
      const snapshot = await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Create attachment object
      const attachment: TaskAttachment = {
        id: snapshot.ref.name,
        name: file.name,
        url: downloadURL,
        size: file.size,
        type: file.type,
        uploadedAt: Timestamp.now(),
        uploadedBy: uploadedBy
      };

      return attachment;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('Failed to upload file');
    }
  }

  async deleteTaskAttachment(taskId: string, attachmentId: string): Promise<void> {
    try {
      const filePath = `${this.TASK_STORAGE_PATH}/${taskId}/${attachmentId}`;
      const storageRef = ref(storage, filePath);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  }

  async uploadQueryAttachment(
    queryId: string, 
    file: File, 
    uploadedBy: string,
    uploadedByName: string
  ): Promise<QueryAttachment> {
    try {
      // Create a unique filename
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${this.QUERY_STORAGE_PATH}/${queryId}/${fileName}`;

      // Create storage reference
      const storageRef = ref(storage, filePath);

      // Upload file
      const snapshot = await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Create attachment object
      const attachment: QueryAttachment = {
        id: snapshot.ref.name,
        name: file.name,
        url: downloadURL,
        size: file.size,
        type: file.type,
        uploadedAt: Timestamp.now(),
        uploadedBy: uploadedBy,
        uploadedByName: uploadedByName
      };

      return attachment;
    } catch (error) {
      console.error('Error uploading query file:', error);
      throw new Error('Failed to upload file');
    }
  }

  async deleteQueryAttachment(queryId: string, attachmentId: string): Promise<void> {
    try {
      const filePath = `${this.QUERY_STORAGE_PATH}/${queryId}/${attachmentId}`;
      const storageRef = ref(storage, filePath);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting query file:', error);
      throw new Error('Failed to delete file');
    }
  }

  getFileIcon(fileType: string): string {
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📋';
    return '📎';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  isImageFile(fileType: string): boolean {
    return fileType.startsWith('image/');
  }

  isPdfFile(fileType: string): boolean {
    return fileType === 'application/pdf';
  }
}

export const fileStorageService = new FileStorageService(); 