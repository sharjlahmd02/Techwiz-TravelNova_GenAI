import { AlertCircle, Check, Eye, EyeOff, X } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuthStore } from '../store/authStore'
import { api } from '../services/api'
import { ROLE_HOME, type TokenResponse } from '../types/auth'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface FieldErrors {
  email?: string
  password?: string
}

function TextureBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 opacity-[0.035] [-webkit-mask-image:radial-gradient(ellipse_65%_55%_at_50%_35%,black,transparent)] [mask-image:radial-gradient(ellipse_65%_55%_at_50%_35%,black,transparent)]"
      style={{ backgroundImage: 'radial-gradient(circle, #0A0A0A 1px, transparent 1px)', backgroundSize: '24px 24px' }}
    />
  )
}

function LogoLockup() {
  return (
    <div className="flex items-center justify-center">
      <img src="/logo.png" alt="SupportNova" width={133} height={48} className="h-10 w-auto object-contain sm:h-12" />
    </div>
  )
}

function Checkbox({
  id,
  checked,
  onChange,
  invalid,
  label,
}: {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
  invalid?: boolean
  label: React.ReactNode
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer select-none items-center gap-2">
      <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className={`h-4 w-4 rounded-[4px] border transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#0A0A0A] ${
            checked ? 'border-[#0A0A0A] bg-[#0A0A0A]' : invalid ? 'border-[#DC2626] ring-2 ring-[#DC2626]/15' : 'border-zinc-300 bg-white'
          }`}
        />
        <Check
          className={`pointer-events-none absolute h-3 w-3 text-white transition-opacity ${checked ? 'opacity-100' : 'opacity-0'}`}
          strokeWidth={3}
        />
      </span>
      <span className="text-sm text-zinc-600">{label}</span>
    </label>
  )
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  autoComplete,
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  error?: string
  autoComplete?: string
  placeholder?: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[#0A0A0A]">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`h-11 w-full rounded-lg border bg-white px-3.5 pr-11 text-sm text-[#0A0A0A] placeholder:text-zinc-400 transition-all duration-150 focus:outline-none ${
            error
              ? 'border-[#DC2626] focus:shadow-[0_0_0_3px_rgba(220,38,38,0.10)]'
              : 'border-zinc-200 focus:border-[#0A0A0A] focus:shadow-[0_0_0_3px_rgba(10,10,10,0.08)]'
          }`}
        />
        <button
          type="button"
          tabIndex={0}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 transition-colors hover:text-zinc-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A0A0A]"
        >
          {visible ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 flex items-center gap-1 text-xs text-[#DC2626]">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.setSession)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const emailRef = useRef<HTMLInputElement>(null)

  const validateEmail = (value: string): string | undefined => {
    if (!value.trim()) return 'Email is required.'
    if (!EMAIL_RE.test(value)) return 'Enter a valid email address.'
    return undefined
  }

  const validatePassword = (value: string): string | undefined => {
    if (!value) return 'Password is required.'
    return undefined
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setServerError(null)

    const emailError = validateEmail(email)
    const passwordError = validatePassword(password)
    setErrors({ email: emailError, password: passwordError })

    if (emailError) {
      emailRef.current?.focus()
      return
    }
    if (passwordError) return

    setLoading(true)
    try {
      const response = await api.post<TokenResponse>('/api/auth/login', { email, password })
      setSession(response.data)
      navigate(ROLE_HOME[response.data.user.role])
    } catch {
      setServerError('Incorrect email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#FAFAFA] px-4 py-10">
      <TextureBackground />

      <div className="relative z-10 w-full max-w-[440px]">
        <div className="rounded-lg border border-zinc-200 bg-white p-7 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.08)] sm:p-10">
          <LogoLockup />

          <div className="mt-9 text-center">
            <h1 className="text-[26px] font-bold tracking-tight text-[#0A0A0A]">Welcome back</h1>
            <p className="mt-2 text-sm text-zinc-500">Sign in to manage your complaints</p>
          </div>

          {serverError && (
            <div role="alert" className="relative mt-6 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 pr-9 text-sm text-[#DC2626]">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {serverError}
              </div>
              <button
                type="button"
                onClick={() => setServerError(null)}
                aria-label="Dismiss"
                className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded text-[#DC2626]/60 hover:text-[#DC2626]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#0A0A0A]">
                Email
              </label>
              <input
                id="email"
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setErrors((prev) => ({ ...prev, email: validateEmail(email) }))}
                placeholder="you@example.com"
                autoComplete="email"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
                className={`h-11 w-full rounded-lg border bg-white px-3.5 text-sm text-[#0A0A0A] placeholder:text-zinc-400 transition-all duration-150 focus:outline-none ${
                  errors.email
                    ? 'border-[#DC2626] focus:shadow-[0_0_0_3px_rgba(220,38,38,0.10)]'
                    : 'border-zinc-200 focus:border-[#0A0A0A] focus:shadow-[0_0_0_3px_rgba(10,10,10,0.08)]'
                }`}
              />
              {errors.email && (
                <p id="email-error" role="alert" className="mt-1.5 flex items-center gap-1 text-xs text-[#DC2626]">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {errors.email}
                </p>
              )}
            </div>

            <PasswordField
              id="password"
              label="Password"
              value={password}
              onChange={setPassword}
              onBlur={() => setErrors((prev) => ({ ...prev, password: validatePassword(password) }))}
              error={errors.password}
              autoComplete="current-password"
              placeholder="••••••••"
            />

            <div className="flex items-center justify-between">
              <Checkbox id="remember-me" checked={rememberMe} onChange={setRememberMe} label="Remember me" />
              <a href="#" className="text-sm text-[#2563EB] hover:underline">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-11 w-full items-center justify-center rounded-full bg-[#0A0A0A] text-sm font-semibold text-white transition-all duration-150 hover:bg-[#27272A] active:scale-[0.98] active:duration-100 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A0A0A]"
            >
              {loading ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="my-6 flex items-center">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="mx-3 text-xs text-zinc-400">or</span>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>

          <p className="text-center text-sm text-zinc-500">
            New customer?{' '}
            <Link to="/register" className="font-medium text-[#2563EB] hover:underline">
              Create an account →
            </Link>
          </p>
        </div>

        <p className="mt-8 text-center text-xs text-zinc-400">
          © 2026 TravelNova. All rights reserved. &nbsp;·&nbsp;{' '}
          <a href="#" className="hover:text-zinc-600 hover:underline">
            Terms
          </a>{' '}
          ·{' '}
          <a href="#" className="hover:text-zinc-600 hover:underline">
            Privacy
          </a>
        </p>
      </div>
    </div>
  )
}
