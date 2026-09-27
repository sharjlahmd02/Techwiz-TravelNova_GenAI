import { api } from './api'
import type {
  ComplaintCreate,
  ComplaintCreateResponse,
  ComplaintDetail,
  ComplaintFieldsDraft,
  ComplaintStatusResponse,
  CustomerMessage,
  DocumentExtractResponse,
  PaginatedComplaints,
} from '../types/complaint'

export const complaintsApi = {
  create: (data: ComplaintCreate) => api.post<ComplaintCreateResponse>('/api/complaints/', data),

  extractFromChat: (rawText: string) =>
    api.post<ComplaintFieldsDraft>('/api/complaints/extract-chat', { raw_text: rawText }),

  extractFromEmail: (data: { from_email: string; subject: string; body: string }) =>
    api.post<ComplaintFieldsDraft>('/api/complaints/extract-email', data),

  extractFromDocument: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<DocumentExtractResponse>('/api/complaints/extract-document', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  list: (page = 1, pageSize = 20) =>
    api.get<PaginatedComplaints>('/api/complaints/', { params: { page, page_size: pageSize } }),

  get: (id: string) => api.get<ComplaintDetail>(`/api/complaints/${id}`),

  status: (id: string) => api.get<ComplaintStatusResponse>(`/api/complaints/${id}/status`),

  listMessages: (id: string) => api.get<CustomerMessage[]>(`/api/complaints/${id}/messages`),

  sendMessage: (id: string, message: string) =>
    api.post<CustomerMessage>(`/api/complaints/${id}/messages`, { message }),

  rate: (id: string, rating: number) => api.post<ComplaintDetail>(`/api/complaints/${id}/rate`, { rating }),
}
