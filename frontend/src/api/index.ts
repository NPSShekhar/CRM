import { apiClient } from './client.js';
import {
  ApiResponse,
  DashboardMetrics,
  TicketSummary,
  CustomerSummary,
  ApplicationSummary,
  AgentSummary,
  TicketMessageSummary,
  NotificationItem,
} from '../types/index.js';

// Auth API
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    apiClient.post<any, ApiResponse<{ token: string; user: any }>>('/auth/login', credentials),
  getMe: () => apiClient.get<any, ApiResponse<any>>('/auth/me'),
};

// Users API
export const usersApi = {
  list: () => apiClient.get<any, ApiResponse<any[]>>('/users'),
  getById: (id: string) => apiClient.get<any, ApiResponse<any>>(`/users/${id}`),
  getMe: () => apiClient.get<any, ApiResponse<any>>('/users/me'),
};

// Tickets API
export const ticketsApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<any, ApiResponse<TicketSummary[]>>('/tickets', { params }),
  getById: (id: string) =>
    apiClient.get<any, ApiResponse<TicketSummary>>(`/tickets/${id}`),
  create: (data: any) =>
    apiClient.post<any, ApiResponse<TicketSummary>>('/tickets', data),
  updateStatus: (id: string, status: string) =>
    apiClient.put<any, ApiResponse<TicketSummary>>(`/tickets/${id}/status`, { status }),
  updatePriority: (id: string, priority: string) =>
    apiClient.put<any, ApiResponse<TicketSummary>>(`/tickets/${id}/priority`, { priority }),
  assign: (id: string, payload: { agentId?: string | null; teamId?: string | null; reason?: string }) =>
    apiClient.put<any, ApiResponse<TicketSummary>>(`/tickets/${id}/assign`, payload),
  getMessages: (id: string) =>
    apiClient.get<any, ApiResponse<TicketMessageSummary[]>>(`/tickets/${id}/messages`),
  addMessage: (id: string, payload: any) =>
    apiClient.post<any, ApiResponse<TicketMessageSummary>>(`/tickets/${id}/messages`, payload),
  uploadAttachment: (formData: FormData) =>
    apiClient.post<any, ApiResponse<any>>('/tickets/attachments', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  retryMessageEmail: (ticketId: string, messageId: string) =>
    apiClient.post<any, ApiResponse<any>>(`/tickets/${ticketId}/messages/${messageId}/retry`),
};

// Customers API
export const customersApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<any, ApiResponse<CustomerSummary[]>>('/customers', { params }),
  getById: (id: string) =>
    apiClient.get<any, ApiResponse<CustomerSummary>>(`/customers/${id}`),
  create: (data: any) =>
    apiClient.post<any, ApiResponse<CustomerSummary>>('/customers', data),
  update: (id: string, data: any) =>
    apiClient.put<any, ApiResponse<CustomerSummary>>(`/customers/${id}`, data),
};

// Applications API
export const applicationsApi = {
  list: () => apiClient.get<any, ApiResponse<ApplicationSummary[]>>('/applications'),
  getById: (id: string) => apiClient.get<any, ApiResponse<ApplicationSummary>>(`/applications/${id}`),
  create: (data: any) => apiClient.post<any, ApiResponse<ApplicationSummary>>('/applications', data),
  update: (id: string, data: any) => apiClient.put<any, ApiResponse<ApplicationSummary>>(`/applications/${id}`, data),
};

// Agents API
export const agentsApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<any, ApiResponse<AgentSummary[]>>('/agents', { params }),
  getWorkload: () => apiClient.get<any, ApiResponse<any[]>>('/agents/workload'),
  create: (data: any) => apiClient.post<any, ApiResponse<AgentSummary>>('/agents', data),
  update: (id: string, data: any) => apiClient.patch<any, ApiResponse<AgentSummary>>(`/agents/${id}`, data),
  toggleStatus: (id: string, status: 'ACTIVE' | 'INACTIVE') =>
    apiClient.patch<any, ApiResponse<any>>(`/agents/${id}/status`, { status }),
  resetPassword: (id: string, password: string) =>
    apiClient.post<any, ApiResponse<any>>(`/agents/${id}/reset-password`, { password }),
};

