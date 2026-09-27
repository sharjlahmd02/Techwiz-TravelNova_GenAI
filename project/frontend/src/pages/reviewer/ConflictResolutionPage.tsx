import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { SeverityBadge } from '../../components/ui/Badge'
import { Input, Label, Textarea } from '../../components/ui/Input'
import { useToast } from '../../components/ui/Toast'
import { EntitiesList, SentimentBadge } from '../../components/staff/PipelineIntelligence'
import { reviewerApi, type ConflictFieldDecision, type ResponseTone } from '../../services/reviewer'
import { COMPARED_FIELDS } from '../../types/staff'
import type { StaffComplaintDetail } from '../../types/staff'

const REVIEW_REASON_LABELS: Record<string, string> = {
  pipeline_conflict: 'The two pipelines disagreed on this complaint’s classification.',
  sensitive_complaint: 'Flagged as sensitive -- safety or legal keywords were detected in the complaint text.',
  ambiguous_classification: 'Flagged as ambiguous -- the ground-truth classifier had very low confidence.',
  missing_policy_support: 'Flagged for missing policy support -- neither pipeline found a matching policy.',
}

const FIELD_LABELS: Record<string, string> = {
  category: 'Category',
  subcategory: 'Subcategory',
  priority: 'Priority',
  urgency: 'Urgency',
  department: 'Department',
  escalation_required: 'Escalation Required',
  escalation_level: 'Escalation Level',
  refund_eligible: 'Refund Eligible',
  compensation_eligible: 'Compensation Eligible',
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return String(v)
}

