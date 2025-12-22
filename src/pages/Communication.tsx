import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Trash2, 
  Archive, 
  Clock, 
  MoreVertical,
  Reply,
  ReplyAll,
  Forward,
  X,
  Paperclip,
  Send,
  Save
} from 'lucide-react';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../contexts/NotificationContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, query, where, getDocs, orderBy, serverTimestamp, doc, getDoc, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { storage } from '../lib/firebase';
import UserMultiSelect from '../components/common/UserMultiSelect';
import { userService } from '../services/userService';
import { departmentService } from '../services/departmentService';
import { useMessages } from '../hooks/queries/communication/useCommunication';
import { useSendMessage, useReplyToMessage, useMarkMessageAsRead } from '../hooks/mutations/communicationMutations';
import type { Message, Draft, Tag, ComposeForm } from '../types/communication';

export default function Communication() {
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<'inbox' | 'sent' | 'drafts' | 'archived'>('inbox');
  const [searchTerm, setSearchTerm] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeForm, setComposeForm] = useState<ComposeForm>({
    recipientType: 'individual',
    recipients: [],
    selectedDepartments: [],
    subject: '',
    content: '',
    attachments: [],
    tags: []
  });
  const { user, userData } = useAuth();
  const { fetchNotifications } = useNotifications();
  const [departments, setDepartments] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<File[]>([]);

  // TanStack Query hooks
  const { data: messages = [], isLoading: messagesLoading, refetch: refetchMessages } = useMessages(userData?.id, selectedFolder);
  const sendMessageMutation = useSendMessage();
  const replyToMessageMutation = useReplyToMessage();
  const markAsReadMutation = useMarkMessageAsRead();

  // Folders state (computed from messages)
  const folders = [
    { id: 'inbox', label: 'Inbox', count: messages.filter(m => !m.archivedBy?.includes(userData?.id || '')).length },
    { id: 'sent', label: 'Sent', count: messages.filter(m => m.senderId === user?.uid).length },
    { id: 'drafts', label: 'Drafts', count: drafts.length }
  ];

  // Helper function to safely format timestamps
  const safeFormatDate = (timestamp: any, formatString: string): string => {
    try {
      let date: Date;
      if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
        // Firestore Timestamp
        date = timestamp.toDate();
      } else if (timestamp instanceof Date) {
        // Already a Date object
        date = timestamp;
      } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        // String or number timestamp
        date = new Date(timestamp);
      } else {
        // Invalid timestamp
        return 'Invalid date';
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      return format(date, formatString);
    } catch (error) {
      console.error('Error formatting date:', error, timestamp);
      return 'Invalid date';
    }
  };

  // Add allUsers state and fetch logic
  const [allUsers, setAllUsers] = useState<{ id: string; name: string; email: string; department?: string }[]>([]);
  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        // Fetch all users by setting a very high limit
        const result = await userService.getUsers(null, { limit: 1000 });
        setAllUsers(
          result.users
            .filter((u) => typeof u.id === 'string' && u.id)
            .map((u) => ({
              id: u.id as string,
              name: u.name,
              email: u.email,
              department: u.department
            }))
        );
      } catch (err) {
        console.error('Failed to fetch users', err);
      }
    };
    fetchAllUsers();
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setComposeForm(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...files]
    }));
  };

  const handleRemoveFile = (index: number) => {
    setComposeForm(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const uploadAttachment = async (file: File) => {
    try {
      const storageRef = ref(storage, `messages/${uuidv4()}-${file.name}`);
      const uploadResult = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(uploadResult.ref);
      return {
        name: file.name,
        size: file.size,
        type: file.type,
        url,
        path: uploadResult.ref.fullPath
      };
    } catch (error) {
      console.error(`Error uploading file ${file.name}:`, error);
      throw new Error(`Failed to upload ${file.name}`);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeForm.subject || !composeForm.content || composeForm.recipients.length === 0) {
      alert('Please fill in all required fields and select at least one recipient');
      return;
    }

    setIsSending(true);
    try {
      const attachmentUrls = await Promise.all(
        composeForm.attachments.map(uploadAttachment)
      ).catch(error => {
        throw new Error('Failed to upload one or more attachments');
      });

      // Prepare recipients and recipientIds
      const recipients = composeForm.recipients.map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        department: r.department
      }));
      const recipientIds = composeForm.recipients.map(r => r.id);

      // Prepare message data
      const newMessage = {
        senderId: user?.uid,
        senderEmail: userData?.email || user?.email,
        senderName: userData?.name || user?.displayName,
        subject: composeForm.subject,
        content: composeForm.content,
        timestamp: new Date(),
        read: false,
        labels: composeForm.tags.map(tag => tag.name),
        attachments: attachmentUrls,
        recipients,
        recipientIds,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        replies: [],
        readBy: [],
      };

      console.log('Saving message:', newMessage);
      await addDoc(collection(db, 'messages'), newMessage);

      // Refresh notifications for recipients
      fetchNotifications();

      if (selectedFolder === 'sent') {
        fetchMessages();
      }

      setComposeForm({
        recipientType: 'individual',
        recipients: [],
        selectedDepartments: [],
        subject: '',
        content: '',
        attachments: [],
        tags: []
      });
      setIsComposeOpen(false);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. ' + (error instanceof Error ? error.message : ''));
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!composeForm.subject && !composeForm.content && composeForm.attachments.length === 0) {
      alert('Nothing to save');
      return;
    }

    setIsSaving(true);
    try {
      const attachmentUrls = await Promise.all(
        composeForm.attachments.map(async (file) => {
          const storageRef = ref(storage, `drafts/${uuidv4()}-${file.name}`);
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);
          return {
            name: file.name,
            size: file.size,
            type: file.type,
            url
          };
        })
      );

      const draftMessage = {
        sender: userData?.name || user?.displayName || 'System User',
        email: userData?.email || user?.email || 'system@labpartners.com',
        subject: composeForm.subject,
        content: composeForm.content,
        timestamp: new Date(),
        isDraft: true as const,
        labels: composeForm.tags.map(tag => tag.name),
        attachments: attachmentUrls,
        recipients: composeForm.recipients.length > 0 ? {
          type: composeForm.recipientType,
          users: composeForm.recipients
        } : undefined,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      console.log('Saving draft:', draftMessage);
      await addDoc(collection(db, 'drafts'), draftMessage);
      
      setComposeForm({
        recipientType: 'individual',
        recipients: [],
        selectedDepartments: [],
        subject: '',
        content: '',
        attachments: [],
        tags: []
      });
      setIsComposeOpen(false);
      
      fetchDrafts();
      
      alert('Draft saved successfully');
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save draft. ' + (error instanceof Error ? error.message : ''));
    } finally {
      setIsSaving(false);
    }
  };

  const loadDraft = (draft: Draft) => {
    const recipientsArr: { id: string; name: string; email: string; department?: string }[] =
      Array.isArray(draft.recipients?.users)
        ? draft.recipients?.users.filter(r => typeof r.id === 'string' && r.id)
        : draft.recipients?.users
          ? Object.keys(draft.recipients.users)
              .filter(id => typeof id === 'string' && id)
              .map(id => ({ id, name: '', email: '', department: '' }))
          : [];
    const departments = Array.from(new Set(recipientsArr.map(user => user.department).filter((d): d is string => Boolean(d))));
    setComposeForm({
      recipientType: draft.recipients?.type || 'individual',
      recipients: recipientsArr,
      selectedDepartments: departments,
      subject: draft.subject,
      content: draft.content,
      attachments: [],
      tags: availableTags.filter(tag => draft.labels.includes(tag.name))
    });
    setIsComposeOpen(true);
  };

  const availableTags: Tag[] = [
    { id: '1', name: 'urgent', color: 'red' },
    { id: '2', name: 'announcement', color: 'blue' },
    { id: '3', name: 'event', color: 'green' },
    { id: '4', name: 'training', color: 'purple' },
    { id: '5', name: 'policy', color: 'orange' }
  ];

  const fetchMessages = async () => {
    if (!user?.uid || !userData?.id) return;

    try {
      const messagesRef = collection(db, 'messages');
      let q;
      if (selectedFolder === 'inbox') {
        // Use Firestore document ID (userData.id) to match with recipientIds
        q = query(messagesRef, where('recipientIds', 'array-contains', userData.id), orderBy('createdAt', 'desc'));
      } else if (selectedFolder === 'sent') {
        // Use Firebase Auth UID for sender (stored in senderId)
        q = query(messagesRef, where('senderId', '==', user.uid), orderBy('createdAt', 'desc'));
      } else {
        q = query(messagesRef, orderBy('createdAt', 'desc'));
      }

      console.log('Fetching messages for user:', userData.id, 'folder:', selectedFolder);

      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('onSnapshot for user:', user?.uid, 'docs:', snapshot.docs.map(doc => doc.data()));
        const fetchedMessages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().createdAt?.toDate() || new Date()
        })) as Message[];

        setMessages(fetchedMessages);
        // Update folder counts
        const inboxCount = selectedFolder === 'inbox' ? fetchedMessages.length : folders.find(f => f.id === 'inbox')?.count || 0;
        const sentCount = selectedFolder === 'sent' ? fetchedMessages.length : folders.find(f => f.id === 'sent')?.count || 0;

        setFolders(prev => prev.map(folder => {
          if (folder.id === 'inbox') return { ...folder, count: inboxCount };
          if (folder.id === 'sent') return { ...folder, count: sentCount };
          return folder;
        }));

        console.log('Fetched messages:', fetchedMessages);
      }, (error) => {
        console.error('Error fetching messages:', error);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchDrafts = async () => {
    if (!user?.uid || !userData?.email) return;
    
    try {
      const draftsRef = collection(db, 'drafts');
      const q = query(
        draftsRef,
        where('email', '==', userData.email),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      const fetchedDrafts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })) as Draft[];

      setDrafts(fetchedDrafts);
      
      const draftCount = fetchedDrafts.length;
      setFolders(prev => prev.map(folder => 
        folder.id === 'drafts' 
          ? { ...folder, count: draftCount }
          : folder
      ));

      console.log('Fetched drafts:', fetchedDrafts);
    } catch (error) {
      console.error('Error fetching drafts:', error);
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    if (!user?.uid || !userData?.id || !selectedMessage) return;

    try {
      const messageRef = doc(db, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (!messageDoc.exists()) return;

      const existingReadBy = messageDoc.data().readBy || [];
      const alreadyRead = existingReadBy.some((read: MessageRead) => read.userId === userData.id);

      if (!alreadyRead) {
        const readBy = [
          ...existingReadBy,
          {
            userId: userData.id,
            userName: userData.name || user.displayName,
            readAt: new Date()
          }
        ];

        await updateDoc(messageRef, { readBy });
        
        // Update local state
        setSelectedMessage(prev => prev ? {
          ...prev,
          readBy
        } : null);
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const handleReply = async (content: string, attachments: File[] = []) => {
    if (!user?.uid || !userData?.id || !selectedMessage) return;

    try {
      const attachmentUrls = await Promise.all(
        attachments.map(async (file) => {
          const storageRef = ref(storage, `replies/${uuidv4()}-${file.name}`);
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);
          return {
            name: file.name,
            size: file.size,
            type: file.type,
            url
          };
        })
      );

      const reply: MessageReply = {
        id: uuidv4(),
        senderId: userData.id,
        senderName: userData.name || user.displayName || 'Unknown User',
        content,
        timestamp: new Date(),
        attachments: attachmentUrls
      };

      const messageRef = doc(db, 'messages', selectedMessage.id);
      await updateDoc(messageRef, {
        replies: arrayUnion(reply)
      });

      // Update local state
      setSelectedMessage(prev => prev ? {
        ...prev,
        replies: [...prev.replies, reply]
      } : null);

      // Refresh notifications for message participants
      fetchNotifications();

      // Clear the reply form after successful send
      setReplyContent('');
      setReplyAttachments([]);
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Failed to send reply. Please try again.');
    }
  };

  useEffect(() => {
    if (user && userData) {
      if (selectedFolder === 'drafts') {
        fetchDrafts();
      } else {
        fetchMessages();
      }
    }
  }, [user, userData, selectedFolder]);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const allDepartments = await departmentService.getAllDepartments();
        setDepartments(allDepartments.map(dept => dept.name));
      } catch (error) {
        console.error('Error fetching departments:', error);
      }
    };

    fetchDepartments();
  }, []);

  useEffect(() => {
    if (selectedMessage && !selectedMessage.isReply) {
      markMessageAsRead(selectedMessage.id);
    }
  }, [selectedMessage]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const messageId = params.get('message');
    
    if (messageId) {
      const fetchMessage = async () => {
        try {
          const messageRef = doc(db, 'messages', messageId);
          const messageDoc = await getDoc(messageRef);
          
          if (messageDoc.exists()) {
            const messageData = {
              id: messageDoc.id,
              ...messageDoc.data(),
              timestamp: messageDoc.data().createdAt?.toDate() || new Date()
            } as Message;
            
            setSelectedMessage(messageData);
          }
        } catch (error) {
          console.error('Error fetching message:', error);
        }
      };

      fetchMessage();
    }
  }, []);

  const renderMessageList = () => {
    if (selectedFolder === 'drafts') {
      return drafts.map((draft) => (
        <div
          key={draft.id}
          onClick={() => loadDraft(draft)}
          className="flex items-center gap-4 p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
        >
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600">
              {draft.sender.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">
                Draft
              </h3>
              <span className="text-xs text-gray-500">
                {safeFormatDate(draft.timestamp, 'MMM d, yyyy')}
              </span>
            </div>
            <h4 className="text-sm font-medium text-gray-900 mt-0.5">
              {draft.subject || '(No subject)'}
            </h4>
            <p className="text-sm text-gray-500 truncate mt-0.5">
              {draft.content || '(No content)'}
            </p>
          </div>
        </div>
      ));
    }

    return messages.map((message) => {
      // Calculate recipient count - handle both array and object formats
      let sentRecipientCount = 0;
      if (selectedFolder === 'sent') {
        if (Array.isArray(message.recipients)) {
          // Direct array format
          sentRecipientCount = message.recipients.length;
        } else if (message.recipients?.users) {
          // Object format with users property
          if (Array.isArray(message.recipients.users)) {
            sentRecipientCount = message.recipients.users.length;
          } else if (typeof message.recipients.users === 'object') {
            sentRecipientCount = Object.keys(message.recipients.users).length;
          }
        } else if (message.recipientIds && Array.isArray(message.recipientIds)) {
          // Fallback to recipientIds array
          sentRecipientCount = message.recipientIds.length;
        }
      }

      // Get recipient names for display
      let recipientNames: string[] = [];
      if (Array.isArray(message.recipients)) {
        recipientNames = message.recipients.map(r => r.name).filter(Boolean);
      } else if (message.recipients?.users && Array.isArray(message.recipients.users)) {
        recipientNames = message.recipients.users.map(r => r.name).filter(Boolean);
      }

      return (
        <div
          key={message.id}
          onClick={() => setSelectedMessage(message)}
          className={`flex items-center gap-4 p-4 border-b border-gray-200 cursor-pointer ${
            !message.read ? 'bg-blue-50' : 'hover:bg-gray-50'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-sm font-medium text-primary-700">
              {selectedFolder === 'sent' 
                ? sentRecipientCount > 0 ? sentRecipientCount : '?'
                : message.senderName?.charAt(0) || '?'
              }
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-medium ${!message.read ? 'text-gray-900' : 'text-gray-600'}`}> 
                {selectedFolder === 'sent' 
                  ? recipientNames.length > 0 
                    ? `To: ${recipientNames.slice(0, 2).join(', ')}${recipientNames.length > 2 ? ` +${recipientNames.length - 2} more` : ''}`
                    : `To: ${sentRecipientCount} recipient(s)`
                  : message.senderName
                }
              </h3>
              <span className="text-xs text-gray-500">
                {safeFormatDate(message.timestamp, 'MMM d, yyyy')}
              </span>
            </div>
            <h4 className="text-sm font-medium text-gray-900 mt-0.5">
              {message.subject}
            </h4>
            <p className="text-sm text-gray-500 truncate mt-0.5">
              {message.content}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {message.labels.map((label) => (
                <span
                  key={label}
                  className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 flex flex-col border-r border-gray-200 bg-white">
          <div className="p-4">
            <button 
              onClick={() => setIsComposeOpen(true)}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2"
            >
              New Message
            </button>
        </div>

          <nav className="flex-1 overflow-y-auto p-2">
            <div className="space-y-4">
              {/* Mail Folders */}
                  <div>
                <div className="px-2 py-1.5 text-sm font-semibold text-gray-500">
                  Folders
                  </div>
                <div className="space-y-1">
                  {folders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => setSelectedFolder(folder.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg ${
                        selectedFolder === folder.id
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span>{folder.label}</span>
                      {folder.count > 0 && (
                        <span className="text-xs text-gray-500">{folder.count}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
                  </div>
          </nav>
                </div>

        {/* Message List */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="border-b border-gray-200">
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="px-4 py-2 flex items-center justify-between border-t border-gray-200">
              <div className="flex items-center gap-4">
                <button className="text-gray-600 hover:text-gray-900">
                  <Archive className="w-4 h-4" />
                </button>
                <button className="text-gray-600 hover:text-gray-900">
                  <Trash2 className="w-4 h-4" />
                </button>
                <button className="text-gray-600 hover:text-gray-900">
                  <Clock className="w-4 h-4" />
                </button>
              </div>
              <button className="text-gray-600 hover:text-gray-900">
                <MoreVertical className="w-4 h-4" />
            </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {renderMessageList()}
          </div>
        </div>
      </div>

      {/* Message View Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedMessage.subject}
              </h2>
              <div className="flex items-center gap-2">
                <button 
                  className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
                  onClick={() => setSelectedMessage(null)}
                >
                  <X className="w-4 h-4" />
                </button>
                </div>
              </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Message Details */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-700">
                        {selectedFolder === 'sent' 
                          ? (() => {
                              if (Array.isArray(selectedMessage.recipients)) return selectedMessage.recipients.length;
                              if (selectedMessage.recipients?.users) {
                                if (Array.isArray(selectedMessage.recipients.users)) return selectedMessage.recipients.users.length;
                                if (typeof selectedMessage.recipients.users === 'object') return Object.keys(selectedMessage.recipients.users).length;
                              }
                              if (selectedMessage.recipientIds && Array.isArray(selectedMessage.recipientIds)) return selectedMessage.recipientIds.length;
                              return 0;
                            })()
                          : selectedMessage.senderName?.charAt(0) || '?'
                        }
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">
                        {selectedFolder === 'sent' 
                          ? (() => {
                              let recipients: any[] = [];
                              if (Array.isArray(selectedMessage.recipients)) {
                                recipients = selectedMessage.recipients;
                              } else if (selectedMessage.recipients?.users && Array.isArray(selectedMessage.recipients.users)) {
                                recipients = selectedMessage.recipients.users;
                              }
                              
                              if (recipients.length > 0) {
                                const names = recipients.map(r => r.name).filter(Boolean);
                                return `To: ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` +${names.length - 3} more` : ''}`;
                              }
                              
                              const count = Array.isArray(selectedMessage.recipientIds) ? selectedMessage.recipientIds.length : 0;
                              return `To: ${count} recipient(s)`;
                            })()
                          : selectedMessage.senderName
                        }
                      </h3>
                      {selectedFolder === 'sent' && Array.isArray(selectedMessage.recipients) && selectedMessage.recipients.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {selectedMessage.recipients.slice(0, 5).map((recipient: any, idx: number) => (
                            <p key={idx} className="text-xs text-gray-500">
                              {recipient.name} ({recipient.email})
                            </p>
                          ))}
                          {selectedMessage.recipients.length > 5 && (
                            <p className="text-xs text-gray-400 italic">
                              +{selectedMessage.recipients.length - 5} more recipients
                            </p>
                          )}
                        </div>
                      )}
                      {selectedFolder !== 'sent' && (
                        <p className="text-sm text-gray-500">
                          {selectedMessage.senderEmail}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {safeFormatDate(selectedMessage.timestamp, 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100">
                      <Reply className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100">
                      <ReplyAll className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100">
                      <Forward className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Labels */}
                <div className="flex items-center gap-2 mt-4">
                  {selectedMessage.labels.map((label) => (
                    <span
                      key={label}
                      className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600"
                    >
                      {label}
                    </span>
                  ))}
                </div>

                {/* Read Receipts */}
                {selectedFolder === 'sent' && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Read by:</h4>
                    <div className="space-y-1">
                      {selectedMessage.readBy?.length > 0 ? (
                        selectedMessage.readBy.map((read) => (
                          <div key={read.userId} className="flex items-center gap-2 text-sm text-gray-600">
                            <span>{read.userName}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-xs">
                              {safeFormatDate(read.readAt, 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No one has read this message yet</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Message Content */}
              <div className="p-6">
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {selectedMessage.content}
                </p>

                {/* Replies Section */}
                {selectedMessage.replies?.length > 0 && (
                  <div className="mt-8 space-y-4">
                    <h4 className="text-sm font-medium text-gray-700">Replies</h4>
                    {selectedMessage.replies.map((reply) => (
                      <div key={reply.id} className="border-l-2 border-gray-200 pl-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{reply.senderName}</span>
                          <span className="text-xs text-gray-500">
                            {safeFormatDate(reply.timestamp, 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">{reply.content}</p>
                        {reply.attachments && reply.attachments.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {reply.attachments?.map((attachment) => (
                              <a
                                key={attachment.url}
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700 hover:bg-gray-200"
                              >
                                <Paperclip className="w-3 h-3" />
                                {attachment.name}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Form */}
                <div className="mt-6 border-t border-gray-200 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Write a reply
                  </label>
                  <textarea
                    placeholder="Type your reply here..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={4}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                  />
                  <div className="mt-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          multiple
                          onChange={(e) => setReplyAttachments(Array.from(e.target.files || []))}
                          className="hidden"
                        />
                        <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm text-gray-700">
                          <Paperclip className="w-4 h-4" />
                          <span>Attach files</span>
                        </div>
                      </label>
                      {replyAttachments.length > 0 && (
                        <span className="text-sm text-gray-600">
                          {replyAttachments.length} file{replyAttachments.length !== 1 ? 's' : ''} selected
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleReply(replyContent, replyAttachments)}
                      disabled={!replyContent.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                      Send Reply
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedMessage(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isComposeOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Compose Modal Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">New Message</h2>
              <button 
                type="button"
                onClick={() => setIsComposeOpen(false)}
                className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="flex flex-col flex-1">
              {/* Compose Form */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {/* Recipients Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To
                    </label>
                    <div className="space-y-2">
                      <select
                        value={composeForm.recipientType}
                        onChange={(e) => {
                          setComposeForm(prev => ({
                            ...prev,
                            recipientType: e.target.value as ComposeForm['recipientType'],
                            recipients: [], // Clear recipients when type changes
                            selectedDepartments: [] // Clear selected departments
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="individual">Select Individual(s)</option>
                        <option value="department">Select Department</option>
                        <option value="all">All Staff</option>
                      </select>

                      {composeForm.recipientType === 'individual' && (
                        <UserMultiSelect
                          selectedUsers={composeForm.recipients}
                          onSelect={(users) => {
                            setComposeForm(prev => ({
                              ...prev,
                              recipients: users.map(user => ({
                                id: user.id,
                                name: user.name,
                                email: user.email,
                                department: user.department
                              }))
                            }));
                          }}
                          availableUsers={allUsers}
                          placeholder="Search and select recipients..."
                        />
                      )}

                      {composeForm.recipientType === 'department' && (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {departments.map(dept => (
                              <button
                                key={dept}
                                type="button"
                                onClick={async () => {
                                  const isSelected = composeForm.selectedDepartments.includes(dept);
                                  let newDepartments: string[];
                                  let newRecipients = [...composeForm.recipients];

                                  if (isSelected) {
                                    // Remove department and its users
                                    newDepartments = composeForm.selectedDepartments.filter(d => d !== dept);
                                    newRecipients = newRecipients.filter(user => user.department !== dept);
                                  } else {
                                    // Add department and its users
                                    newDepartments = [...composeForm.selectedDepartments, dept];
                                    const departmentUsers = await userService.getUsersByDepartment(dept);
                                    const newUsers = departmentUsers
                                      .filter(newUser => typeof newUser.id === 'string' && newUser.id && !newRecipients.some(existing => existing.id === newUser.id))
                                      .map(user => ({
                                        id: user.id as string,
                                        name: user.name,
                                        email: user.email,
                                        department: user.department
                                      }));
                                    newRecipients = [...newRecipients, ...newUsers];
                                  }

                                  setComposeForm(prev => ({
                                    ...prev,
                                    selectedDepartments: newDepartments,
                                    recipients: newRecipients
                                  }));
                                }}
                                className={`px-3 py-1 rounded-full text-sm ${
                                  composeForm.selectedDepartments.includes(dept)
                                    ? 'bg-primary-100 text-primary-700 border-2 border-primary-500'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent'
                                }`}
                              >
                                {dept}
                                {composeForm.selectedDepartments.includes(dept) && (
                                  <span className="ml-2 text-xs">
                                    ({composeForm.recipients.filter(u => u.department === dept).length})
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                          
                          {composeForm.selectedDepartments.length > 0 && (
                            <div className="mt-2">
                              <div className="text-sm text-gray-500 mb-1">
                                Selected recipients ({composeForm.recipients.length}):
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {composeForm.recipients.map(user => (
                                  <span
                                    key={user.id}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md text-sm"
                                  >
                                    <span>{user.name}</span>
                                    <span className="text-xs text-gray-500">({user.department})</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newRecipients = composeForm.recipients.filter(r => r.id !== user.id);
                                        const departmentStillHasUsers = newRecipients.some(
                                          r => r.department === user.department
                                        );
                                        
                                        setComposeForm(prev => ({
                                          ...prev,
                                          recipients: newRecipients,
                                          selectedDepartments: departmentStillHasUsers 
                                            ? prev.selectedDepartments 
                                            : prev.selectedDepartments.filter(d => d !== user.department)
                                        }));
                                      }}
                                      className="p-0.5 hover:bg-gray-200 rounded-full"
                                    >
                                      <X className="w-3 h-3 text-gray-500" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={composeForm.subject}
                      onChange={(e) => setComposeForm(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter message subject"
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message
                    </label>
                    <textarea
                      value={composeForm.content}
                      onChange={(e) => setComposeForm(prev => ({ ...prev, content: e.target.value }))}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Type your message here..."
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map(tag => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => {
                            setComposeForm(prev => ({
                              ...prev,
                              tags: prev.tags.some(t => t.id === tag.id)
                                ? prev.tags.filter(t => t.id !== tag.id)
                                : [...prev.tags, tag]
                            }));
                          }}
                          className={`px-3 py-1 rounded-full text-sm ${
                            composeForm.tags.some(t => t.id === tag.id)
                              ? `bg-${tag.color}-100 text-${tag.color}-700`
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Attachments */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Attachments
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            multiple
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          <div className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                            <Paperclip className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-700">Add files</span>
                          </div>
                        </label>
                      </div>
                      
                      {/* Attached Files List */}
                      {composeForm.attachments.length > 0 && (
                        <div className="space-y-2">
                          {composeForm.attachments.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center gap-2">
                                <Paperclip className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-700">{file.name}</span>
                                <span className="text-xs text-gray-500">
                                  ({(file.size / 1024).toFixed(1)} KB)
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveFile(index)}
                                className="p-1 hover:bg-gray-200 rounded-full"
                              >
                                <X className="w-4 h-4 text-gray-500" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Compose Modal Footer */}
              <div className="p-4 border-t border-gray-200 flex justify-between">
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isSending || !composeForm.recipients.length}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:hover:bg-primary-600"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSending ? 'Sending...' : 'Send Message'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
} 