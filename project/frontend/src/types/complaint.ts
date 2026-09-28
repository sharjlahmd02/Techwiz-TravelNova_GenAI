export type ComplaintChannel = 'web_form' | 'chat' | 'email' | 'document' | 'phone' | 'social_media' | 'mobile_app'

export type ComplaintStatus =
  | 'submitted'
  | 'validating'
  | 'processing'
  | 'under_review'
  | 'assigned'
  | 'in_progress'
  | 'awaiting_customer'
  | 'resolved'
  | 'closed'
  | 'reopened'
  | 'escalated'

export type Priority = 'P0' | 'P1' | 'P2' | 'P3'
export type Urgency = 'critical' | 'high' | 'medium' | 'low'
export type MessageSender = 'customer' | 'agent' | 'system'
export type PreferredContactChannel = 'email' | 'phone' | 'sms'

export interface ComplaintCreate {
  title: string
  description: string
  product_type: string
  booking_reference?: string | null
  customer_selected_category?: string | null
  previous_complaint_reference?: string | null
  preferred_contact_channel?: PreferredContactChannel | null
  channel?: ComplaintChannel
  source_payload?: Record<string, unknown> | null
}

export interface ComplaintFieldsDraft {
  title: string
  description: string
  product_type: string
  booking_reference: string | null
}

export interface DocumentExtractResponse extends ComplaintFieldsDraft {
  filename: string
  extracted_text_preview: string
}

export interface ComplaintCreateResponse {
  id: string
  complaint_id: string
  status: ComplaintStatus
  created_at: string
}

export interface ComplaintSummary {
  id: string
  complaint_id: string
  title: string
  product_type: string
  status: ComplaintStatus
  priority: Priority | null
  created_at: string
}

export interface ComplaintDetail {
  id: string
  complaint_id: string
  title: string
  description: string
  product_type: string
  booking_reference: string | null
  status: ComplaintStatus
  priority: Priority | null
  urgency: Urgency | null
  preferred_contact_channel: PreferredContactChannel | null
  sla_response_deadline: string | null
  sla_resolution_deadline: string | null
  satisfaction_rating: number | null
  created_at: string
  closed_at: string | null
}

export interface ComplaintTimelineEntry {
  action: string
  notes: string | null
  created_at: string
}

export interface ComplaintStatusResponse {
  complaint_id: string
  status: ComplaintStatus
  timeline: ComplaintTimelineEntry[]
}

export interface CustomerMessage {
  id: string
  sender: MessageSender
  message: string
  created_at: string
}

export interface PaginatedComplaints {
  items: ComplaintSummary[]
  total: number
  page: number
  page_size: number
  has_next: boolean
}

export const PRODUCT_TYPES = [
  'Flight', 'Hotel', 'Car Rental', 'Cruise', 'Tour', 'Package', 'Travel Insurance', 'Transfer', 'Other',
] as const
