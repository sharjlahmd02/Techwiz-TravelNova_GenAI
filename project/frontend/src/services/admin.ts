import { api } from './api'
import type {
  ResolutionRule, EscalationRule, Category, Department, KnowledgeBaseDoc, AdminUser,
  PaginatedAuditLog, AdminAnalytics,
} from '../types/admin'
import type { UserRole } from '../types/auth'

export const adminApi = {
  // Resolution rules
  listRules: () => api.get<ResolutionRule[]>('/api/admin/rules'),
  createRule: (data: Partial<ResolutionRule>) => api.post<ResolutionRule>('/api/admin/rules', data),
  updateRule: (id: string, data: Partial<ResolutionRule>) => api.patch<ResolutionRule>(`/api/admin/rules/${id}`, data),
  deleteRule: (id: string) => api.delete(`/api/admin/rules/${id}`),

  // Escalation rules
  listEscalationRules: () => api.get<EscalationRule[]>('/api/admin/escalation-rules'),
  createEscalationRule: (data: Partial<EscalationRule>) => api.post<EscalationRule>('/api/admin/escalation-rules', data),
  updateEscalationRule: (id: string, data: Partial<EscalationRule>) =>
    api.patch<EscalationRule>(`/api/admin/escalation-rules/${id}`, data),
  deleteEscalationRule: (id: string) => api.delete(`/api/admin/escalation-rules/${id}`),

  // Categories
  listCategories: () => api.get<Category[]>('/api/admin/categories'),
  createCategory: (data: { code: string; name: string; description?: string }) =>
    api.post<Category>('/api/admin/categories', data),
  updateCategory: (id: string, data: Partial<Category>) => api.patch<Category>(`/api/admin/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/api/admin/categories/${id}`),

  // Departments
  listDepartments: () => api.get<Department[]>('/api/admin/departments'),
  createDepartment: (data: { code: string; name: string; description?: string }) =>
    api.post<Department>('/api/admin/departments', data),
  updateDepartment: (id: string, data: Partial<Department>) => api.patch<Department>(`/api/admin/departments/${id}`, data),

  // Knowledge base
  listKnowledgeBase: () => api.get<KnowledgeBaseDoc[]>('/api/admin/knowledge-base'),
  uploadPolicy: (documentId: string, title: string, file: File) => {
    const form = new FormData()
    form.append('document_id', documentId)
    form.append('title', title)
    form.append('file', file)
    return api.post<KnowledgeBaseDoc>('/api/admin/knowledge-base', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  updateKnowledgeBaseDoc: (id: string, data: Partial<KnowledgeBaseDoc>) =>
    api.patch<KnowledgeBaseDoc>(`/api/admin/knowledge-base/${id}`, data),
  deactivateKnowledgeBaseDoc: (id: string) => api.delete(`/api/admin/knowledge-base/${id}`),

  // Users
  listUsers: (role?: UserRole) => api.get<AdminUser[]>('/api/admin/users', { params: role ? { role } : {} }),
  createUser: (data: { email: string; password: string; full_name: string; role: UserRole; department_id?: string }) =>
    api.post<AdminUser>('/api/admin/users', data),
  updateUser: (id: string, data: Partial<AdminUser>) => api.patch<AdminUser>(`/api/admin/users/${id}`, data),

  // Audit log
  auditLog: (params?: { page?: number; page_size?: number; complaint_id?: string; performed_by?: string }) =>
    api.get<PaginatedAuditLog>('/api/admin/audit-log', { params }),

  // Analytics
  analytics: () => api.get<AdminAnalytics>('/api/admin/analytics'),

  // Export
  exportUrl: (format: 'csv' | 'json' | 'pdf') => `/api/admin/export?format=${format}`,

  // Import
  importComplaints: (complaints: Record<string, unknown>[]) =>
    api.post('/api/admin/import-complaints', { complaints }),
}
