import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { SeverityBadge } from '../../components/ui/Badge'
import { Input, Label, Textarea } from '../../components/ui/Input'
import { useToast } from '../../components/ui/Toast'
import { EntitiesList, SentimentBadge } from '../../components/staff/PipelineIntelligence'
import { reviewerApi, type ConflictFieldDecision } from '../../services/reviewer'
import { COMPARED_FIELDS } from '../../types/staff'
import type { StaffComplaintDetail } from '../../types/staff'

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

  useEffect(() => {
    if (!id) return
    reviewerApi.getConflict(id).then(({ data }) => setComplaint(data))
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

      <div className="mt-6">
        <Label htmlFor="rationale">Your reasoning</Label>
        <Textarea
          id="rationale"
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          placeholder="Explain why you chose these values. This is recorded in the audit trail."
        />
      </div>

      <Button className="mt-4 w-full" onClick={handleSubmit} loading={submitting}>
        Submit Resolution
      </Button>
    </AppShell>
  )
}
