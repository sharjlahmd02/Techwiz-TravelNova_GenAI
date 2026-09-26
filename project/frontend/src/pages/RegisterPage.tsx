import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { useAuthStore } from '../store/authStore'
import { api } from '../services/api'
import type { TokenResponse, User } from '../types/auth'

const registerSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(255),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
})

type RegisterForm = z.infer<typeof registerSchema>

export function RegisterPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.setSession)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })

  const onSubmit = async (data: RegisterForm) => {
    setServerError(null)
    try {
      await api.post<User>('/api/auth/register', data)
      const loginResponse = await api.post<TokenResponse>('/api/auth/login', {
        email: data.email,
        password: data.password,
      })
      setSession(loginResponse.data)
      navigate('/customer/dashboard')
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Registration failed. Please try again.'
      setServerError(message)
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

        <h2 className="mt-8 text-xl font-semibold text-[--text-primary]">Create an account</h2>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div>
            <label htmlFor="full_name" className="mb-1.5 block text-sm font-medium text-[--text-primary]">
              Full name
            </label>
            <input
              id="full_name"
              type="text"
              autoComplete="name"
              className="h-9 w-full rounded-md border border-[--border] bg-[--surface] px-3 text-sm text-[--text-primary] focus:border-[--accent] focus:outline-none focus:ring-[3px] focus:ring-[--accent]/20"
              aria-invalid={!!errors.full_name}
              aria-describedby={errors.full_name ? 'full_name-error' : undefined}
              {...register('full_name')}
            />
            {errors.full_name && (
              <p id="full_name-error" role="alert" className="mt-1 text-xs text-[--p0-text]">
                {errors.full_name.message}
              </p>
            )}
          </div>

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
              autoComplete="new-password"
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
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[--text-secondary]">
          Already have an account?{' '}
          <Link to="/login" className="text-[--accent] hover:text-[--accent-hover]">
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  )
}
