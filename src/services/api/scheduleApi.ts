import { apiRequest } from './config';

export interface WorkSchedule {
  id?: number;
  staff_user_id: number;
  day_of_week: number;
  time_in: string;
  time_out: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  created_by_staff_id?: string;
}

export interface SchedulePayload {
  staff_user_id: number;
  schedules: {
    day_of_week: number;
    time_in: string;
    time_out: string;
  }[];
  created_by_staff_id: string;
}

export const scheduleApi = {
  // Get user's active schedule
  getSchedule: (staff_user_id: number) =>
    apiRequest<{ ok: boolean; schedules: WorkSchedule[]; user: any }>(`/schedules/${staff_user_id}`),

  // Get unscheduled users
  getUnscheduledUsers: () =>
    apiRequest<{ ok: boolean; users: any[]; count: number }>('/schedules/unscheduled/list'),

  // Create/update schedule
  saveSchedule: (payload: SchedulePayload) =>
    apiRequest<{ ok: boolean; message: string; schedules: WorkSchedule[] }>('/schedules', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Delete schedule
  deleteSchedule: (staff_user_id: number, deleted_by_staff_id: string) =>
    apiRequest<{ ok: boolean; message: string }>(`/schedules/${staff_user_id}`, {
      method: 'DELETE',
      body: JSON.stringify({ deleted_by_staff_id }),
    }),
};
