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

export interface AvgTimePerDept {
  department: string;
  avgTimeIn: string;
  avgTimeOut: string;
}

export interface LateMinutesMonthly {
  month: string;
  faculty: number;
  staff: number;
  total: number;
}

export interface DeptLateMinutes {
  department: string;
  avgLateMinutes: number;
}

export interface OvertimeMonthly {
  month: string;
  overtime: number;
  forecast?: number;
}

export interface OvertimeByType {
  type: string;
  overtime: number;
}

export interface OTUTByType {
  staffId: string;
  name: string;
  totalOT: number;
  totalUT: number;
  trend: string;
}

export interface SeasonalAbsences {
  month: string;
  absent?: number;
  absences?: number;
  earlyOuts?: number;
}

export interface TopPunctualLate {
  rank: number;
  staffId: string;
  name: string;
  college?: string;
  department?: string;
  onTimeRate?: number;
  lateRate?: number;
  avgEarly?: string;
  avgLate?: string;
}

export const analyticsApi = {
  // GET /api/analytics/daily?date=YYYY-MM-DD
  getDailyKPIs: (date: string) =>
    apiRequest<DailyKPIs>(`/analytics/daily?date=${date}`),

  // GET /api/analytics/top-absentees?start=YYYY-MM-DD&end=YYYY-MM-DD&limit=10
  getTopAbsentees: (start: string, end: string, limit = 10) =>
    apiRequest<TopAbsentee[]>(`/analytics/top-absentees?start=${start}&end=${end}&limit=${limit}`),

  // GET /api/analytics/attendance-trend?start=YYYY-MM-DD&end=YYYY-MM-DD
  getAttendanceTrend: (start: string, end: string) =>
    apiRequest<AttendanceTrend[]>(`/analytics/attendance-trend?start=${start}&end=${end}`),

  // GET /api/analytics/leave-summary?start=YYYY-MM-DD&end=YYYY-MM-DD
  getLeaveSummary: (start: string, end: string) =>
    apiRequest<LeaveSummary[]>(`/analytics/leave-summary?start=${start}&end=${end}`),

  // Time Analytics
  getAvgTimePerDept: (start: string, end: string, type: 'faculty' | 'staff') =>
    apiRequest<{ rows: AvgTimePerDept[] }>(`/analytics/avg-time-per-dept?start=${start}&end=${end}&type=${type}`),

  getLateMinutesMonthly: (start: string, end: string) =>
    apiRequest<{ rows: LateMinutesMonthly[] }>(`/analytics/late-minutes-monthly?start=${start}&end=${end}`),

  getDeptLateMinutes: (start: string, end: string, type: 'faculty' | 'staff') =>
    apiRequest<{ rows: DeptLateMinutes[] }>(`/analytics/dept-late-minutes?start=${start}&end=${end}&type=${type}`),

  // Overtime Analytics
  getOvertimeMonthly: (start: string, end: string) =>
    apiRequest<{ rows: OvertimeMonthly[] }>(`/analytics/overtime-monthly?start=${start}&end=${end}`),

  getOvertimeByEmployeeType: (start: string, end: string) =>
    apiRequest<{ rows: OvertimeByType[] }>(`/analytics/overtime-by-employee-type?start=${start}&end=${end}`),

  getOTUTByType: (start: string, end: string, type: string) =>
    apiRequest<{ rows: OTUTByType[] }>(`/analytics/ot-ut-by-type?start=${start}&end=${end}&type=${encodeURIComponent(type)}`),

  // Seasonal Analytics
  getSeasonalAbsences: (year: string, season: 'rainy' | 'summer' | 'holiday') =>
    apiRequest<{ rows: SeasonalAbsences[] }>(`/analytics/seasonal-absences?year=${year}&season=${season}`),

  // Predictive Analytics
  getTopPunctualLate: (start: string, end: string, type: 'punctual' | 'late', limit = 10) =>
    apiRequest<{ rows: TopPunctualLate[] }>(`/analytics/top-punctual-late?start=${start}&end=${end}&type=${type}&limit=${limit}`),
};
