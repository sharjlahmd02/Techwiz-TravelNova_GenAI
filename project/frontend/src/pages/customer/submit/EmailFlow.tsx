import { useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { Button } from '../../../components/ui/Button'
import { Input, Label, Textarea } from '../../../components/ui/Input'
import { complaintsApi } from '../../../services/complaints'
import type { ComplaintCreateResponse, ComplaintFieldsDraft } from '../../../types/complaint'
import { DraftReview } from './DraftReview'

export function EmailFlow({ onSubmitted }: { onSubmitted: (result: ComplaintCreateResponse) => void }) {
  const { user } = useAuth()
  const [fromEmail, setFromEmail] = useState(user?.email ?? '')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [phase, setPhase] = useState<'compose' | 'sending' | 'review'>('compose')
  const [draft, setDraft] = useState<ComplaintFieldsDraft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canSend = fromEmail.trim() && subject.trim() && body.trim().length >= 20

  const handleSend = async () => {
    setError(null)
    setPhase('sending')
    try {
      const { data } = await complaintsApi.extractFromEmail({ from_email: fromEmail, subject, body })
      setDraft(data)
      setPhase('review')
    } catch {
      setError('Something went wrong drafting your complaint. Please try again.')
      setPhase('compose')
    }
  }

  const handleSubmit = async () => {
    if (!draft) return
    setSubmitting(true)
    setError(null)
    try {
      const { data } = await complaintsApi.create({
        ...draft,
        channel: 'email',
        source_payload: { type: 'email', from_email: fromEmail, subject, body },
      })
      onSubmitted(data)
    } catch {
      setError('Something went wrong submitting your complaint. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (phase === 'review' && draft) {
    return (
      <DraftReview
        draft={draft}
        onChange={setDraft}
        onBack={() => setPhase('compose')}
        onSubmit={handleSubmit}
        submitting={submitting}
        error={error}
        sourceLabel="from your email"
      />
    )
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white transition-colors hover:border-zinc-300">
      <div className="border-b border-zinc-100 px-6 py-4">
        <p className="text-sm font-semibold text-[#0A0A0A]">New Message</p>
        <p className="mt-0.5 text-xs text-zinc-400">To: complaints@travelnova.com</p>
      </div>

      <div className="space-y-4 p-6">
        <div>
          <Label htmlFor="email-from">From</Label>
          <Input id="email-from" type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="email-subject">Subject</Label>
          <Input
            id="email-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Overcharged for my hotel stay"
          />
        </div>
        <div>
          <Label htmlFor="email-body">Message</Label>
          <Textarea
            id="email-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your complaint as you would in an email -- include dates, booking reference, and what happened."
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="px-6 pb-2 text-sm text-p0-text">
          {error}
        </p>
      )}

      <div className="border-t border-zinc-100 p-4">
        <Button className="w-full" onClick={handleSend} loading={phase === 'sending'} disabled={!canSend}>
          Send
        </Button>
      </div>
    </div>
  )
}
