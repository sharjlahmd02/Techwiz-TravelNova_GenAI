import { FileText, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { complaintsApi } from '../../../services/complaints'
import type { ComplaintCreateResponse, ComplaintFieldsDraft } from '../../../types/complaint'
import { DraftReview, type DraftSubmitExtras } from './DraftReview'

const ACCEPTED = '.pdf,.docx'
const ACCEPTED_EXTENSIONS = ['.pdf', '.docx']

function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

export function DocumentFlow({ onSubmitted }: { onSubmitted: (result: ComplaintCreateResponse) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [extractedText, setExtractedText] = useState('')
  const [phase, setPhase] = useState<'upload' | 'extracting' | 'review'>('upload')
  const [draft, setDraft] = useState<ComplaintFieldsDraft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)

  const handleFile = async (selected: File) => {
    const extension = '.' + (selected.name.split('.').pop() ?? '').toLowerCase()
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      setError('Only PDF and DOCX files are supported for document upload.')
      return
    }
    setError(null)
    setFile(selected)
    setPhase('extracting')
    try {
      const { data } = await complaintsApi.extractFromDocument(selected)
      setExtractedText(data.extracted_text_preview)
      setDraft({
        title: data.title,
        description: data.description,
        product_type: data.product_type,
        booking_reference: data.booking_reference,
      })
      setPhase('review')
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Could not read this document. Please try a different file.'
      setError(message)
      setPhase('upload')
    }
  }

  const handleSubmit = async (extras: DraftSubmitExtras) => {
    if (!draft || !file) return
    setSubmitting(true)
    setError(null)
    try {
      const { data } = await complaintsApi.create({
        ...draft,
        ...extras,
        channel: 'document',
        source_payload: { type: 'document', filename: file.name, extracted_text: extractedText },
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
          setPhase('upload')
          setFile(null)
        }}
        onSubmit={handleSubmit}
        submitting={submitting}
        error={error}
        sourceLabel={`from ${file?.name ?? 'your document'}`}
      />
    )
  }

  const extracting = phase === 'extracting'

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-7 transition-colors hover:border-zinc-300 sm:p-9">
      <h2 className="mb-1 text-xl text-[#0A0A0A]">Upload a document</h2>
      <p className="mb-6 text-sm text-zinc-500">
        Upload a PDF or DOCX describing your complaint -- we'll read it and draft your complaint for you.
      </p>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={extracting}
        onDragEnter={(e) => {
          e.preventDefault()
          if (extracting) return
          dragCounter.current += 1
          setIsDragging(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          dragCounter.current -= 1
          if (dragCounter.current <= 0) {
            dragCounter.current = 0
            setIsDragging(false)
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          dragCounter.current = 0
          setIsDragging(false)
          if (extracting) return
          const dropped = e.dataTransfer.files?.[0]
          if (dropped) handleFile(dropped)
        }}
        aria-busy={extracting}
        className={`flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors disabled:cursor-not-allowed ${
          isDragging
            ? 'border-[#0A0A0A] bg-zinc-50'
            : extracting
              ? 'border-zinc-200 opacity-80'
              : 'border-zinc-200 hover:border-zinc-400'
        }`}
      >
        {extracting ? (
          <>
            <Spinner className="h-8 w-8 text-[#0A0A0A]" />
            <span className="text-sm font-medium text-zinc-700">Reading {file?.name}...</span>
            <span className="text-xs text-zinc-400">Extracting your complaint details, this only takes a moment</span>
          </>
        ) : isDragging ? (
          <>
            <Upload className="h-8 w-8 text-[#0A0A0A]" />
            <span className="text-sm font-medium text-[#0A0A0A]">Drop your file here</span>
          </>
        ) : (
          <>
            <FileText className="h-8 w-8 text-zinc-400" />
            <span className="text-sm font-medium text-[#0A0A0A]">
              Drag and drop a file, or <span className="underline">click to choose</span>
            </span>
            <span className="text-xs text-zinc-400">PDF or DOCX, up to 10MB</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => {
          const selected = e.target.files?.[0]
          if (selected) handleFile(selected)
          e.target.value = ''
        }}
      />

      {error && (
        <p role="alert" className="mt-4 text-sm text-p0-text">
          {error}
        </p>
      )}
    </div>
  )
}
