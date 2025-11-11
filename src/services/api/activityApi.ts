import { apiRequest } from './config';

export interface Activity {
  action: string;
  details: any;
  actor_staff_id: string;
  actor_role: string;
  staff_id?: string;
  created_at: string;
}

export const activityApi = {
  // GET /api/notifications/recent - Get recent activities for current user
  getRecent: (limit = 50) =>
    apiRequest<Activity[]>(`/api/notifications/recent?limit=${limit}`),
};
