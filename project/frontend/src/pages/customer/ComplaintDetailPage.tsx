import { ArrowLeft, Star } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CustomerShell } from '../../components/customer/CustomerShell'
import { Button } from '../../components/ui/Button'
import { PriorityBadge, StatusBadge } from '../../components/ui/Badge'
import { Textarea } from '../../components/ui/Input'
import { useToast } from '../../components/ui/Toast'
import { complaintsApi } from '../../services/complaints'
import type { ComplaintDetail, ComplaintStatusResponse, CustomerMessage } from '../../types/complaint'

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white transition-colors hover:border-zinc-300">
      <div className="border-b border-zinc-100 px-6 py-4">
        <h3 className="text-sm font-semibold text-[#0A0A0A]">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

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
      <CustomerShell title="Complaint">
        <p className="text-sm text-zinc-500">Loading…</p>
      </CustomerShell>
    )
  }

  const canRate = ['resolved', 'closed'].includes(complaint.status)

  return (
    <CustomerShell title={complaint.complaint_id}>
      <Link
        to="/customer/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-[#0A0A0A]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to My Complaints
      </Link>

      <div className="mb-8">
        <p className="font-mono text-xs text-zinc-400">{complaint.complaint_id}</p>
        <h2 className="mt-1 text-[22px] font-bold tracking-tight text-[#0A0A0A]">{complaint.title}</h2>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <Card title="Complaint">
              <div className="mb-3 flex items-center gap-2">
                <PriorityBadge priority={complaint.priority} />
                <StatusBadge status={complaint.status} />
              </div>
              <p className="whitespace-pre-wrap text-sm text-[#0A0A0A]">{complaint.description}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-zinc-500">
                <div>
                  <dt>Service</dt>
                  <dd className="text-[#0A0A0A]">{complaint.product_type}</dd>
                </div>
                {complaint.booking_reference && (
                  <div>
                    <dt>Booking reference</dt>
                    <dd className="font-mono text-[#0A0A0A]">{complaint.booking_reference}</dd>
                  </div>
                )}
                <div>
                  <dt>Submitted</dt>
                  <dd className="text-[#0A0A0A]">{new Date(complaint.created_at).toLocaleString()}</dd>
                </div>
              </dl>
            </Card>

            <Card title="Messages">
              <div className="space-y-3">
                {messages.length === 0 && <p className="text-sm text-zinc-400">No messages yet.</p>}
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender === 'customer' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-lg px-3.5 py-2.5 text-sm ${
                        m.sender === 'customer'
                          ? 'bg-[#0A0A0A] text-white'
                          : 'border border-zinc-200 bg-white text-[#0A0A0A]'
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
            </Card>

            {canRate && (
              <Card title="How did we do?">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => handleRate(n)}
                      aria-label={`Rate ${n} out of 5`}
                      className="text-zinc-300 transition-colors"
                    >
                      <Star
                        className="h-6 w-6"
                        fill={n <= (complaint.satisfaction_rating ?? rating) ? '#0A0A0A' : 'none'}
                        stroke={n <= (complaint.satisfaction_rating ?? rating) ? '#0A0A0A' : 'currentColor'}
                      />
                    </button>
                  ))}
                </div>
              </Card>
            )}
          </div>

          <div>
            <Card title="Timeline">
              <ol className="space-y-4">
                {statusInfo?.timeline.map((entry, i) => (
                  <li key={i} className="relative pl-5">
                    <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-[#0A0A0A]" />
                    <p className="text-sm font-medium capitalize text-[#0A0A0A]">{entry.action.replace('_', ' ')}</p>
                    <p className="text-xs text-zinc-400">{new Date(entry.created_at).toLocaleString()}</p>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </div>
    </CustomerShell>
  )
}
