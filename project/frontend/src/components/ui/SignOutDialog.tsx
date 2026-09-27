import { LogOut } from 'lucide-react'

export function SignOutDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0A]/50 p-4">
      <div className="w-full max-w-[400px] rounded-lg border border-zinc-200 bg-white p-6 shadow-modal">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
          <LogOut className="h-4 w-4 text-[#0A0A0A]" />
        </div>
        <h2 className="mt-4 text-center text-lg font-bold text-[#0A0A0A]">Sign out?</h2>
        <p className="mt-2 text-center text-sm text-zinc-500">You'll need to sign in again to access your account.</p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex h-10 flex-1 items-center justify-center rounded-full text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex h-10 flex-1 items-center justify-center rounded-full bg-[#0A0A0A] text-sm font-semibold text-white transition-colors hover:bg-[#27272A]"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
