import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, MessageSquareCode } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { Button } from '../components/ui/Button'
import { FieldError, Input, Label, PasswordInput } from '../components/ui/Input'
import { useAuthStore } from '../store/authStore'
import { api } from '../services/api'
import type { TokenResponse, User } from '../types/auth'

const registerSchema = z
  .object({
    full_name: z.string().min(1, 'Full name is required').max(255),
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
    confirm_password: z.string().min(1, 'Confirm your password'),
    terms: z.boolean().refine((v) => v, { message: 'You must agree to continue' }),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
  })

type RegisterForm = z.infer<typeof registerSchema>

function passwordStrength(password: string): { score: 0 | 1 | 2 | 3; label: string; color: string } {
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-[--status-red] text-[--status-red]' }
  if (score === 2) return { score: 2, label: 'Fair', color: 'bg-[--status-yellow] text-[--status-yellow]' }
  return { score: 3, label: 'Strong', color: 'bg-[--status-green] text-[--status-green]' }
}

export function RegisterPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.setSession)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema), defaultValues: { terms: false } })

  const passwordValue = watch('password') ?? ''
  const strength = useMemo(() => (passwordValue ? passwordStrength(passwordValue) : null), [passwordValue])

  const onSubmit = async (data: RegisterForm) => {
    setServerError(null)
    try {
      await api.post<User>('/api/auth/register', {
        full_name: data.full_name,
        email: data.email,
        password: data.password,
      })
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
    <div className="flex min-h-screen items-center justify-center bg-[--bg] px-4 py-10">
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

        <h1 className="mt-8 text-2xl text-[--text-primary]">Create your account</h1>

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
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              type="text"
              autoComplete="name"
              error={!!errors.full_name}
              aria-invalid={!!errors.full_name}
              aria-describedby={errors.full_name ? 'full_name-error' : undefined}
              {...register('full_name')}
            />
            {errors.full_name && <FieldError message={errors.full_name.message} />}
          </div>

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
              autoComplete="new-password"
              error={!!errors.password}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
              {...register('password')}
            />
            {errors.password && <FieldError message={errors.password.message} />}
            {!errors.password && strength && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex flex-1 gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full ${i < strength.score ? strength.color.split(' ')[0] : 'bg-[--zinc-200]'}`}
                    />
                  ))}
                </div>
                <span className={`text-xs font-medium ${strength.color.split(' ')[1]}`}>{strength.label}</span>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="confirm_password">Confirm password</Label>
            <PasswordInput
              id="confirm_password"
              autoComplete="new-password"
              error={!!errors.confirm_password}
              aria-invalid={!!errors.confirm_password}
              aria-describedby={errors.confirm_password ? 'confirm_password-error' : undefined}
              {...register('confirm_password')}
            />
            {errors.confirm_password && <FieldError message={errors.confirm_password.message} />}
          </div>

          <div>
            <label className="flex items-start gap-2 text-sm text-[--text-secondary]">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-[--border] text-black focus:ring-black/[0.08]"
                {...register('terms')}
              />
              I agree to the <a className="text-link hover:text-link-hover">Terms of Service</a> and{' '}
              <a className="text-link hover:text-link-hover">Privacy Policy</a>
            </label>
            {errors.terms && <FieldError message={errors.terms.message} />}
          </div>

          <Button type="submit" loading={isSubmitting} className="mt-2 w-full">
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[--text-secondary]">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-link hover:text-link-hover">
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  )
}
