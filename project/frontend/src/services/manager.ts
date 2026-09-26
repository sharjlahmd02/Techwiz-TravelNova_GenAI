import { api } from './api'
import type { StaffComplaintDetail, PaginatedStaffComplaints } from '../types/staff'
import type { ManagerAnalytics, AdminUser } from '../types/admin'
import type { ComplaintStatus, Priority } from '../types/complaint'

export interface AgentCreate {
  email: string
  password: string
  full_name: string
  department_id: string
}

export interface AgentUpdate {
  full_name?: string
  department_id?: string
  is_active?: boolean
}

export const managerApi = {
  list: (params?: { status?: ComplaintStatus; priority?: Priority; department_id?: string; search?: string; page?: number; page_size?: number }) =>
    api.get<PaginatedStaffComplaints>('/api/manager/complaints', { params }),

  get: (id: string) => api.get<StaffComplaintDetail>(`/api/manager/complaints/${id}`),

  override: (id: string, field: string, value: string, reason: string) =>
    api.patch<StaffComplaintDetail>(`/api/manager/complaints/${id}/override`, { field, value, reason }),

  escalate: (id: string, reason: string, level: number) =>
    api.post<StaffComplaintDetail>(`/api/manager/complaints/${id}/escalate`, { reason, level }),

  listAgents: () => api.get<AdminUser[]>('/api/manager/agents'),

  createAgent: (data: AgentCreate) => api.post<AdminUser>('/api/manager/agents', data),

  updateAgent: (id: string, data: AgentUpdate) => api.patch<AdminUser>(`/api/manager/agents/${id}`, data),

  deactivateAgent: (id: string) => api.delete(`/api/manager/agents/${id}`),

  analytics: () => api.get<ManagerAnalytics>('/api/manager/analytics'),
}
