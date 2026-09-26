import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ROLE_HOME } from '../types/auth'

export function UnauthorizedPage() {
  const { user } = useAuth()
  const homeLink = user ? ROLE_HOME[user.role] : '/login'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[--bg] px-4 text-center">
      <h1 className="text-2xl font-bold text-[--text-primary]">Unauthorized</h1>
      <p className="max-w-sm text-sm text-[--text-secondary]">
        You don't have permission to view this page.
      </p>
      <Link to={homeLink} className="mt-2 text-sm font-medium text-accent hover:text-accent-hover">
        Go to your dashboard →
      </Link>
    </div>
  )
}
