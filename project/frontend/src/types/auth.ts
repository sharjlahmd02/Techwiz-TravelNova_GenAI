export type UserRole = 'customer' | 'agent' | 'reviewer' | 'manager' | 'admin'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  department_id: string | null
  is_active: boolean
  loyalty_tier: 'silver' | 'gold' | 'platinum' | null
  created_at: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: User
}

export const ROLE_HOME: Record<UserRole, string> = {
  customer: '/customer/dashboard',
  agent: '/agent/dashboard',
  reviewer: '/reviewer/dashboard',
  manager: '/manager/dashboard',
  admin: '/admin/dashboard',
}
