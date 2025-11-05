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
  // GET /api/attendance/logs?date=YYYY-MM-DD
  getLogs: (date: string) =>
    apiRequest<AttendanceLog[]>(`/api/attendance/logs?date=${date}`),

  // GET /api/attendance/stats?date=YYYY-MM-DD
  getStats: (date: string) =>
    apiRequest<AttendanceStats>(`/api/attendance/stats?date=${date}`),

  // POST /api/attendance/manual
  manualCheckIn: (data: {
    staff_id: string;
    date: string;
    time_in?: string;
    time_out?: string;
  }) =>
    apiRequest<{ ok: boolean; message: string }>('/api/attendance/manual', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
