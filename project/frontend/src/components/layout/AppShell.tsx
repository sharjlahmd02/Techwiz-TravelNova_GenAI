import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import type { UserRole } from '../../types/auth'

interface NavItem {
  label: string
  to: string
}

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  customer: [
    { label: 'My Complaints', to: '/customer/dashboard' },
    { label: 'Submit Complaint', to: '/customer/complaints/new' },
  ],
  agent: [{ label: 'My Queue', to: '/agent/dashboard' }],
  reviewer: [{ label: 'Conflicts', to: '/reviewer/dashboard' }],
  manager: [
    { label: 'Dashboard', to: '/manager/dashboard' },
    { label: 'Agents', to: '/manager/agents' },
  ],
  admin: [
    { label: 'Dashboard', to: '/admin/dashboard' },
    { label: 'Knowledge Base', to: '/admin/knowledge-base' },
    { label: 'Resolution Rules', to: '/admin/rules' },
    { label: 'Escalation Rules', to: '/admin/escalation-rules' },
    { label: 'Categories', to: '/admin/categories' },
    { label: 'Departments', to: '/admin/departments' },
    { label: 'Users', to: '/admin/users' },
    { label: 'Audit Log', to: '/admin/audit-log' },
  ],
}

export function AppShell({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) return null
  const navItems = NAV_BY_ROLE[user.role]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-[--bg]">
      <aside className="flex w-[240px] flex-shrink-0 flex-col border-r border-[--zinc-800] bg-[--zinc-900]">
        <div className="flex h-14 items-center gap-2 px-5">
          <span className="text-lg font-semibold text-[--zinc-50]">SupportNova</span>
        </div>
        <nav className="flex-1 px-2 py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `mx-1 my-0.5 flex h-9 items-center rounded-md px-3 text-sm font-medium transition-colors ${
                  isActive ? 'bg-[--zinc-800] text-[--zinc-50]' : 'text-[--zinc-400] hover:bg-[#1C1C1F] hover:text-[--zinc-300]'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-[--zinc-800] p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
              {user.full_name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[--zinc-50]">{user.full_name}</p>
              <p className="text-xs capitalize text-[--zinc-400]">{user.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 h-8 w-full rounded-md border border-[--zinc-700] text-xs font-medium text-[--zinc-300] hover:bg-[--zinc-800]"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-[--border] bg-[--surface] px-6">
          <h1 className="text-lg font-medium text-[--text-primary]">{title}</h1>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-[1280px]">{children}</div>
        </main>
      </div>
    </div>
  )
}
