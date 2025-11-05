import { apiRequest, apiFormData } from './config';

export interface Staff {
  id: number;
  staff_id: string;
  name: string;
  email?: string;
  department: string;
  employee_type: string;
  role: string;
  contact_no?: string;
  avatar_url?: string;
  created_at?: string;
}

export interface LoginResponse {
  ok: boolean;
  token?: string;
  user?: Staff;
  error?: string;
}

export interface ActivityLog {
  id: number;
  staff_id: string;
  action: string;
  details: any;
  created_at: string;
  actor_staff_id?: string;
  actor_role?: string;
}

export const staffApi = {
  // POST /api/login
  login: (staff_id: string, password: string) =>
    apiRequest<LoginResponse>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ staff_id, password }),
    }),

  // GET /api/staff
  getAll: () =>
    apiRequest<Staff[]>('/api/staff'),

  // GET /api/staff/:staff_id
  getByStaffId: (staff_id: string) =>
    apiRequest<Staff>(`/api/staff/${staff_id}`),

  // POST /api/staff
  create: (data: Partial<Staff> & { password?: string }) =>
    apiRequest<{ ok: boolean; staff_id: string }>('/api/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // PUT /api/staff/:staff_id
  update: (staff_id: string, data: Partial<Staff>) =>
    apiRequest<{ ok: boolean }>(`/api/staff/${staff_id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // DELETE /api/staff/:staff_id
  delete: (staff_id: string) =>
    apiRequest<{ ok: boolean }>(`/api/staff/${staff_id}`, {
      method: 'DELETE',
    }),

  // PUT /api/staff/:staff_id/password
  updatePassword: (staff_id: string, password: string) =>
    apiRequest<{ ok: boolean }>(`/api/staff/${staff_id}/password`, {
      method: 'PUT',
      body: JSON.stringify({ password }),
    }),

  // POST /api/staff/:staff_id/avatar
  uploadAvatar: (staff_id: string, file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return apiFormData<{ ok: boolean; url: string }>(`/api/staff/${staff_id}/avatar`, formData);
  },

  // GET /api/staff/:staff_id/activity
  getActivity: (staff_id: string, limit = 50) =>
    apiRequest<ActivityLog[]>(`/api/staff/${staff_id}/activity?limit=${limit}`),
};
