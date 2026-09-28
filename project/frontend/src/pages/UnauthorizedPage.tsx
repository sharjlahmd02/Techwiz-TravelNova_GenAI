import { ShieldAlert } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'
import { ROLE_HOME } from '../types/auth'

function TextureBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 opacity-[0.035] [-webkit-mask-image:radial-gradient(ellipse_65%_55%_at_50%_35%,black,transparent)] [mask-image:radial-gradient(ellipse_65%_55%_at_50%_35%,black,transparent)]"
      style={{ backgroundImage: 'radial-gradient(circle, #0A0A0A 1px, transparent 1px)', backgroundSize: '24px 24px' }}
    />
  )
}

export function UnauthorizedPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const redirectTo = user ? ROLE_HOME[user.role] : '/login'
  const redirectLabel = user ? 'Back to Dashboard' : 'Go to Login'

  const handleSignOut = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#FAFAFA] px-4 py-10">
      <TextureBackground />

      <div className="relative z-10 flex w-full max-w-[440px] flex-col items-center text-center">
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-zinc-200 bg-zinc-100">
          <ShieldAlert className="h-8 w-8 text-[#0A0A0A]" strokeWidth={1.75} />
        </div>

        <h1 className="mt-6 text-2xl font-bold tracking-tight text-[#0A0A0A]">You don't have access to this page</h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-500">
          Your account role doesn't include permission to view this page. If you think this is a mistake, contact
          your workspace admin.
        </p>

        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link
            to={redirectTo}
            className="flex h-11 w-full items-center justify-center rounded-full bg-[#0A0A0A] px-6 text-sm font-semibold text-white transition-all duration-150 hover:bg-[#27272A] active:scale-[0.98] active:duration-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A0A0A] sm:w-auto"
          >
            {redirectLabel}
          </Link>
          <a
            href="mailto:support@travelnova.com"
            className="flex h-11 w-full items-center justify-center rounded-full border border-zinc-200 px-6 text-sm font-semibold text-[#0A0A0A] transition-colors hover:border-zinc-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A0A0A] sm:w-auto"
          >
            Contact Support
          </a>
        </div>

        {user && (
          <p className="mt-6 text-xs text-zinc-400">
            Signed in as {user.email} —{' '}
            <button type="button" onClick={handleSignOut} className="text-[#2563EB] hover:underline">
              Sign out
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
