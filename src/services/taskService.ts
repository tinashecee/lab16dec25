import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
  getDoc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { User } from "./userService";
import axios from "axios";
import { getRequisitions, Requisition } from "../lib/firestore/inventory";

import { Task, TaskComment, TaskAttachment } from "../types/task";
import { fileStorageService } from "./fileStorageService";
import { emailService } from "./emailService";

export interface NewTask {
  title: string;
  description: string;
  priority: string;
  dueDate: string;
  assignedUsers: User[];
  createdBy: string;
  assignedBy: string;
  attachments?: TaskAttachment[];
}

class TaskService {
  private tasksCollection = collection(db, "tasks");
  private readonly pageSize = 10;
  
  // Debug helper function
  private logAssignedByInfo(task: Task, operation: string) {
    console.log(`[ASSIGNEDBY DEBUG] ${operation} - Task ${task.id}:`, {
      title: task.title,
      assignedBy: task.assignedBy,
      assignedByType: typeof task.assignedBy,
      createdBy: task.createdBy,
      createdByType: typeof task.createdBy,
      createdByIsName: typeof task.createdBy === 'string' && 
                     (task.createdBy.includes(' ') || !task.createdBy.match(/^[a-zA-Z0-9]+$/)),
      hasAssignedByField: Object.prototype.hasOwnProperty.call(task, 'assignedBy'),
      assignedUsers: task.assignedUsers?.map(u => u.id),
    });
  }

