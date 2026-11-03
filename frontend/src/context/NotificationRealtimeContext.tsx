import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext.js';
import { notificationsApi } from '../api/index.js';

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  ticketNumber?: string;
  link?: string | null;
  createdAt: string;
  autoDismissMs?: number;
}

interface NotificationRealtimeContextType {
  toasts: ToastNotification[];
  dismissToast: (id: string) => void;
  clickToast: (toast: ToastNotification) => void;
}

const NotificationRealtimeContext = createContext<NotificationRealtimeContextType | undefined>(undefined);

const MAX_VISIBLE_TOASTS = 5;
const DEFAULT_AUTO_DISMISS_MS = 7000; // 7 seconds (within 5-8s requirement)

export const NotificationRealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const queueRef = useRef<ToastNotification[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const eventSourceRef = useRef<EventSource | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Helper to extract ticket number e.g. CRM-000021
  const extractTicketNumber = (title: string, message: string): string | undefined => {
    const match = `${title} ${message}`.match(/CRM-\d{6}/i);
    return match ? match[0].toUpperCase() : undefined;
  };

  // Dismiss a toast
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));

    // Broadcast dismiss to other same-origin tabs
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({ type: 'DISMISS_TOAST', id });
    }

    // If there are queued toasts, pull the next one into the visible stack
    setTimeout(() => {
      if (queueRef.current.length > 0) {
        const nextToast = queueRef.current.shift()!;
        setToasts((prev) => {
          if (prev.length < MAX_VISIBLE_TOASTS && !prev.some((t) => t.id === nextToast.id)) {
            return [...prev, nextToast];
          }
          return prev;
        });
      }
    }, 100);
  }, []);

  // Handle click on notification: navigate to ticket, mark read, dismiss
  const clickToast = useCallback(
    async (toast: ToastNotification) => {
      dismissToast(toast.id);

      // Mark notification as read in database
      try {
        await notificationsApi.markAsRead(toast.id);
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });

        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({ type: 'SYNC_UNREAD_COUNT' });
        }
      } catch {
        // non-blocking
      }

      // Navigate to ticket or link
      if (toast.link) {
        navigate(toast.link);
      } else if (toast.ticketNumber) {
        const isAgent = user?.role === 'AGENT';
        navigate(isAgent ? `/agent/tickets` : `/admin/tickets`);
      }
    },
    [dismissToast, navigate, queryClient, user?.role]
  );

  // Add toast with max-5 visible stack and queuing
  const addToast = useCallback((raw: any) => {
    if (!raw || !raw.id) return;

    // Deduplicate against seen IDs (idempotency)
    if (seenIdsRef.current.has(raw.id)) {
      return;
    }
    seenIdsRef.current.add(raw.id);

    const ticketNumber = extractTicketNumber(raw.title || '', raw.message || '');
    const newToast: ToastNotification = {
      id: raw.id,
      title: raw.title || 'Notification',
      message: raw.message || '',
      type: raw.type || 'INFO',
      ticketNumber,
      link: raw.link,
      createdAt: raw.createdAt || new Date().toISOString(),
      autoDismissMs: DEFAULT_AUTO_DISMISS_MS,
    };

    setToasts((prev) => {
      if (prev.length < MAX_VISIBLE_TOASTS) {
        return [...prev, newToast];
      } else {
        // Queue beyond 5
        queueRef.current.push(newToast);
        return prev;
      }
    });

    // Invalidate React Query caches so bell badge and lists update in real time
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
  }, [queryClient]);

  // Multi-tab synchronization using BroadcastChannel
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;

    const bc = new BroadcastChannel('crm_notifications_sync');
    broadcastChannelRef.current = bc;

    bc.onmessage = (event) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'NEW_NOTIFICATION') {
        addToast(data.payload);
      } else if (data.type === 'DISMISS_TOAST') {
        setToasts((prev) => prev.filter((t) => t.id !== data.id));
      } else if (data.type === 'SYNC_UNREAD_COUNT') {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      }
    };

    return () => {
      bc.close();
      broadcastChannelRef.current = null;
    };
  }, [addToast, queryClient]);

  // Connect to SSE Stream when authenticated
  useEffect(() => {
    if (!token || !user) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const sseUrl = `/api/v1/notifications/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.addEventListener('connected', () => {
      // Stream connected
    });

    es.addEventListener('notification', (event) => {
      try {
        const payload = JSON.parse(event.data);
        addToast(payload);

        // Broadcast to other same-origin tabs
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({
            type: 'NEW_NOTIFICATION',
            payload,
          });
        }
      } catch {
        // ignore parse error
      }
    });

    es.onerror = () => {
      // EventSource automatically retries connection
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [token, user, addToast]);

  return (
    <NotificationRealtimeContext.Provider value={{ toasts, dismissToast, clickToast }}>
      {children}
    </NotificationRealtimeContext.Provider>
  );
};

export const useRealtimeNotifications = () => {
  const context = useContext(NotificationRealtimeContext);
  if (!context) {
    throw new Error('useRealtimeNotifications must be used within NotificationRealtimeProvider');
  }
  return context;
};
