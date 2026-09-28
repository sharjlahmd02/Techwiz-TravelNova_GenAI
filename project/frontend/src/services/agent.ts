import { api } from './api'
import type { StaffComplaintDetail, PaginatedStaffComplaints, AgentMetrics } from '../types/staff'
import type { ComplaintStatus, Priority, CustomerMessage } from '../types/complaint'

export const agentApi = {
  list: (params?: {
    status?: ComplaintStatus
    priority?: Priority
    search?: string
    category?: string
    sentiment?: string
    escalation_status?: 'escalated' | 'not_escalated'
    page?: number
    page_size?: number
  }) =>
    api.get<PaginatedStaffComplaints>('/api/agent/complaints', { params }),

  get: (id: string) => api.get<StaffComplaintDetail>(`/api/agent/complaints/${id}`),

  updateStatus: (id: string, status: ComplaintStatus) =>
    api.patch<StaffComplaintDetail>(`/api/agent/complaints/${id}/status`, { status }),

  addNote: (id: string, note: string) => api.post(`/api/agent/complaints/${id}/notes`, { note }),

  requestInfo: (id: string, message: string) =>
    api.post<CustomerMessage>(`/api/agent/complaints/${id}/request-info`, { message }),

  metrics: () => api.get<AgentMetrics>('/api/agent/metrics'),
}
