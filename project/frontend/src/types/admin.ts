import type { UserRole } from './auth'

export type EmailIntakeOutcome =
  | 'complaint_created'
  | 'attached_to_existing'
  | 'unclassified'
  | 'manual_review_unverified_sender'
  | 'manual_review_unregistered_sender'

export interface EmailIntakeLog {
  id: string
  from_address: string
  subject: string
  outcome: EmailIntakeOutcome
  reason: string | null
  complaint_id: string | null
  received_at: string | null
  processed_at: string
}

export interface ResolutionRule {
  id: string
  rule_id: string
  category: string
  subcategory: string
  conditions: unknown
  department: string
  supporting_department: string | null
  urgency: string
  priority: string
  policy_id: string | null
  escalation_required: boolean
  escalation_level: number
  required_actions: string[] | null
  prohibited_actions: string[] | null
  follow_up: boolean
  follow_up_days: number | null
  compensation_eligible: boolean
  refund_eligible: boolean
}

export interface EscalationRule {
  id: string
  rule_id: string
  trigger_condition: string
  level: number | null
  relative_level: string | null
  level_name: string | null
  priority_override: string | null
  response_time: string
  is_mandatory: boolean
}

export interface Category {
  id: string
  code: string
  name: string
  description: string | null
  is_active: boolean
}

export interface Department {
  id: string
  code: string
  name: string
  description: string | null
  is_active: boolean
}

export type KnowledgeBaseStatus = 'active' | 'previous' | 'superseded' | 'draft'

export interface KnowledgeBaseDoc {
  id: string
  document_id: string
  title: string
  category: string | null
  file_path: string
  version: string
  effective_date: string | null
  expiry_date: string | null
  is_active: boolean
  status: KnowledgeBaseStatus
}

export interface AdminUser {
  id: string
  email: string
  full_name: string
  role: UserRole
  department_id: string | null
  is_active: boolean
  loyalty_tier: string | null
  created_at: string
}

export interface AuditLogEntry {
  id: string
  complaint_id: string
  action: string
  performed_by: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  notes: string | null
  created_at: string
}

export interface PaginatedAuditLog {
  items: AuditLogEntry[]
  total: number
  page: number
  page_size: number
  has_next: boolean
}

export interface WeekOverWeek {
  this_week: number
  last_week: number
  delta: number
}

export interface CategoryTrendPoint {
  category: string
  this_week: number
  last_week: number
  delta: number
}

export interface AdminAnalytics {
  total_complaints: number
  resolved_today: number
  pipeline_conflicts: number
  pipeline_agreement_rate: number | null
  data_assets: Record<string, number>
  category_distribution: Record<string, number>
  priority_distribution: Record<string, number>
  department_distribution: Record<string, number>
  avg_resolution_hours: number | null
  category_trend: CategoryTrendPoint[]
  escalation_trend: WeekOverWeek
  volume_trend: WeekOverWeek
}

export interface DepartmentMetrics {
  department_id: string
  department_name: string
  open_complaints: number
  resolved_complaints: number
  avg_resolution_hours: number | null
  sla_compliance_rate: number | null
}

export interface ManagerAnalytics {
  total_open: number
  by_priority: Record<string, number>
  sla_compliance_rate: number | null
  conflict_rate: number | null
  departments: DepartmentMetrics[]
}
