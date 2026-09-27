import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
  children: ReactNode
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'rounded-full bg-black text-white hover:bg-[--zinc-800]',
  secondary: 'rounded-full bg-transparent border border-[--border] text-[--text-primary] hover:border-[--border-strong]',
  ghost: 'rounded-md bg-transparent text-[--text-secondary] hover:bg-[--zinc-100] hover:text-[--text-primary]',
  destructive: 'rounded-full bg-p0-bg text-p0-text border border-p0-border hover:bg-red-100',
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

export function Button({ variant = 'primary', loading, disabled, children, className = '', ...props }: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex h-10 items-center justify-center gap-2 px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {loading ? <Spinner /> : children}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string
  children: ReactNode
}

export function IconButton({ children, className = '', disabled, ...props }: IconButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`flex h-7 w-7 items-center justify-center rounded-md text-[--text-secondary] transition-colors hover:bg-[--zinc-100] hover:text-[--text-primary] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
