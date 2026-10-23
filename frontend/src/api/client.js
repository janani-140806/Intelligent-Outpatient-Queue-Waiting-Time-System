const API_BASE = '/api';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    // Only clear and redirect if we had a token that is now rejected
    if (token && !endpoint.includes('/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.detail || response.statusText || 'An error occurred';
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  login: (creds) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(creds) }),
  register: (userData) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  getMe: () => apiRequest('/auth/me'),

  // Departments
  getDepartments: () => apiRequest('/departments'),
  createDepartment: (dept) => apiRequest('/departments', { method: 'POST', body: JSON.stringify(dept) }),

  // Doctors
  getDoctors: (deptId) => apiRequest(`/doctors${deptId ? `?department_id=${deptId}` : ''}`),
  createDoctor: (doc) => apiRequest('/doctors', { method: 'POST', body: JSON.stringify(doc) }),
  updateDoctorStatus: (id, update) => apiRequest(`/doctors/${id}/status`, { method: 'PATCH', body: JSON.stringify(update) }),

  // Appointments
  getAppointments: (status) => apiRequest(`/appointments${status ? `?status_filter=${status}` : ''}`),
  bookAppointment: (data) => apiRequest('/appointments', { method: 'POST', body: JSON.stringify(data) }),
  cancelAppointment: (id) => apiRequest(`/appointments/${id}/cancel`, { method: 'POST' }),

  // Queue
  getQueue: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/queue${qs ? `?${qs}` : ''}`);
  },
  getDoctorQueue: (doctorId) => apiRequest(`/queue/doctor/${doctorId}`),
  getPatientActiveQueue: () => apiRequest('/queue/patient/current'),
  startConsultation: (queueId) => apiRequest(`/queue/${queueId}/start`, { method: 'POST' }),
  completeConsultation: (queueId, payload) => apiRequest(`/queue/${queueId}/complete`, { method: 'POST', body: JSON.stringify(payload) }),
  skipPatient: (queueId) => apiRequest(`/queue/${queueId}/skip`, { method: 'POST' }),

  // ML Prediction
  predictWaitingTime: (input) => apiRequest('/predict-waiting-time', { method: 'POST', body: JSON.stringify(input) }),
  getMLMetrics: () => apiRequest('/ml/metrics'),

  // Admin
  getAdminOverview: () => apiRequest('/admin/overview'),
  getAdminAnalytics: () => apiRequest('/admin/analytics'),

  // Notifications
  getNotifications: () => apiRequest('/notifications'),
  markNotificationRead: (id) => apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => apiRequest('/notifications/read-all', { method: 'POST' })
};
