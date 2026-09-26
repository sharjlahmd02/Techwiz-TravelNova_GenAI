import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { PriorityBadge, StatusBadge } from '../../components/ui/Badge'
import { Panel } from '../../components/ui/Card'
import { Textarea } from '../../components/ui/Input'
import { useToast } from '../../components/ui/Toast'
import { complaintsApi } from '../../services/complaints'
import type { ComplaintDetail, ComplaintStatusResponse, CustomerMessage } from '../../types/complaint'

export function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { show } = useToast()
  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null)
  const [statusInfo, setStatusInfo] = useState<ComplaintStatusResponse | null>(null)
  const [messages, setMessages] = useState<CustomerMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [rating, setRating] = useState(0)
  const [sending, setSending] = useState(false)

  const load = async () => {
    if (!id) return
    const [detailRes, statusRes, messagesRes] = await Promise.all([
      complaintsApi.get(id),
      complaintsApi.status(id),
      complaintsApi.listMessages(id),
    ])
    setComplaint(detailRes.data)
    setStatusInfo(statusRes.data)
    setMessages(messagesRes.data)
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 10_000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleSendMessage = async () => {
    if (!id || !newMessage.trim()) return
    setSending(true)
    try {
      const { data } = await complaintsApi.sendMessage(id, newMessage.trim())
      setMessages((prev) => [...prev, data])
      setNewMessage('')
      show('Message sent', 'success')
    } catch {
      show('Failed to send message', 'error')
    } finally {
      setSending(false)
    }
  }

  const handleRate = async (value: number) => {
    if (!id) return
    setRating(value)
    try {
      await complaintsApi.rate(id, value)
      show('Thanks for your feedback!', 'success')
    } catch {
      show('Failed to submit rating', 'error')
    }
  }

  if (!complaint) {
    return (
      <AppShell title="Complaint Detail">
        <p className="text-sm text-[--text-muted]">Loading…</p>
      </AppShell>
    )
  }

  const canRate = ['resolved', 'closed'].includes(complaint.status)

  return (
    <AppShell title={complaint.complaint_id}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Panel title="Complaint">
            <div className="mb-3 flex items-center gap-2">
              <PriorityBadge priority={complaint.priority} />
              <StatusBadge status={complaint.status} />
            </div>
            <h2 className="mb-2 text-lg font-medium text-[--text-primary]">{complaint.title}</h2>
            <p className="whitespace-pre-wrap text-sm text-[--text-primary]">{complaint.description}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-[--text-secondary]">
              <div>
                <dt>Service</dt>
                <dd className="text-[--text-primary]">{complaint.product_type}</dd>
              </div>
              {complaint.booking_reference && (
                <div>
                  <dt>Booking reference</dt>
                  <dd className="font-mono text-[--text-primary]">{complaint.booking_reference}</dd>
                </div>
              )}
              <div>
                <dt>Submitted</dt>
                <dd className="text-[--text-primary]">{new Date(complaint.created_at).toLocaleString()}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Messages">
            <div className="space-y-3">
              {messages.length === 0 && <p className="text-sm text-[--text-muted]">No messages yet.</p>}
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === 'customer' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-md px-3 py-2 text-sm ${
                      m.sender === 'customer' ? 'bg-accent-light text-[--text-primary]' : 'bg-[--zinc-100] text-[--text-primary]'
                    }`}
                  >
                    {m.message}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Textarea
                className="min-h-[40px]"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Send a message…"
              />
              <Button onClick={handleSendMessage} loading={sending} disabled={!newMessage.trim()}>
                Send
              </Button>
            </div>
          </Panel>

          {canRate && (
            <Panel title="How did we do?">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => handleRate(n)}
                    className={`text-2xl ${n <= (complaint.satisfaction_rating ?? rating) ? 'text-yellow-400' : 'text-[--zinc-300]'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </Panel>
          )}
        </div>

        <div>
          <Panel title="Timeline">
            <ol className="space-y-4">
              {statusInfo?.timeline.map((entry, i) => (
                <li key={i} className="relative pl-5">
                  <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-accent" />
                  <p className="text-sm font-medium capitalize text-[--text-primary]">{entry.action.replace('_', ' ')}</p>
                  <p className="text-xs text-[--text-muted]">{new Date(entry.created_at).toLocaleString()}</p>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </AppShell>
  )
}
