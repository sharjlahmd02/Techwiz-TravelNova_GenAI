import { ArrowLeft, Check } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CustomerShell } from '../../components/customer/CustomerShell'
import { Button } from '../../components/ui/Button'
import { ChannelPicker } from './submit/ChannelPicker'
import { ChatFlow } from './submit/ChatFlow'
import { DocumentFlow } from './submit/DocumentFlow'
import { EmailFlow } from './submit/EmailFlow'
import { WebFormFlow } from './submit/WebFormFlow'
import type { ComplaintChannel, ComplaintCreateResponse } from '../../types/complaint'

export function SubmitComplaintPage() {
  const navigate = useNavigate()
  const [channel, setChannel] = useState<ComplaintChannel | null>(null)
  const [result, setResult] = useState<ComplaintCreateResponse | null>(null)

  if (result) {
    return (
      <CustomerShell title="Submit Complaint">
        <div className="mx-auto max-w-[640px]">
          <div className="rounded-lg border border-zinc-200 bg-white p-9 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[--status-green-bg] text-[--status-green]">
              <Check className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <h2 className="text-xl text-[#0A0A0A]">Your complaint has been submitted</h2>
            <p className="mt-3 font-mono text-lg text-[#0A0A0A]">{result.complaint_id}</p>
            <p className="mt-2 text-sm text-zinc-500">We're reviewing it now and will follow up shortly with next steps.</p>
            <Button className="mt-6" onClick={() => navigate('/customer/dashboard')}>
              Track your complaint →
            </Button>
          </div>
        </div>
      </CustomerShell>
    )
  }

  return (
    <CustomerShell title="Submit Complaint">
      <div className="mx-auto max-w-[640px]">
        <Link
          to="/customer/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-[#0A0A0A]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to My Complaints
        </Link>

        {channel && (
          <button
            onClick={() => setChannel(null)}
            className="mb-4 text-sm text-link hover:text-link-hover"
          >
            ← Choose a different way to submit
          </button>
        )}

        {!channel && <ChannelPicker onSelect={setChannel} />}
        {channel === 'web_form' && <WebFormFlow onSubmitted={setResult} />}
        {channel === 'chat' && <ChatFlow onSubmitted={setResult} />}
        {channel === 'email' && <EmailFlow onSubmitted={setResult} />}
        {channel === 'document' && <DocumentFlow onSubmitted={setResult} />}
      </div>
    </CustomerShell>
  )
}
