import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const FIELD_BASE =
  'w-full rounded-md border border-[--border] bg-[--surface] px-3 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent/20 disabled:opacity-40'

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
      className={`h-9 ${FIELD_BASE} ${error ? 'border-p0-text ring-[3px] ring-red-100' : ''} ${className}`}
      {...props}
    />
  )
}

export function Textarea({
  className = '',
  error,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  return (
    <textarea
      className={`min-h-[120px] resize-y py-2.5 ${FIELD_BASE} ${error ? 'border-p0-text ring-[3px] ring-red-100' : ''} ${className}`}
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
    <select className={`h-9 ${FIELD_BASE} ${className}`} {...props}>
      {children}
    </select>
  )
}