  async getTasks(startDate?: string, endDate?: string) {
    try {
      console.log('getTasks called with date range:', { startDate, endDate });
      let q = query(
        this.tasksCollection,
        orderBy("status", "asc"),
        orderBy("createdAt", "desc")
      );

      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include entire end day
        
        console.log('Using date range query:', { 
          startFormatted: start.toISOString(), 
          endFormatted: end.toISOString() 
        });
        
        q = query(
          this.tasksCollection,
          where("dueDate", ">=", start),
          where("dueDate", "<=", end),
          orderBy("dueDate", "asc"),
          orderBy("status", "asc")
        );
      }
      
      console.log('Executing Firestore query');
      const snapshot = await getDocs(q);
      console.log(`Retrieved ${snapshot.docs.length} tasks from Firestore`);
      
      const tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
      
      // Debug each task's assignedBy field
      tasks.forEach(task => this.logAssignedByInfo(task, 'GET_TASKS'));
      
      // Log detailed info about assignedBy fields
      console.log('Task assignedBy fields:', tasks.map(task => ({
        id: task.id,
        title: task.title,
        assignedBy: task.assignedBy
      })));
      
      return tasks;
    } catch (error) {
      console.error("Error fetching tasks:", error);
      throw error;
    }
  }

  async createTask(taskData: NewTask) {
    try {
      console.log('createTask called with data:', JSON.stringify(taskData, null, 2));
      console.log('assignedBy value (ID):', taskData.assignedBy);
      console.log('createdBy value (Name):', taskData.createdBy);
      
      // First create the task without attachments
      const newTask = {
        ...taskData,
        attachments: [], // Start with empty attachments
        status: "Pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      console.log('New task object being created:', {
        ...newTask,
        createdAt: 'serverTimestamp',
        updatedAt: 'serverTimestamp'
      });

      const docRef = await addDoc(this.tasksCollection, newTask);
      const taskId = docRef.id;
      console.log('Task created with ID:', taskId);
      
      // Now handle attachments with the real task ID
      const processedAttachments: TaskAttachment[] = [];
      if (taskData.attachments && taskData.attachments.length > 0) {
        console.log('Processing attachments for task:', taskId);
        
        for (const attachment of taskData.attachments) {
          const attachmentWithFile = attachment as TaskAttachment & { file?: File };
          
          if (attachmentWithFile.file) {
            console.log('Uploading file to storage:', attachmentWithFile.name);
            // Upload the file to Firebase Storage with the actual task ID
            const uploadedAttachment = await fileStorageService.uploadTaskAttachment(
              taskId,
              attachmentWithFile.file,
              attachmentWithFile.uploadedBy
            );
            processedAttachments.push(uploadedAttachment);
          } else if (attachment.url && attachment.url.length > 0 && !attachment.url.startsWith('blob:')) {
            // Already uploaded attachment with valid URL
            processedAttachments.push(attachment);
          }
        }
        
        // Update the task with the uploaded attachments
        if (processedAttachments.length > 0) {
          console.log('Updating task with', processedAttachments.length, 'uploaded attachments');
          const taskRef = doc(this.tasksCollection, taskId);
          await updateDoc(taskRef, {
            attachments: processedAttachments,
            updatedAt: serverTimestamp()
          });
        }
      }
      
      // Fetch the created task to verify it was saved correctly
      const createdTaskDoc = await getDoc(doc(this.tasksCollection, taskId));
      if (createdTaskDoc.exists()) {
        const createdTask = { id: createdTaskDoc.id, ...createdTaskDoc.data() } as Task;
        this.logAssignedByInfo(createdTask, 'CREATE_TASK');
        console.log('Final task created with attachments:', createdTask.attachments?.length || 0);
      }
      
      // Send WhatsApp and Email notifications to assigned users
      if (taskData.assignedUsers?.length > 0) {
        const assignedByName = typeof taskData.assignedBy === 'string' 
          ? taskData.assignedBy 
          : (typeof taskData.createdBy === 'string' ? taskData.createdBy : 'System');
        
        await Promise.all(
          taskData.assignedUsers.map(async (user) => {
            // Send WhatsApp notification
            if (user.phoneNumber) {
              try {
                const message = `New Task Assigned: ${taskData.title}\n` +
                  `Description: ${taskData.description}\n` +
                  `Priority: ${taskData.priority}\n` +
                  `Due: ${taskData.dueDate}`;
                
                const response = await axios.post('https://app.labpartners.co.zw/send-whatsapp-notification', {
                  phoneNumber: user.phoneNumber,
                  message: message
                });
                console.log(`WhatsApp notification sent for ${user.name} (${user.phoneNumber}):`, response.data);
              } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                const responseData = (error as {response?: {data?: unknown}})?.response?.data;
                console.error(`Failed to send WhatsApp notification to ${user.name} (${user.phoneNumber}):`, 
                  responseData || errorMessage);
              }
            }

            // Send Email notification
            if (user.email) {
              try {
                await emailService.sendTaskAssignmentEmail({
                  taskId,
                  assignedToEmail: user.email,
                  assignedToName: user.name,
                  assignedByName,
                  taskTitle: taskData.title,
                  taskDescription: taskData.description,
                  dueDate: taskData.dueDate,
                  priority: taskData.priority,
                });
                console.log(`Email notification sent to ${user.name} (${user.email})`);
              } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.error(`Failed to send email notification to ${user.name} (${user.email}):`, errorMessage);
                // Don't throw - continue with other notifications
              }
            }
          })
        );
      }

      return taskId;
    } catch (error) {
      console.error("Error creating task:", error);
      throw error;
    }
  }

  async updateTask(taskId: string, taskData: Partial<Task>) {
    try {
      console.log('TaskService updateTask called with:', { taskId, taskData });
      const taskRef = doc(this.tasksCollection, taskId);
      const updates = {
        ...taskData,
        updatedAt: serverTimestamp()
      };
      
      // Get current task to log before/after state
      const taskDoc = await getDoc(taskRef);
      if (taskDoc.exists()) {
        const currentTask = { id: taskDoc.id, ...taskDoc.data() } as Task;
        this.logAssignedByInfo(currentTask, 'UPDATE_TASK_BEFORE');
        
        // Handle status change timestamps and notifications
        if (taskData.status && taskData.status !== currentTask.status) {
          if (taskData.status === 'InProgress' && currentTask.status === 'Pending') {
            // Task is being accepted
            updates.acceptedAt = serverTimestamp() as unknown as Timestamp;
            console.log('Task accepted - setting acceptedAt timestamp');
          } else if (taskData.status === 'Completed' && currentTask.status === 'InProgress') {
            // Task is being completed
            updates.completedAt = serverTimestamp() as unknown as Timestamp;
            console.log('Task completed - setting completedAt timestamp');
            
            // Send email notification to the person who assigned the task
            try {
              // Get assigner information - assignedBy could be a user ID or name
              const assignedBy = currentTask.assignedBy;
              let assignerEmail = '';
              let assignerName = '';
              
              // Try to get assigner's email from users collection
              if (assignedBy) {
                try {
                  // First, try to find by ID
                  const assignerDoc = await getDoc(doc(db, "users", assignedBy));
                  if (assignerDoc.exists()) {
                    const assignerData = assignerDoc.data() as User;
                    assignerEmail = assignerData.email || '';
                    assignerName = assignerData.name || assignedBy;
                  } else {
                    // If not found by ID, try to find by name (assignedBy might be a name)
                    const usersQuery = query(
                      collection(db, "users"),
                      where("name", "==", assignedBy)
                    );
                    const usersSnapshot = await getDocs(usersQuery);
                    if (!usersSnapshot.empty) {
                      const assignerData = usersSnapshot.docs[0].data() as User;
                      assignerEmail = assignerData.email || '';
                      assignerName = assignerData.name || assignedBy;
                    } else {
                      // Fallback: use assignedBy as name
                      assignerName = typeof assignedBy === 'string' ? assignedBy : 'Unknown';
                    }
                  }
                } catch (error) {
                  console.error('Error fetching assigner info:', error);
                  assignerName = typeof assignedBy === 'string' ? assignedBy : 'Unknown';
                }
              }
              
              // Get completer's name - try to get from taskData, assignedUsers, or use a default
              let completedByName = 'Unknown User';
              if (taskData.completedBy) {
                completedByName = taskData.completedBy;
              } else if (currentTask.assignedUsers && currentTask.assignedUsers.length > 0) {
                // If there's only one assigned user, they're likely the completer
                if (currentTask.assignedUsers.length === 1) {
                  completedByName = currentTask.assignedUsers[0].name || 'Unknown User';
                } else {
                  // Multiple assigned users - use first one as fallback
                  completedByName = currentTask.assignedUsers[0].name || 'Unknown User';
                }
              }
              
              // Send email if we have assigner's email
              if (assignerEmail) {
                await emailService.sendTaskCompletionEmail({
                  taskId,
                  assignerEmail,
                  assignerName,
                  completedByName,
                  taskTitle: currentTask.title,
                  completedAt: new Date().toISOString(),
                });
                console.log(`Task completion email sent to ${assignerName} (${assignerEmail})`);
              } else {
                console.log(`Could not send completion email - assigner email not found for: ${assignerName}`);
              }
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              console.error('Failed to send task completion email:', errorMessage);
              // Don't throw - email failure shouldn't block task completion
            }
          }
        }
      }
      
      // If assignedUsers is being updated, ensure assignedBy is properly set
      if (taskData.assignedUsers && !taskData.assignedBy) {
        console.log('Warning: assignedUsers updated but no assignedBy provided');
        
        // If taskData has createdBy as a name, we need to find the corresponding user ID
        if (typeof taskData.createdBy === 'string' && taskData.createdBy) {
          // We can't directly find a user by name, so we'll keep using the current assignedBy
          const currentTask = taskDoc.data() as Task;
          updates.assignedBy = currentTask.assignedBy;
          console.log('Using current assignedBy value:', updates.assignedBy);
        } else {
          // Fallback to current values
          const currentTask = taskDoc.data() as Task;
          updates.assignedBy = taskData.assignedBy || currentTask.assignedBy;
          console.log('Using assignedBy fallback:', updates.assignedBy);
        }
      }
      
      console.log('Final updates being applied:', updates);
      await updateDoc(taskRef, updates);
      
      // Log the updated state for debugging
      const updatedTaskDoc = await getDoc(taskRef);
      if (updatedTaskDoc.exists()) {
        const updatedTask = { id: updatedTaskDoc.id, ...updatedTaskDoc.data() } as Task;
        this.logAssignedByInfo(updatedTask, 'UPDATE_TASK_AFTER');
      }
    } catch (error) {
      console.error("Error updating task:", error);
      throw error;
    }
  }

  async getTasksByStatus(status: Task["status"]) {
    try {
      const q = query(
        this.tasksCollection,
        where("status", "==", status),
        orderBy("createdAt", "desc")
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
    } catch (error) {
      console.error("Error fetching tasks by status:", error);
      throw error;
    }
  }

  async getTasksByAssignedUser(userId: string) {
    try {
      const q = query(
        this.tasksCollection,
        where("assignedUsers", "array-contains", userId),
        orderBy("status", "asc"),
        orderBy("dueDate", "asc")
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
    } catch (error) {
      console.error("Error fetching tasks for user:", error);
      throw error;
    }
  }

  async getTasksByPriority(priority: Task["priority"]): Promise<Task[]> {
    try {
      const q = query(
        this.tasksCollection,
        where("priority", "==", priority),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Task[];
    } catch (error) {
      console.error("Error fetching tasks:", error);
      throw error;
    }
  }

  async getPendingTasksForUser(
    userId: string,
    userRole: string
  ): Promise<Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    date: string;
    status: "Pending" | "Confirmed" | "Approved" | "Issued" | "Rejected";
    action: string;
  }>> {
    try {
      const allRequisitions = await getRequisitions();

      // Filter requisitions based on user's role and status
      const pendingTasks = allRequisitions.filter((req: Requisition) => {
        if (userRole === req.approver1 && req.status === "Pending") {
          return true;
        }
        if (userRole === req.approver2 && req.status === "Confirmed") {
          return true;
        }
        if (userRole === "Accounts Clerk" && req.status === "Approved") {
          return true;
        }
        return false;
      });

      // Format tasks for display
      return pendingTasks.map((req: Requisition) => ({
        id: req.id,
        type: "Requisition",
        title: `${req.status} Requisition from ${req.requestedBy}`,
        description: `Department: ${req.department}`,
        date: req.requestDate.toDate().toISOString(),
        status: req.status,
        action:
          req.status === "Pending"
            ? "Confirm"
            : req.status === "Confirmed"
            ? "Approve"
            : "Issue",
      }));
    } catch (error) {
      console.error("Error getting pending tasks:", error);
      throw error;
    }
  }

  async addComment(taskId: string, commentData: {
    id: string;
    text: string;
    userId: string;
    userName: string;
    createdAt: Timestamp;
  }) {
    try {
      const taskRef = doc(this.tasksCollection, taskId);
      
      // Ensure all required fields are present and not undefined
      const validatedCommentData = {
        id: commentData.id,
        text: commentData.text || '',
        userId: commentData.userId || '',
        userName: commentData.userName || '',
        createdAt: commentData.createdAt || Timestamp.now(),
      };

      await updateDoc(taskRef, {
        comments: arrayUnion(validatedCommentData)
      });

      return validatedCommentData;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  async deleteComment(taskId: string, commentId: string) {
    try {
      const taskRef = doc(this.tasksCollection, taskId);
      const taskDoc = await getDoc(taskRef);
      const taskData = taskDoc.data();

      if (!taskData?.comments) return;

      const updatedComments = taskData.comments.filter(
        (comment: TaskComment) => comment.id !== commentId
      );

      await updateDoc(taskRef, {
        comments: updatedComments,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error deleting comment:", error);
      throw error;
    }
  }

  async getTaskById(taskId: string): Promise<Task | null> {
    try {
      console.log(`getTaskById called for task: ${taskId}`);
      const taskRef = doc(this.tasksCollection, taskId);
      const taskDoc = await getDoc(taskRef);
      
      if (!taskDoc.exists()) {
        console.log(`Task with ID ${taskId} not found`);
        return null;
      }

      const taskData = {
        id: taskDoc.id,
        ...taskDoc.data()
      } as Task;
      
      this.logAssignedByInfo(taskData, 'GET_TASK_BY_ID');
      
      console.log(`Task ${taskId} retrieved:`, {
        title: taskData.title,
        assignedBy: taskData.assignedBy,
        assignedUsers: taskData.assignedUsers.map(u => u.id)
      });
      
      return taskData;
    } catch (error) {
      console.error("Error fetching task:", error);
      throw error;
    }
  }

  /**
   * Gets tasks that are relevant to the user (either assigned to them or created by them)
   */
  async getUserRelevantTasks(userId: string) {
    try {
      if (!userId) {
        console.log('getUserRelevantTasks: No userId provided');
        return [];
      }

      // Get the full user data to ensure we match the stored structure
      const userDoc = await getDoc(doc(db, "users", userId));
      if (!userDoc.exists()) {
        console.log('getUserRelevantTasks: User document not found for ID:', userId);
        return [];
      }
      
      const userData = userDoc.data() as User;
      
      // Validate that we have the required user data
      if (!userData.id || !userData.name || !userData.email) {
        console.log('getUserRelevantTasks: User data missing required fields:', userData);
        // Fallback: get all tasks and filter manually
        return await this.getAllTasksAndFilter(userId);
      }

      let assignedTasks: (Task & { relevance: string })[] = [];
      
      try {
        // Try to query with the full user object structure
        const userObjectForQuery = {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          department: userData.department || '',
          role: userData.role || ''
        };

        const assignedQuery = query(
          this.tasksCollection,
          where("assignedUsers", "array-contains", userObjectForQuery),
          orderBy("dueDate", "asc")
        );
        
        const assignedSnapshot = await getDocs(assignedQuery);
        assignedTasks = assignedSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          relevance: "assigned"
        })) as (Task & { relevance: string })[];
      } catch (queryError) {
        console.log('getUserRelevantTasks: Array-contains query failed, falling back to manual filtering:', queryError);
        // Fallback: get all tasks and filter manually
        assignedTasks = await this.getAllTasksAndFilterByAssignment(userId);
      }
      
      // Get tasks created by the user
      let createdTasks: (Task & { relevance: string })[] = [];
      try {
        const createdQuery = query(
          this.tasksCollection,
          where("createdBy", "==", userId),
          orderBy("dueDate", "asc")
        );
        
        const createdSnapshot = await getDocs(createdQuery);
        createdTasks = createdSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          relevance: "created"
        })) as (Task & { relevance: string })[];
      } catch (queryError) {
        console.log('getUserRelevantTasks: createdBy query failed:', queryError);
        // This query is simpler and less likely to fail, but we'll handle it just in case
        createdTasks = [];
      }
      
      // Get tasks assigned by the user (assigning party)
      // assignedBy can be stored as either userId or userName, so query for both
      let assignedByTasks: (Task & { relevance: string })[] = [];
      try {
        // Query for tasks where assignedBy matches user ID
        const assignedByIdQuery = query(
          this.tasksCollection,
          where("assignedBy", "==", userId),
          orderBy("dueDate", "asc")
        );
        
        const assignedByIdSnapshot = await getDocs(assignedByIdQuery);
        assignedByTasks = assignedByIdSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          relevance: "assignedBy"
        })) as (Task & { relevance: string })[];
        
        // Also query for tasks where assignedBy matches user name (in case it's stored as name)
        if (userData.name && userData.name !== userId) {
          try {
            const assignedByNameQuery = query(
              this.tasksCollection,
              where("assignedBy", "==", userData.name),
              orderBy("dueDate", "asc")
            );
            
            const assignedByNameSnapshot = await getDocs(assignedByNameQuery);
            const assignedByNameTasks = assignedByNameSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              relevance: "assignedBy"
            })) as (Task & { relevance: string })[];
            
            // Merge with existing assignedByTasks, avoiding duplicates
            assignedByNameTasks.forEach(task => {
              if (!assignedByTasks.find(t => t.id === task.id)) {
                assignedByTasks.push(task);
              }
            });
          } catch (nameQueryError) {
            console.log('getUserRelevantTasks: assignedBy name query failed:', nameQueryError);
            // Continue without name-based query
          }
        }
      } catch (queryError) {
        console.log('getUserRelevantTasks: assignedBy query failed:', queryError);
        assignedByTasks = [];
      }
      
      // Combine and deduplicate tasks
      const tasksMap = new Map();
      
      // Add assigned tasks first
      assignedTasks.forEach(task => {
        tasksMap.set(task.id, task);
      });
      
      // Add created tasks, but mark as both if they're already in the map
      createdTasks.forEach(task => {
        if (tasksMap.has(task.id)) {
          const existingTask = tasksMap.get(task.id);
          tasksMap.set(task.id, {
            ...existingTask,
            relevance: "both"
          });
        } else {
          tasksMap.set(task.id, task);
        }
      });
      
      // Add assignedBy tasks, updating relevance if already in map
      assignedByTasks.forEach(task => {
        if (tasksMap.has(task.id)) {
          const existingTask = tasksMap.get(task.id);
          // Update relevance to indicate multiple relationships
          const currentRelevance = existingTask.relevance || "";
          if (currentRelevance === "assigned") {
            tasksMap.set(task.id, { ...existingTask, relevance: "assigned_and_assignedBy" });
          } else if (currentRelevance === "created") {
            tasksMap.set(task.id, { ...existingTask, relevance: "created_and_assignedBy" });
          } else {
            tasksMap.set(task.id, { ...existingTask, relevance: "multiple" });
          }
        } else {
          tasksMap.set(task.id, task);
        }
      });
      
      return Array.from(tasksMap.values()) as Task[];
    } catch (error) {
      console.error("Error fetching relevant tasks:", error);
      throw error;
    }
  }

  /**
   * Fallback method: Get all tasks and filter manually
   */
  private async getAllTasksAndFilter(userId: string): Promise<Task[]> {
    try {
      const allTasksSnapshot = await getDocs(query(this.tasksCollection, orderBy("dueDate", "asc")));
      const allTasks = allTasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];

      return allTasks.filter(task => {
        // Check if user is assigned to this task
        const isAssigned = task.assignedUsers?.some((user: User) => user.id === userId);
        // Check if user created this task
        const isCreator = task.createdBy === userId;
        
        return isAssigned || isCreator;
      });
    } catch (error) {
      console.error("Error in fallback filter method:", error);
      return [];
    }
  }

  /**
   * Fallback method: Get all tasks and filter by assignment only
   */
  private async getAllTasksAndFilterByAssignment(userId: string): Promise<(Task & { relevance: string })[]> {
    try {
      const allTasksSnapshot = await getDocs(query(this.tasksCollection, orderBy("dueDate", "asc")));
      const allTasks = allTasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        relevance: "assigned"
      })) as (Task & { relevance: string })[];

      return allTasks.filter(task => {
        // Check if user is assigned to this task
        return task.assignedUsers?.some((user: User) => user.id === userId);
      });
    } catch (error) {
      console.error("Error in fallback assignment filter method:", error);
      return [];
    }
  }

  // Attachment methods
  async addAttachmentToTask(taskId: string, file: File, uploadedBy: string): Promise<TaskAttachment> {
    try {
      // Upload file to storage
      const attachment = await fileStorageService.uploadTaskAttachment(taskId, file, uploadedBy);
      
      // Add attachment to task document
      const taskRef = doc(this.tasksCollection, taskId);
      await updateDoc(taskRef, {
        attachments: arrayUnion(attachment),
        updatedAt: serverTimestamp()
      });

      return attachment;
    } catch (error) {
      console.error("Error adding attachment to task:", error);
      throw error;
    }
  }

  async removeAttachmentFromTask(taskId: string, attachmentId: string): Promise<void> {
    try {
      // Get current task to find the attachment
      const taskRef = doc(this.tasksCollection, taskId);
      const taskDoc = await getDoc(taskRef);
      const taskData = taskDoc.data();

      if (!taskData?.attachments) return;

      // Find the attachment to remove
      const attachmentToRemove = taskData.attachments.find(
        (attachment: TaskAttachment) => attachment.id === attachmentId
      );

      if (!attachmentToRemove) return;

      // Remove file from storage
      await fileStorageService.deleteTaskAttachment(taskId, attachmentId);

      // Remove attachment from task document
      const updatedAttachments = taskData.attachments.filter(
        (attachment: TaskAttachment) => attachment.id !== attachmentId
      );

      await updateDoc(taskRef, {
        attachments: updatedAttachments,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error removing attachment from task:", error);
      throw error;
    }
  }
}

export const taskService = new TaskService();