export function ConflictResolutionPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { show } = useToast()
  const [complaint, setComplaint] = useState<StaffComplaintDetail | null>(null)
  const [decisions, setDecisions] = useState<Record<string, ConflictFieldDecision>>({})
  const [rationale, setRationale] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

  const [comment, setComment] = useState('')
  const [addingComment, setAddingComment] = useState(false)

  const [regenerating, setRegenerating] = useState(false)
  const [regeneratedResponse, setRegeneratedResponse] = useState<string | null>(null)
  const [tone, setTone] = useState<ResponseTone>('Professional')

  const load = () => {
    if (!id) return
    reviewerApi.getConflict(id).then(({ data }) => setComplaint(data))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const conflictFields = useMemo(() => new Set(complaint?.comparison?.conflict_fields ?? []), [complaint])
  const genaiAvailable = complaint?.comparison?.genai_values != null
  const genaiResult = complaint?.pipeline_results.find((r) => r.pipeline === 'genai')
  const groundTruthResult = complaint?.pipeline_results.find((r) => r.pipeline === 'ground_truth')

  const setDecision = (field: string, decision: ConflictFieldDecision) => {
    setDecisions((prev) => ({ ...prev, [field]: decision }))
  }

  const handleSubmit = async () => {
    if (!id || !complaint) return
    const missing = [...conflictFields].filter((f) => !decisions[f])
    if (missing.length > 0) {
      show(`Resolve all conflicting fields first: ${missing.map((f) => FIELD_LABELS[f] ?? f).join(', ')}`, 'error')
      return
    }
    if (!rationale.trim()) {
      show('Please explain your reasoning', 'error')
      return
    }

    setSubmitting(true)
    try {
      await reviewerApi.resolve(id, {
        decisions: [...conflictFields].map((f) => decisions[f]),
        rationale: rationale.trim(),
      })
      show('Conflict resolved', 'success')
      navigate('/reviewer/dashboard')
    } catch (err) {
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to resolve conflict'
      show(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!id || !rejectReason.trim()) {
      show('Please explain why this is being rejected', 'error')
      return
    }
    setRejecting(true)
    try {
      await reviewerApi.reject(id, rejectReason.trim())
      show('Sent back for re-analysis', 'success')
      navigate('/reviewer/dashboard')
    } catch (err) {
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to reject'
      show(message, 'error')
    } finally {
      setRejecting(false)
    }
  }

  const handleAddComment = async () => {
    if (!id || !comment.trim()) return
    setAddingComment(true)
    try {
      await reviewerApi.addComment(id, comment.trim())
      setComment('')
      show('Comment added', 'success')
      load()
    } catch {
      show('Failed to add comment', 'error')
    } finally {
      setAddingComment(false)
    }
  }

  const handleRegenerate = async () => {
    if (!id) return
    setRegenerating(true)
    try {
      const { data } = await reviewerApi.regenerateResponse(id, tone)
      setRegeneratedResponse(data.suggested_response)
      show('Response regenerated', 'success')
    } catch (err) {
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to regenerate response'
      show(message, 'error')
    } finally {
      setRegenerating(false)
    }
  }

  if (!complaint) {
    return (
      <AppShell title="Review Conflict">
        <p className="text-sm text-[--text-muted]">Loading…</p>
      </AppShell>
    )
  }

  const { comparison } = complaint

  return (
    <AppShell
      title="Review Conflict"
      actions={
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-[--text-secondary]">{complaint.complaint_id}</span>
          {comparison?.verification_score != null && (
            <span className="text-xs text-[--text-muted]">
              {Math.round(comparison.verification_score * 100)}% verified
            </span>
          )}
          {comparison && <SeverityBadge severity={comparison.conflict_severity} />}
        </div>
      }
    >
      <div className="mb-4 rounded-lg border border-[--border] bg-[--zinc-50] p-4">
        <p className="text-sm text-[--text-secondary]">
          {complaint.customer_selected_category ?? 'No self-selected category'} · {complaint.product_type} · Received{' '}
          {new Date(complaint.created_at).toLocaleString()}
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-[--text-primary]">{complaint.description}</p>
      </div>

      {!genaiAvailable && (
        <div className="mb-4 rounded-md border border-p0-border bg-p0-bg px-4 py-3 text-sm text-p0-text">
          GenAI pipeline did not produce a result for this complaint (API failure). Only ground-truth and custom values
          are available below.
        </div>
      )}

      {complaint.review_reason && complaint.review_reason !== 'pipeline_conflict' && (
        <div className="mb-4 rounded-md border border-[--status-yellow]/40 bg-[--status-yellow-bg] px-4 py-3 text-sm text-[--status-yellow]">
          {REVIEW_REASON_LABELS[complaint.review_reason] ?? `Flagged for review: ${complaint.review_reason}`}
          {' '}Both pipelines agreed here -- there's nothing to compare below, just a sanity check to approve.
        </div>
      )}

      {genaiResult && (genaiResult.sentiment || genaiResult.entities_extracted || genaiResult.primary_issue || groundTruthResult?.primary_issue) && (
        <div className="mb-4 rounded-lg border border-[--border] bg-[--surface] p-4">
          <p className="mb-3 text-xs font-medium text-[--text-secondary]">
            AI-reported sentiment, entities &amp; issue labels — informational only, not a Pipeline 1/2 comparison field
          </p>
          <div className="flex flex-wrap items-start gap-x-8 gap-y-2 text-sm">
            <div>
              <p className="mb-0.5 text-xs text-[--text-muted]">Sentiment</p>
              <SentimentBadge sentiment={genaiResult.sentiment} score={genaiResult.sentiment_score} />
            </div>
            <div>
              <p className="mb-0.5 text-xs text-[--text-muted]">Entities extracted</p>
              <EntitiesList entities={genaiResult.entities_extracted} />
            </div>
            <div>
              <p className="mb-0.5 text-xs text-[--text-muted]">Primary / Secondary Issue (Pipeline 1)</p>
              <p className="text-[--text-primary]">
                {genaiResult.primary_issue ?? '—'}{genaiResult.secondary_issue ? ` + ${genaiResult.secondary_issue}` : ''}
              </p>
            </div>
            {groundTruthResult?.primary_issue && (
              <div>
                <p className="mb-0.5 text-xs text-[--text-muted]">Primary / Secondary Issue (Pipeline 2)</p>
                <p className="text-[--text-primary]">
                  {groundTruthResult.primary_issue}{groundTruthResult.secondary_issue ? ` + ${groundTruthResult.secondary_issue}` : ''}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mb-4 rounded-lg border border-[--border] bg-[--surface] p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-[--text-secondary]">Suggested response</p>
          <div className="flex items-center gap-2">
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as ResponseTone)}
              className="h-8 rounded-md border border-[--border] bg-[--surface] px-2 text-xs text-[--text-primary]"
            >
              <option value="Professional">Professional</option>
              <option value="Empathetic">Empathetic</option>
              <option value="Concise">Concise</option>
              <option value="Formal">Formal</option>
            </select>
            <Button variant="ghost" onClick={handleRegenerate} loading={regenerating}>
              {regeneratedResponse || genaiResult?.suggested_response ? 'Regenerate response' : 'Generate response'}
            </Button>
          </div>
        </div>
        <p className="whitespace-pre-wrap text-sm text-[--text-primary]">
          {regeneratedResponse ?? genaiResult?.suggested_response ?? 'No response drafted yet.'}
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-[--border] bg-[--surface]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="h-10 border-b border-[--border] bg-[--zinc-50] text-xs font-medium text-[--text-secondary]">
              <th className="px-4">Field</th>
              <th className="px-4">Pipeline 1 (AI)</th>
              <th className="px-4">Pipeline 2 (Rules)</th>
              <th className="px-4">Resolution</th>
            </tr>
          </thead>
          <tbody>
            {COMPARED_FIELDS.map((field) => {
              const isConflict = conflictFields.has(field)
              const genaiVal = comparison?.genai_values?.[field]
              const gtVal = comparison?.ground_truth_values?.[field]
              const decision = decisions[field]

              return (
                <tr key={field} className={`border-b border-[--zinc-100] last:border-b-0 ${isConflict ? 'bg-p1-bg/30' : ''}`}>
                  <td className="px-4 py-3 font-medium text-[--text-primary]">
                    {FIELD_LABELS[field] ?? field} {isConflict && <span className="text-p1-text">⚠</span>}
                  </td>
                  <td className="px-4 py-3 text-[--text-primary]">{genaiAvailable ? formatValue(genaiVal) : '—'}</td>
                  <td className="px-4 py-3 text-[--text-primary]">{formatValue(gtVal)}</td>
                  <td className="px-4 py-3">
                    {isConflict ? (
                      <div className="flex flex-col gap-1.5">
                        <label className="flex items-center gap-1.5 text-xs">
                          <input
                            type="radio"
                            name={`decision-${field}`}
                            disabled={!genaiAvailable}
                            checked={decision?.source === 'genai'}
                            onChange={() => setDecision(field, { field, source: 'genai' })}
                          />
                          Use Pipeline 1
                        </label>
                        <label className="flex items-center gap-1.5 text-xs">
                          <input
                            type="radio"
                            name={`decision-${field}`}
                            checked={decision?.source === 'ground_truth'}
                            onChange={() => setDecision(field, { field, source: 'ground_truth' })}
                          />
                          Use Pipeline 2
                        </label>
                        <label className="flex items-center gap-1.5 text-xs">
                          <input
                            type="radio"
                            name={`decision-${field}`}
                            checked={decision?.source === 'custom'}
                            onChange={() => setDecision(field, { field, source: 'custom', custom_value: '' })}
                          />
                          Custom:
                          {decision?.source === 'custom' && (
                            <Input
                              className="ml-1 h-7 w-32"
                              value={decision.custom_value ?? ''}
                              onChange={(e) => setDecision(field, { field, source: 'custom', custom_value: e.target.value })}
                            />
                          )}
                        </label>
                      </div>
                    ) : (
                      <span className="text-xs text-[--status-green]">✓ Match</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-lg border border-[--border] bg-[--surface] p-4">
        <p className="mb-3 text-xs font-medium text-[--text-secondary]">Comments</p>
        <div className="mb-3 space-y-2">
          {complaint.history.filter((h) => h.action === 'reviewer_comment').length === 0 && (
            <p className="text-sm text-[--text-muted]">No comments yet.</p>
          )}
          {complaint.history
            .filter((h) => h.action === 'reviewer_comment')
            .map((h, i) => (
              <div key={i} className="rounded-md bg-[--zinc-50] px-3 py-2 text-sm text-[--text-primary]">
                <p>{h.notes}</p>
                <p className="mt-1 text-xs text-[--text-muted]">{new Date(h.created_at).toLocaleString()}</p>
              </div>
            ))}
        </div>
        <div className="flex gap-2">
          <Input
            className="flex-1"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment for other staff..."
          />
          <Button variant="secondary" onClick={handleAddComment} loading={addingComment}>
            Add
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <Label htmlFor="rationale">Your reasoning</Label>
        <Textarea
          id="rationale"
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          placeholder="Explain why you chose these values. This is recorded in the audit trail."
        />
      </div>

      <div className="mt-4 flex gap-3">
        <Button className="flex-1" onClick={handleSubmit} loading={submitting}>
          Submit Resolution
        </Button>
        <Button variant="destructive" onClick={() => setShowRejectInput((v) => !v)}>
          Reject
        </Button>
      </div>

      {showRejectInput && (
        <div className="mt-3 rounded-lg border border-p0-border bg-p0-bg p-4">
          <Label htmlFor="reject-reason">Why is this being rejected?</Label>
          <Textarea
            id="reject-reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Both pipeline outputs are unusable for this complaint -- explain why. It will be re-run through both pipelines from scratch."
          />
          <Button className="mt-3" variant="destructive" onClick={handleReject} loading={rejecting}>
            Confirm reject &amp; re-analyze
          </Button>
        </div>
      )}
    </AppShell>
  )
}
