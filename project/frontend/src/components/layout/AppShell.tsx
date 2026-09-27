import {
  BookOpen,
  Building2,
  GitCompare,
  History,
  Inbox,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MessageSquareCode,
  PlusCircle,
  Tags,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import type { UserRole } from '../../types/auth'

interface NavItem {
  label: string
  to: string
  icon: LucideIcon
}

interface NavSection {
  label?: string
  items: NavItem[]
}

const NAV_BY_ROLE: Record<UserRole, NavSection[]> = {
  customer: [
    {
      items: [
        { label: 'My Complaints', to: '/customer/dashboard', icon: Inbox },
        { label: 'Submit Complaint', to: '/customer/complaints/new', icon: PlusCircle },
      ],
    },
  ],
  agent: [{ items: [{ label: 'My Queue', to: '/agent/dashboard', icon: Inbox }] }],
  reviewer: [{ items: [{ label: 'Conflicts', to: '/reviewer/dashboard', icon: GitCompare }] }],
  manager: [
    {
      items: [
        { label: 'Dashboard', to: '/manager/dashboard', icon: LayoutDashboard },
        { label: 'Agents', to: '/manager/agents', icon: Users },
      ],
    },
  ],
  admin: [
    { items: [{ label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard }] },
    {
      label: 'Content',
      items: [
        { label: 'Knowledge Base', to: '/admin/knowledge-base', icon: BookOpen },
        { label: 'Resolution Rules', to: '/admin/rules', icon: ListChecks },
        { label: 'Escalation Rules', to: '/admin/escalation-rules', icon: TrendingUp },
        { label: 'Categories', to: '/admin/categories', icon: Tags },
        { label: 'Departments', to: '/admin/departments', icon: Building2 },
      ],
    },
    {
      label: 'Access',
      items: [
        { label: 'Users', to: '/admin/users', icon: Users },
        { label: 'Audit Log', to: '/admin/audit-log', icon: History },
      ],
    },
  ],
}

export function AppShell({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) return null
  const sections = NAV_BY_ROLE[user.role]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-[--bg]">
      <aside className="flex w-[240px] flex-shrink-0 flex-col border-r border-[--zinc-800] bg-black">
        <div className="flex h-14 items-center gap-2 px-5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[--zinc-800] text-white">
            <MessageSquareCode className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="text-[15px] font-bold text-[--zinc-50]">SupportNova</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {sections.map((section, i) => (
            <div key={section.label ?? i}>
              {section.label && (
                <p className="mt-4 px-3 pb-1 text-xs text-[--zinc-600]">{section.label}</p>
              )}
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `mx-1 my-0.5 flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${
                      isActive ? 'bg-[--zinc-800] text-[--zinc-50]' : 'text-[--zinc-400] hover:bg-[#1C1C1F] hover:text-[--zinc-300]'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-[--zinc-800] p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[--zinc-800] text-xs font-semibold text-white">
              {user.full_name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[--zinc-50]">{user.full_name}</p>
              <p className="text-xs capitalize text-[--zinc-400]">{user.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 flex h-8 w-full items-center justify-center gap-1.5 rounded-md text-xs font-medium text-[--zinc-400] transition-colors hover:bg-[--zinc-800] hover:text-[--zinc-100]"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-[--border] bg-[--surface] px-6">
          <h1 className="text-2xl text-[--text-primary]">{title}</h1>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-[1280px]">{children}</div>
        </main>
      </div>
    </div>
  )
}
