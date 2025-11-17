// src/services/api/staffApi.ts
// IMPORTANT: Default URL must include /api
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

// Debug: Log the API_BASE to verify
console.log('🔧 API_BASE:', API_BASE);

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const staffApi = {
  // Authentication
  login: async (staff_id: string, password: string) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staff_id, password }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Login failed" }));
      throw new Error(error.message || "Login failed");
    }
    
    return response.json();
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await fetch(`${API_BASE}/auth/me`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error("Failed to fetch current user");
    }
    
    return response.json();
  },

  // Get user by staff_id
  getByStaffId: async (staff_id: string) => {
    const response = await fetch(`${API_BASE}/users/${staff_id}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error("Failed to fetch user data");
    }
    
    return response.json();
  },

  // Get all users (Admin/ICTO only)
  getAll: async () => {
    const response = await fetch(`${API_BASE}/users`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error("Failed to fetch users");
    }
    
    return response.json();
  },

  // Get all staff (backward compatibility)
  getAllStaff: async () => {
    const response = await fetch(`${API_BASE}/staff`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error("Failed to fetch staff");
    }
    
    return response.json();
  },

  // Create new user
  create: async (userData: any) => {
    const response = await fetch(`${API_BASE}/users`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to create user" }));
      throw new Error(error.message || "Failed to create user");
    }
    
    return response.json();
  },

  // Update user
  update: async (staff_id: string, data: any) => {
    const response = await fetch(`${API_BASE}/users/${staff_id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to update user" }));
      throw new Error(error.message || "Failed to update user");
    }
    
    return response.json();
  },

  // Update password
  updatePassword: async (staff_id: string, passwordData: { currentPassword: string; newPassword: string }) => {
    const response = await fetch(`${API_BASE}/users/${staff_id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ password: passwordData.newPassword }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to update password" }));
      throw new Error(error.message || "Failed to update password");
    }
    
    return response.json();
  },

  // Upload avatar
  uploadAvatar: async (staff_id: string, formData: FormData) => {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE}/users/${staff_id}`, {
      method: "PATCH",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to upload avatar" }));
      throw new Error(error.message || "Failed to upload avatar");
    }
    
    const result = await response.json();
    return { url: result.photo_url || "" };
  },

  // Get user activity (Admin/ICTO only)
  getUserActivity: async (staff_id: string, limit = 100) => {
    const response = await fetch(`${API_BASE}/users/${staff_id}/activity?limit=${limit}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error("Failed to fetch user activity");
    }
    
    return response.json();
  },

  // Get device PIN for biometric enrollment
  getDevicePin: async (staff_id: string) => {
    const response = await fetch(`${API_BASE}/users/${staff_id}/device-pin`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error("Failed to generate device PIN");
    }
    
    return response.json();
  },

  // Leave management
  // Get current user's own leave credits (Staff/Faculty only)
  getMyLeaveCredits: async () => {
    const response = await fetch(`${API_BASE}/leave/me`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error("Failed to fetch leave credits");
    }
    
    return response.json();
  },

  // Admin endpoint to get any user's leave credits
  getLeaveCredits: async (staff_id: string) => {
    const response = await fetch(`${API_BASE}/leave/${staff_id}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error("Failed to fetch leave credits");
    }
    
    return response.json();
  },

  activateLeave: async (staff_id: string, hr_password: string) => {
    const response = await fetch(`${API_BASE}/leave/activate`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ staff_id, hr_password }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to activate leave" }));
      throw new Error(error.message || "Failed to activate leave");
    }
    
    return response.json();
  },

  // Scan account form using AI (Groq)
  scanAccountForm: async (formData: FormData) => {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE}/llm/parse-form`, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        // Don't set Content-Type for FormData - browser will set it with boundary
      },
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to scan form" }));
      throw new Error(error.message || "Failed to scan form");
    }
    
    return response.json();
  },
};