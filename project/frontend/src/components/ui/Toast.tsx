import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type ToastVariant = 'success' | 'error' | 'info'
interface ToastItem {
  id: number
  message: string
  variant: ToastVariant
}

const ToastContext = createContext<{ show: (message: string, variant?: ToastVariant) => void } | null>(null)

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: 'border-[--status-green] bg-[--status-green-bg] text-[--status-green]',
  error: 'border-[--status-red] bg-[--status-red-bg] text-[--status-red]',
  info: 'border-accent bg-accent-light text-accent',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const show = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, variant }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), variant === 'error' ? 8000 : 5000)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className={`rounded-md border px-3 py-2 text-sm shadow-md ${VARIANT_CLASSES[t.variant]}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
