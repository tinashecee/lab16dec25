import { useQuery } from '@tanstack/react-query';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type { Message } from '../../../types/communication';

// Fetch messages for a user (inbox, sent, drafts, archived)
export function useMessages(userId: string | undefined, folder: 'inbox' | 'sent' | 'drafts' | 'archived' = 'inbox') {
  return useQuery<Message[]>({
    queryKey: ['messages', userId, folder],
    queryFn: async () => {
      if (!userId) return [];
      
      const messagesRef = collection(db, 'messages');
      let q;

      switch (folder) {
        case 'inbox':
          q = query(
            messagesRef,
            where('recipientIds', 'array-contains', userId),
            where('archivedBy', 'not-array-contains', userId),
            orderBy('createdAt', 'desc'),
            limit(100)
          );
          break;
        case 'sent':
          q = query(
            messagesRef,
            where('senderId', '==', userId),
            where('archivedBy', 'not-array-contains', userId),
            orderBy('createdAt', 'desc'),
            limit(100)
          );
          break;
        case 'drafts':
          q = query(
            messagesRef,
            where('senderId', '==', userId),
            where('isDraft', '==', true),
            orderBy('createdAt', 'desc'),
            limit(50)
          );
          break;
        case 'archived':
          q = query(
            messagesRef,
            where('archivedBy', 'array-contains', userId),
            orderBy('createdAt', 'desc'),
            limit(100)
          );
          break;
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
      })) as Message[];
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute - frequent updates for messages
    gcTime: 10 * 60 * 1000,
  });
}

// Fetch a single message by ID
export function useMessage(messageId: string | undefined) {
  return useQuery<Message | null>({
    queryKey: ['messages', messageId],
    queryFn: async () => {
      if (!messageId) return null;
      
      const messageRef = doc(db, 'messages', messageId);
      const snapshot = await getDoc(messageRef);
      
      if (!snapshot.exists()) return null;
      
      return {
        id: snapshot.id,
        ...snapshot.data(),
        createdAt: snapshot.data().createdAt?.toDate?.() || new Date(),
        updatedAt: snapshot.data().updatedAt?.toDate?.() || new Date(),
      } as Message;
    },
    enabled: !!messageId,
    staleTime: 2 * 60 * 1000,
  });
}

// Fetch unread message count
export function useUnreadMessageCount(userId: string | undefined) {
  return useQuery<number>({
    queryKey: ['messages', 'unreadCount', userId],
    queryFn: async () => {
      if (!userId) return 0;
      
      const messagesRef = collection(db, 'messages');
      const q = query(
        messagesRef,
        where('recipientIds', 'array-contains', userId),
        where('readBy', 'not-array-contains', { userId })
      );
      
      const snapshot = await getDocs(q);
      return snapshot.size;
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds - very frequent for unread count
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

// Fetch message threads (grouped conversations)
export function useMessageThreads(userId: string | undefined) {
  return useQuery<Message[]>({
    queryKey: ['messages', 'threads', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const messagesRef = collection(db, 'messages');
      const q = query(
        messagesRef,
        where('recipientIds', 'array-contains', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      
      const snapshot = await getDocs(q);
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
      })) as Message[];
      
      // Group by subject/thread
      const threadsMap = new Map<string, Message>();
      messages.forEach(msg => {
        const threadKey = msg.replyTo || msg.id;
        if (!threadsMap.has(threadKey) || 
            (threadsMap.get(threadKey)!.createdAt < msg.createdAt)) {
          threadsMap.set(threadKey, msg);
        }
      });
      
      return Array.from(threadsMap.values());
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000,
  });
}

// Search messages
export function useMessageSearch(userId: string | undefined, searchTerm: string) {
  return useQuery<Message[]>({
    queryKey: ['messages', 'search', userId, searchTerm],
    queryFn: async () => {
      if (!userId || !searchTerm) return [];
      
      // Note: Firestore doesn't support full-text search natively
      // This is a simple implementation - consider using Algolia or similar for production
      const messagesRef = collection(db, 'messages');
      const q = query(
        messagesRef,
        where('recipientIds', 'array-contains', userId),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      
      const snapshot = await getDocs(q);
      const allMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
      })) as Message[];
      
      // Client-side filtering
      const lowerSearch = searchTerm.toLowerCase();
      return allMessages.filter(msg => 
        msg.subject?.toLowerCase().includes(lowerSearch) ||
        msg.content?.toLowerCase().includes(lowerSearch) ||
        msg.senderName?.toLowerCase().includes(lowerSearch)
      );
    },
    enabled: !!userId && !!searchTerm && searchTerm.length > 2,
    staleTime: 2 * 60 * 1000,
  });
}

