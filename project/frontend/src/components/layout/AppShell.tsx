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
  Tags,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import type { UserRole } from '../../types/auth'
import { SignOutDialog } from '../ui/SignOutDialog'

interface NavItem {
  label: string
  to: string
  icon: LucideIcon
}

interface NavSection {
  label?: string
  items: NavItem[]
}

const NAV_BY_ROLE: Partial<Record<UserRole, NavSection[]>> = {
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

function initialsOf(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function AppShell({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (!user) return null
  const sections = NAV_BY_ROLE[user.role] ?? []

  const handleSignOut = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-[#FAFAFA]">
      <aside className="flex w-64 flex-shrink-0 flex-col border-r border-zinc-200 bg-white">
        <div className="flex h-16 items-center gap-2.5 px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0A0A0A] text-white">
            <MessageSquareCode className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <span className="text-[15px] font-bold tracking-tight text-[#0A0A0A]">SupportNova</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {sections.map((section, i) => (
            <div key={section.label ?? i}>
              {section.label && <p className="mb-1 mt-4 px-3 text-xs font-medium text-zinc-400">{section.label}</p>}
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `mb-1 flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors ${
                      isActive ? 'bg-[#0A0A0A] text-white' : 'text-zinc-600 hover:bg-zinc-100 hover:text-[#0A0A0A]'
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

        <div className="border-t border-zinc-100 p-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-700">
              {initialsOf(user.full_name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#0A0A0A]">{user.full_name}</p>
              <p className="truncate text-xs capitalize text-zinc-400">{user.role}</p>
            </div>
          </div>
          <button
            onClick={() => setConfirmOpen(true)}
            className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:text-[#0A0A0A]"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-8">
          <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A]">{title}</h1>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>

        <main className="relative flex-1 overflow-y-auto">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 opacity-[0.035] [-webkit-mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
            style={{ backgroundImage: 'radial-gradient(circle, #0A0A0A 1px, transparent 1px)', backgroundSize: '24px 24px' }}
          />
          <div className="relative z-10 mx-auto max-w-[1280px] px-8 py-8">{children}</div>
        </main>
      </div>

      {confirmOpen && <SignOutDialog onCancel={() => setConfirmOpen(false)} onConfirm={handleSignOut} />}
    </div>
  )
}
