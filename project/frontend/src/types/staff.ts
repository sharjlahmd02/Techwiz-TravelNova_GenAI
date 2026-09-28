import type { ComplaintChannel, ComplaintStatus, Priority, Urgency } from './complaint'

export interface StaffComplaintSummary {
  id: string
  complaint_id: string
  title: string
  product_type: string
  status: ComplaintStatus
  priority: Priority | null
  urgency: Urgency | null
  department_id: string | null
  has_conflict: boolean
  review_reason: string | null
  is_duplicate: boolean
  sla_response_deadline: string | null
  sla_resolution_deadline: string | null
  next_follow_up_at: string | null
  created_at: string
}

export interface EntitiesExtracted {
  booking_reference?: string | null
  monetary_amounts?: number[]
  flight_numbers?: string[]
  names?: string[]
  dates?: string[]
  locations?: string[]
}

export type PolicyApplicabilityStatus = 'Applicable' | 'Conditionally Applicable' | 'Not Applicable' | 'Outdated'

export interface PolicyReference {
  document_id: string
  status: PolicyApplicabilityStatus
}

export interface PipelineResultSchema {
  id: string
  pipeline: 'genai' | 'ground_truth'
  summary: string | null
  category: string | null
  subcategory: string | null
  primary_issue: string | null
  secondary_issue: string | null
  sentiment: string | null
  sentiment_score: number | null
  urgency: string | null
  priority: string | null
  escalation_required: boolean
  escalation_level: number
  refund_eligible: boolean
  compensation_eligible: boolean
  required_actions: string[] | null
  prohibited_actions: string[] | null
  suggested_response: string | null
  confidence_score: number | null
  entities_extracted: EntitiesExtracted | null
  clarification_questions: string[] | null
  validation_issues: string[] | null
  policy_references: (string | PolicyReference)[] | null
  processing_time_ms: number | null
  provider: string | null
  model_name: string | null
  prompt_version: string | null
  policy_version: string | null
  created_at: string
}

export interface PipelineComparisonSchema {
  id: string
  has_conflict: boolean
  conflict_fields: string[] | null
  conflict_severity: 'none' | 'minor' | 'major' | 'critical' | 'genai_unavailable'
  genai_values: Record<string, unknown> | null
  ground_truth_values: Record<string, unknown> | null
  final_values: Record<string, unknown> | null
  verification_score: number | null
  reviewer_rationale: string | null
  resolved_at: string | null
}

export interface HistoryEntry {
  action: string
  performed_by: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  notes: string | null
  created_at: string
}

export interface StaffComplaintDetail {
  id: string
  complaint_id: string
  title: string
  description: string
  channel: ComplaintChannel
  product_type: string
  booking_reference: string | null
  customer_selected_category: string | null
  status: ComplaintStatus
  priority: Priority | null
  urgency: Urgency | null
  escalation_level: number
  escalation_reason: string | null
  is_duplicate: boolean
  duplicate_of: string | null
  is_prompt_injection: boolean
  has_conflict: boolean
  review_reason: string | null
  sla_response_deadline: string | null
  sla_resolution_deadline: string | null
  next_follow_up_at: string | null
  satisfaction_rating: number | null
  created_at: string
  closed_at: string | null
  customer_id: string
  department_id: string | null
  department_name: string | null
  supporting_department_id: string | null
  supporting_department_name: string | null
  assigned_agent_id: string | null
  pipeline_results: PipelineResultSchema[]
  comparison: PipelineComparisonSchema | null
  messages: { id: string; sender: string; message: string; created_at: string }[]
  history: HistoryEntry[]
}

export interface PaginatedStaffComplaints {
  items: StaffComplaintSummary[]
  total: number
  page: number
  page_size: number
  has_next: boolean
}

export interface AgentMetrics {
  resolved_count: number
  open_count: number
  avg_resolution_hours: number | null
  sla_compliance_rate: number | null
}

export const COMPARED_FIELDS = [
  'category', 'subcategory', 'priority', 'urgency',
  'department', 'escalation_required', 'escalation_level',
  'refund_eligible', 'compensation_eligible',
] as const
