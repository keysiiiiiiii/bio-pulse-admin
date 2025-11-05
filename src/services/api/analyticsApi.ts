import { apiRequest } from './config';

export interface DailyKPIs {
  present: number;
  absent: number;
  on_leave: number;
  total: number;
  present_rate: number;
}

export interface TopAbsentee {
  staff_id: string;
  name: string;
  department: string;
  absent_count: number;
}

export interface AttendanceTrend {
  date: string;
  present: number;
  absent: number;
  on_leave: number;
  present_rate: number;
}

export interface LeaveSummary {
  staff_id: string;
  name: string;
  department: string;
  leave_count: number;
  status_breakdown: Record<string, number>;
}

export const analyticsApi = {
  // GET /api/analytics/daily?date=YYYY-MM-DD
  getDailyKPIs: (date: string) =>
    apiRequest<DailyKPIs>(`/api/analytics/daily?date=${date}`),

  // GET /api/analytics/top-absentees?start=YYYY-MM-DD&end=YYYY-MM-DD&limit=10
  getTopAbsentees: (start: string, end: string, limit = 10) =>
    apiRequest<TopAbsentee[]>(`/api/analytics/top-absentees?start=${start}&end=${end}&limit=${limit}`),

  // GET /api/analytics/attendance-trend?start=YYYY-MM-DD&end=YYYY-MM-DD
  getAttendanceTrend: (start: string, end: string) =>
    apiRequest<AttendanceTrend[]>(`/api/analytics/attendance-trend?start=${start}&end=${end}`),

  // GET /api/analytics/leave-summary?start=YYYY-MM-DD&end=YYYY-MM-DD
  getLeaveSummary: (start: string, end: string) =>
    apiRequest<LeaveSummary[]>(`/api/analytics/leave-summary?start=${start}&end=${end}`),
};
