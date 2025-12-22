export interface MessageRead {
  userId: string;
  userName: string;
  readAt: Date;
}

export interface MessageReply {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  attachments?: Array<{
    name: string;
    size: number;
    type: string;
    url: string;
  }>;
}

export interface Message {
  id: string;
  sender: string;
  subject: string;
  content: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
  read: boolean;
  labels: string[];
  email: string;
  recipients: {
    type: 'department' | 'individual' | 'all';
    users: Array<{
      id: string;
      name: string;
      email: string;
      department?: string;
    }>;
  };
  recipientIds: string[];
  attachments?: Array<{
    name: string;
    size: number;
    type: string;
    url: string;
  }>;
  senderId: string;
  senderEmail: string;
  senderName: string;
  readBy: MessageRead[];
  archivedBy?: string[];
  starredBy?: string[];
  parentMessageId?: string;
  replyTo?: string;
  replies: MessageReply[];
  isReply?: boolean;
  isDraft?: boolean;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface ComposeForm {
  recipientType: 'individual' | 'department' | 'all';
  recipients: Array<{
    id: string;
    name: string;
    email: string;
    department?: string;
  }>;
  selectedDepartments: string[];
  subject: string;
  content: string;
  attachments: File[];
  tags: Tag[];
}

export interface Draft extends Omit<Message, 'recipients'> {
  recipients?: Message['recipients'];
}

