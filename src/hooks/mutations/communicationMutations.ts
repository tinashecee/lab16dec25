import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  arrayUnion,
  getDoc
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Message } from '../../types/communication';

// Send a new message
export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (message: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>) => {
      const messagesRef = collection(db, 'messages');
      const docRef = await addDoc(messagesRef, {
        ...message,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        readBy: [],
        archivedBy: [],
      });
      return docRef.id;
    },
    onSuccess: (_, variables) => {
      // Invalidate sent messages for sender
      queryClient.invalidateQueries({ queryKey: ['messages', variables.senderId, 'sent'] });
      // Invalidate inbox for all recipients
      variables.recipientIds?.forEach(recipientId => {
        queryClient.invalidateQueries({ queryKey: ['messages', recipientId, 'inbox'] });
        queryClient.invalidateQueries({ queryKey: ['messages', 'unreadCount', recipientId] });
      });
    },
  });
}

// Save a draft message
export function useSaveDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ draftId, message }: { draftId?: string; message: Partial<Message> }) => {
      if (draftId) {
        // Update existing draft
        const draftRef = doc(db, 'messages', draftId);
        await updateDoc(draftRef, {
          ...message,
          isDraft: true,
          updatedAt: serverTimestamp(),
        });
        return draftId;
      } else {
        // Create new draft
        const messagesRef = collection(db, 'messages');
        const docRef = await addDoc(messagesRef, {
          ...message,
          isDraft: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return docRef.id;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.message.senderId, 'drafts'] });
    },
  });
}

// Reply to a message
export function useReplyToMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ 
      originalMessageId, 
      reply 
    }: { 
      originalMessageId: string; 
      reply: Omit<Message, 'id' | 'createdAt' | 'updatedAt'> 
    }) => {
      // Add reply to original message
      const messageRef = doc(db, 'messages', originalMessageId);
      await updateDoc(messageRef, {
        replies: arrayUnion({
          id: Date.now().toString(),
          content: reply.content,
          senderId: reply.senderId,
          senderName: reply.senderName,
          timestamp: new Date(),
          attachments: reply.attachments || [],
        }),
        updatedAt: serverTimestamp(),
      });
      
      return originalMessageId;
    },
    onSuccess: (messageId, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', messageId] });
      queryClient.invalidateQueries({ queryKey: ['messages', variables.reply.senderId, 'sent'] });
      
      // Invalidate inbox for recipients
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

// Mark message as read
export function useMarkMessageAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, userId, userName }: { messageId: string; userId: string; userName: string }) => {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        readBy: arrayUnion({
          userId,
          userName,
          readAt: new Date(),
        }),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.messageId] });
      queryClient.invalidateQueries({ queryKey: ['messages', variables.userId, 'inbox'] });
      queryClient.invalidateQueries({ queryKey: ['messages', 'unreadCount', variables.userId] });
    },
  });
}

// Archive a message
export function useArchiveMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, userId }: { messageId: string; userId: string }) => {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        archivedBy: arrayUnion(userId),
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.userId, 'inbox'] });
      queryClient.invalidateQueries({ queryKey: ['messages', variables.userId, 'sent'] });
      queryClient.invalidateQueries({ queryKey: ['messages', variables.userId, 'archived'] });
    },
  });
}

// Unarchive a message
export function useUnarchiveMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, userId }: { messageId: string; userId: string }) => {
      const messageRef = doc(db, 'messages', messageId);
      const messageSnap = await getDoc(messageRef);
      if (messageSnap.exists()) {
        const data = messageSnap.data();
        const archivedBy = (data.archivedBy || []).filter((id: string) => id !== userId);
        await updateDoc(messageRef, {
          archivedBy,
          updatedAt: serverTimestamp(),
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.userId, 'inbox'] });
      queryClient.invalidateQueries({ queryKey: ['messages', variables.userId, 'sent'] });
      queryClient.invalidateQueries({ queryKey: ['messages', variables.userId, 'archived'] });
    },
  });
}

// Delete a message (draft or sent)
export function useDeleteMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: string) => {
      const messageRef = doc(db, 'messages', messageId);
      await deleteDoc(messageRef);
    },
    onSuccess: () => {
      // Invalidate all message queries to be safe
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

// Star/Unstar a message
export function useToggleStarMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, userId, isStarred }: { messageId: string; userId: string; isStarred: boolean }) => {
      const messageRef = doc(db, 'messages', messageId);
      const messageSnap = await getDoc(messageRef);
      
      if (messageSnap.exists()) {
        const data = messageSnap.data();
        let starredBy = data.starredBy || [];
        
        if (isStarred) {
          starredBy = starredBy.filter((id: string) => id !== userId);
        } else {
          starredBy.push(userId);
        }
        
        await updateDoc(messageRef, {
          starredBy,
          updatedAt: serverTimestamp(),
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.messageId] });
      queryClient.invalidateQueries({ queryKey: ['messages', variables.userId] });
    },
  });
}

