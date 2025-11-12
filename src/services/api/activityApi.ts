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
  // FIXED: Remove /api prefix since config.ts already includes it
  getRecent: (limit = 50) =>
    apiRequest<Activity[]>(`/notifications/recent?limit=${limit}`),
};