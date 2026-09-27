import { Send } from 'lucide-react'
import { useState } from 'react'
import { complaintsApi } from '../../../services/complaints'
import type { ComplaintCreateResponse, ComplaintFieldsDraft } from '../../../types/complaint'
import { DraftReview } from './DraftReview'

interface ChatMessage {
  sender: 'bot' | 'user'
  text: string
}

const QUESTIONS = [
  "Hi! I'm here to help. Tell me what happened, in as much detail as you can.",
  'Thanks. Do you have a booking reference for this? (Just say "no" if not.)',
]

function Bubble({ message }: { message: ChatMessage }) {
  const isBot = message.sender === 'bot'
  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm ${
          isBot ? 'border border-zinc-200 bg-white text-[#0A0A0A]' : 'bg-[#0A0A0A] text-white'
        }`}
      >
        {message.text}
      </div>
    </div>
  )
}

export function ChatFlow({ onSubmitted }: { onSubmitted: (result: ComplaintCreateResponse) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([{ sender: 'bot', text: QUESTIONS[0] }])
  const [answers, setAnswers] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState<'chat' | 'extracting' | 'review'>('chat')
  const [draft, setDraft] = useState<ComplaintFieldsDraft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSend = async () => {
    const text = input.trim()
    if (!text) return

    const nextAnswers = [...answers, text]
    const nextMessages: ChatMessage[] = [...messages, { sender: 'user', text }]
    setInput('')

    if (nextAnswers.length < QUESTIONS.length) {
      nextMessages.push({ sender: 'bot', text: QUESTIONS[nextAnswers.length] })
      setMessages(nextMessages)
      setAnswers(nextAnswers)
      return
    }

    nextMessages.push({ sender: 'bot', text: 'Got it, let me put that together for you...' })
    setMessages(nextMessages)
    setAnswers(nextAnswers)
    setPhase('extracting')

    const bookingLine =
      nextAnswers[1] && !/^no\b/i.test(nextAnswers[1].trim()) ? `\nBooking reference: ${nextAnswers[1]}` : ''
    const rawText = `${nextAnswers[0]}${bookingLine}`

    try {
      const { data } = await complaintsApi.extractFromChat(rawText)
      setDraft(data)
      setPhase('review')
    } catch {
      setError('Something went wrong drafting your complaint. Please try again.')
      setPhase('chat')
    }
  }

  const handleSubmit = async () => {
    if (!draft) return
    setSubmitting(true)
    setError(null)
    try {
      const { data } = await complaintsApi.create({
        ...draft,
        channel: 'chat',
        source_payload: { type: 'chat_transcript', messages },
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
        onBack={() => {
          setPhase('chat')
          setMessages([{ sender: 'bot', text: QUESTIONS[0] }])
          setAnswers([])
        }}
        onSubmit={handleSubmit}
        submitting={submitting}
        error={error}
        sourceLabel="from your conversation"
      />
    )
  }

  return (
    <div className="flex flex-col rounded-lg border border-zinc-200 bg-white transition-colors hover:border-zinc-300">
      <div className="flex items-center gap-2 border-b border-zinc-100 px-5 py-3.5">
        <img src="/logo.png" alt="SupportNova" width={56} height={20} className="h-5 w-auto object-contain" />
        <span className="text-xs font-medium text-zinc-400">Assistant</span>
      </div>

      <div className="flex min-h-[280px] flex-col gap-3 px-5 py-5">
        {messages.map((m, i) => (
          <Bubble key={i} message={m} />
        ))}
        {phase === 'extracting' && <Bubble message={{ sender: 'bot', text: '...' }} />}
      </div>

      {error && (
        <p role="alert" className="px-5 pb-2 text-sm text-p0-text">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 border-t border-zinc-100 p-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSend()
            }
          }}
          disabled={phase === 'extracting'}
          placeholder="Type your answer..."
          className="h-10 flex-1 rounded-lg border border-zinc-200 bg-white px-3.5 text-sm text-[#0A0A0A] placeholder:text-zinc-400 transition-all duration-150 focus:border-[#0A0A0A] focus:outline-none focus:shadow-[0_0_0_3px_rgba(10,10,10,0.08)] disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || phase === 'extracting'}
          aria-label="Send"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0A0A0A] text-white transition-colors hover:bg-[#27272A] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
