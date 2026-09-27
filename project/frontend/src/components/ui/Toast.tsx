import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type ToastVariant = 'success' | 'error' | 'info' | 'warning'
interface ToastItem {
  id: number
  message: string
  variant: ToastVariant
}

const ToastContext = createContext<{ show: (message: string, variant?: ToastVariant) => void } | null>(null)

const VARIANT_CONFIG: Record<ToastVariant, { classes: string; icon: typeof CheckCircle2 }> = {
  success: { classes: 'border-[--status-green] bg-[--status-green-bg] text-[--status-green]', icon: CheckCircle2 },
  error: { classes: 'border-[--status-red] bg-[--status-red-bg] text-[--status-red]', icon: XCircle },
  warning: { classes: 'border-[--status-yellow] bg-[--status-yellow-bg] text-[--status-yellow]', icon: AlertTriangle },
  info: { classes: 'border-[--zinc-300] bg-[--zinc-100] text-[--text-secondary]', icon: Info },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, variant }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), variant === 'error' ? 8000 : 5000)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
        {toasts.map((t) => {
          const cfg = VARIANT_CONFIG[t.variant]
          const Icon = cfg.icon
          return (
            <div
              key={t.id}
              className={`flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm shadow-dropdown ${cfg.classes}`}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="line-clamp-2 flex-1 text-[--text-primary]">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[--text-muted] hover:text-[--text-primary]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
