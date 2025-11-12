import { apiRequest, apiFormData } from './config';

export interface LeaveRequest {
  id: number;
  staff_user_id?: number;
  staff_id?: string;
  staff_name: string;
  date: string;
  reason: string;
  status: 'pending' | 'pending-admin' | 'approved' | 'denied' | 'cancelled';
  attachment_url?: string;
  file_url?: string;
  leave_form_url?: string;
  fields?: {
    leave_type?: string;
    start_date?: string;
    end_date?: string;
    num_days?: number;
  };
  admin_remarks?: string;
  remarks?: string;
  created_at: string;
  updated_at?: string;
}

export const leaveApi = {
  // GET /api/leaves - FIXED: Remove /api prefix since config.ts already includes it
  getAll: (params?: { status?: string; start?: string; end?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.start) query.set('start', params.start);
    if (params?.end) query.set('end', params.end);
    const queryString = query.toString();
    return apiRequest<{ ok: boolean; data: LeaveRequest[] }>(`/leaves${queryString ? '?' + queryString : ''}`);
  },

  // GET /api/leaves/:id
  getById: (id: number) =>
    apiRequest<LeaveRequest>(`/leaves/${id}`),

  // GET /api/leaves/staff/:staff_id
  getByStaffId: (staff_id: string) =>
    apiRequest<LeaveRequest[]>(`/leaves/staff/${staff_id}`),

  // POST /api/leaves
  create: (data: {
    staff_user_id?: number;
    staff_name: string;
    date: string;
    reason: string;
    status?: string;
  }) =>
    apiRequest<{ ok: boolean; id: number }>('/leaves', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // POST /api/leaves/with-file - FIXED: Use correct endpoint
  createWithFile: (data: {
    staff_user_id?: number;
    staff_name: string;
    date: string;
    reason: string;
    file: File;
  }) => {
    const formData = new FormData();
    if (data.staff_user_id) formData.append('staff_user_id', String(data.staff_user_id));
    formData.append('staff_name', data.staff_name);
    formData.append('date', data.date);
    formData.append('reason', data.reason);
    formData.append('file', data.file);
    return apiFormData<{ ok: boolean; id: number }>('/leaves/with-file', { method: 'POST', body: formData });
  },

  // PATCH /api/leaves/:id/status
  updateStatus: (id: string | number, data: { status: string; remarks?: string }) =>
    apiRequest<{ ok: boolean }>(`/leaves/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // DELETE /api/leaves/:id
  delete: (id: number) =>
    apiRequest<{ ok: boolean }>(`/leaves/${id}`, {
      method: 'DELETE',
    }),
};