import { apiRequest, apiFormData } from './config';

export interface LeaveRequest {
  id: number;
  staff_user_id?: number;
  staff_id?: string;
  staff_name: string;
  date: string;
  reason: string;
  status: 'pending-admin' | 'approved' | 'denied' | 'cancelled';
  attachment_url?: string;
  created_at: string;
  updated_at?: string;
}

export const leaveApi = {
  // GET /api/leaves
  getAll: (params?: { status?: string; start?: string; end?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.start) query.set('start', params.start);
    if (params?.end) query.set('end', params.end);
    const queryString = query.toString();
    return apiRequest<LeaveRequest[]>(`/api/leaves${queryString ? '?' + queryString : ''}`);
  },

  // GET /api/leaves/:id
  getById: (id: number) =>
    apiRequest<LeaveRequest>(`/api/leaves/${id}`),

  // GET /api/leaves/staff/:staff_id
  getByStaffId: (staff_id: string) =>
    apiRequest<LeaveRequest[]>(`/api/leaves/staff/${staff_id}`),

  // POST /api/leaves
  create: (data: {
    staff_user_id?: number;
    staff_name: string;
    date: string;
    reason: string;
    status?: string;
  }) =>
    apiRequest<{ ok: boolean; id: number }>('/api/leaves', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // POST /api/leaves/upload
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
    formData.append('attachment', data.file);
    return apiFormData<{ ok: boolean; id: number }>('/api/leaves/upload', { method: 'POST', body: formData });
  },

  // PUT /api/leaves/:id/status
  updateStatus: (id: number, status: string) =>
    apiRequest<{ ok: boolean }>(`/api/leaves/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  // DELETE /api/leaves/:id
  delete: (id: number) =>
    apiRequest<{ ok: boolean }>(`/api/leaves/${id}`, {
      method: 'DELETE',
    }),
};
