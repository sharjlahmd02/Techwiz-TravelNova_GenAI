import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, MessageSquareCode } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { Button } from '../components/ui/Button'
import { FieldError, Input, Label, PasswordInput } from '../components/ui/Input'
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
      <div className="w-full max-w-[420px] rounded-lg border border-[--border] bg-[--surface] p-10 shadow-modal">
        <div className="text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white">
              <MessageSquareCode className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <span className="text-[15px] font-bold tracking-tight text-[--text-primary]">SupportNova</span>
          </div>
          <p className="text-sm text-[--text-muted]">Complaint management for TravelNova</p>
        </div>

        <h1 className="mt-8 text-2xl text-[--text-primary]">Welcome back</h1>

        {serverError && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-md border border-[--status-red] bg-[--status-red-bg] px-3 py-2.5 text-sm text-[--status-red]"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {serverError}
          </div>
        )}

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              error={!!errors.email}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              {...register('email')}
            />
            {errors.email && <FieldError message={errors.email.message} />}
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              error={!!errors.password}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
              {...register('password')}
            />
            {errors.password && <FieldError message={errors.password.message} />}
          </div>

          <Button type="submit" loading={isSubmitting} className="mt-2 w-full">
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[--text-secondary]">
          New customer?{' '}
          <Link to="/register" className="font-medium text-link hover:text-link-hover">
            Create an account →
          </Link>
        </p>
      </div>
    </div>
  )
}
