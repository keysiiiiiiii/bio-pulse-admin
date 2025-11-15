// src/services/api/config.ts

// Detect LAN IP dynamically for local testing
const LAN_IP =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3001"
    : `http://${window.location.hostname}:3001`;

const BASE = import.meta.env.VITE_API_URL || LAN_IP;
export const API_BASE_URL = BASE.endsWith('/api') ? BASE : BASE + '/api';

// Attach JWT token automatically if present
function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Helper for JSON-based API requests
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// Helper for multipart/form-data uploads
export async function apiFormData<T>(
  endpoint: string,
  options: RequestInit & { body: FormData }
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    method: options.method || 'POST',
    body: options.body,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}
