import { apiRequest } from './config';

export interface Notification {
  id: number;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
}

export const notificationApi = {
  // GET /api/notifications/unread-count?staff_id=...
  getUnreadCount: (staff_id: string) =>
    apiRequest<{ count: number }>(`/api/notifications/unread-count?staff_id=${staff_id}`),

  // GET /api/notifications?staff_id=...&limit=50
  getAll: (staff_id: string, limit = 50) =>
    apiRequest<{ items: Notification[] }>(`/api/notifications?staff_id=${staff_id}&limit=${limit}`),

  // POST /api/notifications/mark-all-read
  markAllRead: (staff_id: string) =>
    apiRequest<{ ok: boolean }>('/api/notifications/mark-all-read', {
      method: 'POST',
      body: JSON.stringify({ staff_id }),
    }),
};
