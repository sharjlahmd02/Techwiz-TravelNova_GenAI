import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { PriorityBadge, StatusBadge } from '../../components/ui/Badge'
import { Panel } from '../../components/ui/Card'
import { Input, Label, Select, Textarea } from '../../components/ui/Input'
import { useToast } from '../../components/ui/Toast'
import { EntitiesList, PolicyReferenceList, SentimentBadge } from '../../components/staff/PipelineIntelligence'
import { managerApi } from '../../services/manager'
import type { StaffComplaintDetail } from '../../types/staff'

const OVERRIDABLE_FIELDS = ['priority', 'urgency', 'status', 'escalation_level', 'department_id']

export function ManagerComplaintDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { show } = useToast()
  const [complaint, setComplaint] = useState<StaffComplaintDetail | null>(null)
  const [overrideField, setOverrideField] = useState(OVERRIDABLE_FIELDS[0])
  const [overrideValue, setOverrideValue] = useState('')
  const [overrideReason, setOverrideReason] = useState('')
  const [escalateReason, setEscalateReason] = useState('')
  const [escalateLevel, setEscalateLevel] = useState(3)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    if (!id) return
    const { data } = await managerApi.get(id)
    setComplaint(data)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleOverride = async () => {
    if (!id || !overrideValue.trim() || !overrideReason.trim()) {
      show('Value and reason are required', 'error')
      return
    }
    setBusy(true)
    try {
      const { data } = await managerApi.override(id, overrideField, overrideValue.trim(), overrideReason.trim())
      setComplaint(data)
      setOverrideValue('')
      setOverrideReason('')
      show('Complaint updated', 'success')
    } catch {
      show('Failed to override field', 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleEscalate = async () => {
    if (!id || !escalateReason.trim()) {
      show('Reason is required', 'error')
      return
    }
    setBusy(true)
    try {
      const { data } = await managerApi.escalate(id, escalateReason.trim(), escalateLevel)
      setComplaint(data)
      setEscalateReason('')
      show('Complaint escalated', 'success')
    } catch {
      show('Failed to escalate', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (!complaint) {
    return (
      <AppShell title="Complaint">
        <p className="text-sm text-[--text-muted]">Loading…</p>
      </AppShell>
    )
  }

  return (
    <AppShell title={complaint.complaint_id} actions={<Button variant="ghost" onClick={() => navigate(-1)}>← Back</Button>}>
      <Panel title="Override">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[160px_1fr_1fr_auto] sm:items-end">
          <div>
            <Label htmlFor="field">Field</Label>
            <Select id="field" value={overrideField} onChange={(e) => setOverrideField(e.target.value)}>
              {OVERRIDABLE_FIELDS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="value">New value</Label>
            <Input id="value" value={overrideValue} onChange={(e) => setOverrideValue(e.target.value)} placeholder="e.g. P1" />
          </div>
          <div>
            <Label htmlFor="reason">Reason</Label>
            <Input id="reason" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Required" />
          </div>
          <Button onClick={handleOverride} loading={busy}>Apply</Button>
        </div>
      </Panel>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <Panel title="Complaint">
            <div className="mb-3 flex items-center gap-2">
              <PriorityBadge priority={complaint.priority} />
              <StatusBadge status={complaint.status} />
              {complaint.has_conflict && <span className="text-xs font-medium text-p0-text">Pipeline conflict</span>}
            </div>
            <h2 className="mb-2 text-lg font-medium text-[--text-primary]">{complaint.title}</h2>
            <p className="whitespace-pre-wrap text-sm text-[--text-primary]">{complaint.description}</p>
            <p className="mt-3 text-xs text-[--text-muted]">
              Department: <span className="text-[--text-primary]">{complaint.department_name ?? '—'}</span>
              {complaint.supporting_department_name && (
                <> · Supporting: <span className="text-[--text-primary]">{complaint.supporting_department_name}</span></>
              )}
            </p>
          </Panel>

          <Panel title="Pipeline Results">
            {complaint.pipeline_results.map((r) => (
              <div key={r.id} className="mb-3 rounded-md border border-[--zinc-100] p-3 text-sm last:mb-0">
                <p className="mb-1 text-xs font-semibold uppercase text-[--text-muted]">{r.pipeline}</p>
                <p className="text-[--text-primary]">
                  {r.category ?? '—'} {r.subcategory ? `→ ${r.subcategory}` : ''} · {r.priority ?? '—'} / {r.urgency ?? '—'}
                </p>
                {(r.primary_issue || r.secondary_issue) && (
                  <p className="mt-1 text-xs text-[--text-muted]">
                    Issue: {r.primary_issue ?? '—'}{r.secondary_issue ? ` + ${r.secondary_issue}` : ''}
                  </p>
                )}
                {r.pipeline === 'genai' && (
                  <div className="mt-2 flex flex-wrap items-start gap-x-6 gap-y-1">
                    <div>
                      <p className="mb-0.5 text-xs text-[--text-muted]">Sentiment</p>
                      <SentimentBadge sentiment={r.sentiment} score={r.sentiment_score} />
                    </div>
                    <div>
                      <p className="mb-0.5 text-xs text-[--text-muted]">Entities extracted</p>
                      <EntitiesList entities={r.entities_extracted} />
                    </div>
                  </div>
                )}
                {!!r.policy_references?.length && (
                  <div className="mt-2">
                    <p className="mb-0.5 text-xs text-[--text-muted]">Policies cited</p>
                    <PolicyReferenceList references={r.policy_references} />
                  </div>
                )}
                {!!r.clarification_questions?.length && (
                  <div className="mt-2 rounded-md border border-[--status-yellow]/40 bg-[--status-yellow-bg] p-2">
                    <p className="mb-0.5 text-xs font-medium text-[--status-yellow]">Missing information</p>
                    <ul className="list-disc space-y-0.5 pl-4 text-[--text-primary]">
                      {r.clarification_questions.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(r.provider || r.model_name || r.prompt_version || r.policy_version) && (
                  <p className="mt-2 border-t border-[--zinc-100] pt-2 text-xs text-[--text-muted]">
                    {[
                      r.provider,
                      r.model_name,
                      r.prompt_version ? `prompt v${r.prompt_version}` : null,
                      r.policy_version ? `policy: ${r.policy_version}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </div>
            ))}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Escalate">
            <Label htmlFor="escalate-level">Level (1-5)</Label>
            <Input
              id="escalate-level"
              type="number"
              min={1}
              max={5}
              value={escalateLevel}
              onChange={(e) => setEscalateLevel(Number(e.target.value))}
            />
            <div className="mt-3">
              <Label htmlFor="escalate-reason">Reason</Label>
              <Textarea id="escalate-reason" value={escalateReason} onChange={(e) => setEscalateReason(e.target.value)} />
            </div>
            <Button className="mt-3 w-full" variant="destructive" onClick={handleEscalate} loading={busy}>
              Escalate
            </Button>
          </Panel>

          <Panel title="Details">
            <dl className="space-y-2 text-xs">
              <div>
                <dt className="text-[--text-muted]">Product</dt>
                <dd className="text-[--text-primary]">{complaint.product_type}</dd>
              </div>
              <div>
                <dt className="text-[--text-muted]">Escalation Level</dt>
                <dd className="text-[--text-primary]">{complaint.escalation_level}</dd>
              </div>
            </dl>
          </Panel>
        </div>
      </div>
    </AppShell>
  )
}
