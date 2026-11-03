import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api/index.js';
import { NotificationItem } from '../types/index.js';

export function useNotifications(options?: { unreadOnly?: boolean; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['notifications', options?.unreadOnly, options?.page, options?.limit],
    queryFn: async () => {
      const response = await notificationsApi.list(options);
      const data = response?.data;
      // Handle both paginated response object and flat array format
      if (Array.isArray(data)) {
        return {
          notifications: data as NotificationItem[],
          total: data.length,
          unreadCount: data.filter((n: NotificationItem) => !n.isRead).length,
        };
      }
      return {
        notifications: (data?.notifications || []) as NotificationItem[],
        total: data?.total || 0,
        unreadCount: data?.unreadCount || 0,
        page: data?.page || 1,
        totalPages: data?.totalPages || 1,
      };
    },
    refetchInterval: 10000, // Poll every 10 seconds
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const response = await notificationsApi.getUnreadCount();
      return response?.data?.count || 0;
    },
    refetchInterval: 10000,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return notificationsApi.markAsRead(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return notificationsApi.markAllAsRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return notificationsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