// Memberships API
export const membershipsApi = {
  listPlans: () => apiClient.get<any, ApiResponse<any[]>>('/memberships/plans'),
  getPlanById: (id: string) => apiClient.get<any, ApiResponse<any>>(`/memberships/plans/${id}`),
  createPlan: (data: any) => apiClient.post<any, ApiResponse<any>>('/memberships/plans', data),
  updatePlan: (id: string, data: any) => apiClient.put<any, ApiResponse<any>>(`/memberships/plans/${id}`, data),
  assign: (data: { customerId: string; planId: string; customHours?: number; validityDays?: number }) =>
    apiClient.post<any, ApiResponse<any>>('/memberships/assign', data),
  getCustomerMemberships: (customerId: string) =>
    apiClient.get<any, ApiResponse<any>>(`/memberships/customer/${customerId}`),
};

// Support Hours & Time Tracking API
export const supportHoursApi = {
  logTime: (ticketId: string, data: { agentId?: string; startTime?: string; endTime?: string; durationMinutes: number; description: string; hourlyRate?: number }) =>
    apiClient.post<any, ApiResponse<any>>(`/support-hours/tickets/${ticketId}/time-entries`, data),
  getTicketTimeEntries: (ticketId: string) =>
    apiClient.get<any, ApiResponse<any>>(`/support-hours/tickets/${ticketId}/time-entries`),
  getCustomerSummary: (customerId: string) =>
    apiClient.get<any, ApiResponse<any>>(`/support-hours/customers/${customerId}/summary`),
};

// Accountant Billing API
export const billingApi = {
  getSummary: () => apiClient.get<any, ApiResponse<any>>('/billing/summary'),
  listExtraHours: (params?: Record<string, any>) =>
    apiClient.get<any, ApiResponse<any[]>>('/billing/extra-hours', { params }),
  updateStatus: (id: string, data: { status: string; notes?: string }) =>
    apiClient.put<any, ApiResponse<any>>(`/billing/extra-hours/${id}/status`, data),
  getExportUrl: (params?: Record<string, any>) => {
    const query = new URLSearchParams(params || {}).toString();
    return `/api/billing/export${query ? `?${query}` : ''}`;
  },
};

// Teams API
export const teamsApi = {
  list: () => apiClient.get<any, ApiResponse<any[]>>('/teams'),
  getById: (id: string) => apiClient.get<any, ApiResponse<any>>(`/teams/${id}`),
  create: (data: any) => apiClient.post<any, ApiResponse<any>>('/teams', data),
  update: (id: string, data: any) => apiClient.put<any, ApiResponse<any>>(`/teams/${id}`, data),
};

// Reports API
export const reportsApi = {
  getDashboardMetrics: () =>
    apiClient.get<any, ApiResponse<DashboardMetrics>>('/reports/dashboard'),
};

// Notifications API
export const notificationsApi = {
  list: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    apiClient.get<any, ApiResponse<any>>('/notifications', { params }),
  getUnreadCount: () =>
    apiClient.get<any, ApiResponse<{ count: number }>>('/notifications/unread-count'),
  markAsRead: (id: string) =>
    apiClient.patch<any, ApiResponse<any>>(`/notifications/${id}/read`),
  markAllAsRead: () =>
    apiClient.patch<any, ApiResponse<any>>('/notifications/read-all'),
  delete: (id: string) =>
    apiClient.delete<any, ApiResponse<any>>(`/notifications/${id}`),
};

// Settings API
export const settingsApi = {
  getEmailSettings: () => apiClient.get<any, ApiResponse<any>>('/settings/email'),
  updateEmailSettings: (data: any) => apiClient.put<any, ApiResponse<any>>('/settings/email', data),
  testSmtp: (data: any) => apiClient.post<any, ApiResponse<any>>('/settings/email/test', data),
  listRules: () => apiClient.get<any, ApiResponse<any[]>>('/settings/assignment-rules'),
  createRule: (data: any) => apiClient.post<any, ApiResponse<any>>('/settings/assignment-rules', data),
  updateRule: (id: string, data: any) => apiClient.put<any, ApiResponse<any>>(`/settings/assignment-rules/${id}`, data),
  deleteRule: (id: string) => apiClient.delete<any, ApiResponse<any>>(`/settings/assignment-rules/${id}`),
};

// Email Ingestion / Simulator API
export const emailApi = {
  simulateIncoming: (payload: any) =>
    apiClient.post<any, ApiResponse<any>>('/email/incoming', payload),
  retry: (id: string) =>
    apiClient.post<any, ApiResponse<any>>(`/email/retry/${id}`),
  testEmail: (to?: string) =>
    apiClient.post<any, ApiResponse<any>>('/test/email', { to }),
};
