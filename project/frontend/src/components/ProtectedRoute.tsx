import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'
import type { UserRole } from '../types/auth'

interface ProtectedRouteProps {
  allowedRoles: UserRole[]
  children: ReactNode
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
