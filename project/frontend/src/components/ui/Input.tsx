import { Eye, EyeOff, ChevronDown } from 'lucide-react'
import { useState, forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

const FIELD_BASE =
  'w-full rounded-md border border-[--border] bg-[--surface] px-3.5 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:border-black focus:outline-none focus:ring-[3px] focus:ring-black/[0.08] disabled:opacity-40'

export function Label({ children, htmlFor, optional }: { children: ReactNode; htmlFor?: string; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-[--text-primary]">
      {children}
      {optional && <span className="ml-1 text-xs font-normal text-[--text-muted]">(optional)</span>}
    </label>
  )
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="mt-1 text-xs text-p0-text">
      {message}
    </p>
  )
}

export function Input({ className = '', error, ...props }: InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      className={`h-10 ${FIELD_BASE} ${error ? 'border-p0-text ring-[3px] ring-red-100' : ''} ${className}`}
      {...props}
    />
  )
}

export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { error?: boolean }>(
  function PasswordInput({ className = '', error, ...props }, ref) {
    const [visible, setVisible] = useState(false)
    return (
      <div className="relative">
        <input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={`h-10 pr-10 ${FIELD_BASE} ${error ? 'border-p0-text ring-[3px] ring-red-100' : ''} ${className}`}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[--text-muted] hover:text-[--text-secondary]"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    )
  },
)

export function Textarea({
  className = '',
  error,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  return (
    <textarea
      className={`min-h-[120px] resize-y py-3 ${FIELD_BASE} ${error ? 'border-p0-text ring-[3px] ring-red-100' : ''} ${className}`}
      {...props}
    />
  )
}

export function Select({
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <div className="relative">
      <select
        className={`h-10 appearance-none bg-none pr-9 ${FIELD_BASE} ${className}`}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[--text-muted]" />
    </div>
  )
}
