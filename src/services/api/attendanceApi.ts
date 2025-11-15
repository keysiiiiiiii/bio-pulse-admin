import { apiRequest } from './config';

export interface AttendanceLog {
  staff_id: string;
  name: string;
  department: string;
  role: string;
  time_in: string | null;
  time_out: string | null;
  type: string;
  status: string;
}

export interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  on_leave: number;
}

export const attendanceApi = {
  // ❌ OLD: /api/attendance/logs
  // ✅ NEW: /attendance/logs
  getLogs: (date: string) =>
    apiRequest<AttendanceLog[]>(`/attendance/logs?date=${date}`),

  getStats: (date: string) =>
    apiRequest<AttendanceStats>(`/attendance/stats?date=${date}`),

  manualCheckIn: (data: {
    staff_id: string;
    date: string;
    time_in?: string;
    time_out?: string;
  }) =>
    apiRequest<{ ok: boolean; message: string }>('/attendance/manual', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};