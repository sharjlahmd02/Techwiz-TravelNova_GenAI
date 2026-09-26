import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { useAuthStore } from '../store/authStore'
import { api } from '../services/api'
import { ROLE_HOME, type TokenResponse } from '../types/auth'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.setSession)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginForm) => {
    setServerError(null)
    try {
      const response = await api.post<TokenResponse>('/api/auth/login', data)
      setSession(response.data)
      navigate(ROLE_HOME[response.data.user.role])
    } catch {
      setServerError('Incorrect email or password.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[--bg] px-4">
      <div className="w-full max-w-[400px] rounded-lg border border-[--border] bg-[--surface] p-10 shadow-md">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-[--text-primary]">SupportNova</h1>
          <p className="mt-1 text-sm text-[--text-secondary]">
            Complaint management for TravelNova
          </p>
        </div>

        <h2 className="mt-8 text-xl font-semibold text-[--text-primary]">Sign in</h2>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[--text-primary]">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="h-9 w-full rounded-md border border-[--border] bg-[--surface] px-3 text-sm text-[--text-primary] focus:border-[--accent] focus:outline-none focus:ring-[3px] focus:ring-[--accent]/20"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              {...register('email')}
            />
            {errors.email && (
              <p id="email-error" role="alert" className="mt-1 text-xs text-[--p0-text]">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[--text-primary]">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="h-9 w-full rounded-md border border-[--border] bg-[--surface] px-3 text-sm text-[--text-primary] focus:border-[--accent] focus:outline-none focus:ring-[3px] focus:ring-[--accent]/20"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
              {...register('password')}
            />
            {errors.password && (
              <p id="password-error" role="alert" className="mt-1 text-xs text-[--p0-text]">
                {errors.password.message}
              </p>
            )}
          </div>

          {serverError && (
            <p role="alert" className="text-xs text-[--p0-text]">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 h-9 w-full rounded-md bg-[--accent] text-sm font-medium text-white transition-colors hover:bg-[--accent-hover] disabled:opacity-40"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[--text-secondary]">
          New customer?{' '}
          <Link to="/register" className="text-[--accent] hover:text-[--accent-hover]">
            Create an account →
          </Link>
        </p>
      </div>
    </div>
  )
}
