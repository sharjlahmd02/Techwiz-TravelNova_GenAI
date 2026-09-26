import { api } from './api'
import type { StaffComplaintDetail, PaginatedStaffComplaints, PipelineComparisonSchema } from '../types/staff'

export interface ConflictFieldDecision {
  field: string
  source: 'genai' | 'ground_truth' | 'custom'
  custom_value?: string | null
}

export interface ConflictResolution {
  decisions: ConflictFieldDecision[]
  rationale: string
}

export const reviewerApi = {
  listConflicts: (page = 1, pageSize = 20) =>
    api.get<PaginatedStaffComplaints>('/api/reviewer/conflicts', { params: { page, page_size: pageSize } }),

  getConflict: (id: string) => api.get<StaffComplaintDetail>(`/api/reviewer/conflicts/${id}`),

  resolve: (id: string, data: ConflictResolution) =>
    api.post<StaffComplaintDetail>(`/api/reviewer/conflicts/${id}/resolve`, data),

  history: (page = 1, pageSize = 20) =>
    api.get<PipelineComparisonSchema[]>('/api/reviewer/history', { params: { page, page_size: pageSize } }),
}
