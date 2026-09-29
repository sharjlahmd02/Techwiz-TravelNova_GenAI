import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { Button } from "../../components/ui/Button";
import { PriorityBadge, StatusBadge } from "../../components/ui/Badge";
import { Panel } from "../../components/ui/Card";
import { Select, Textarea } from "../../components/ui/Input";
import { FollowUpBadge } from "../../components/ui/FollowUpBadge";
import { useToast } from "../../components/ui/Toast";
import {
  EntitiesList,
  SentimentBadge,
  ValidationIssuesList,
  escalationLevelLabel,
} from "../../components/staff/PipelineIntelligence";
import { agentApi } from "../../services/agent";
import type { StaffComplaintDetail } from "../../types/staff";
import type { ComplaintStatus } from "../../types/complaint";

const AGENT_STATUSES: ComplaintStatus[] = [
  "in_progress",
  "awaiting_customer",
  "resolved",
];

export function AgentComplaintDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { show } = useToast();
  const [complaint, setComplaint] = useState<StaffComplaintDetail | null>(null);
  const [note, setNote] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!id) return;
    const { data } = await agentApi.get(id);
    setComplaint(data);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleStatusChange = async (status: ComplaintStatus) => {
    if (!id) return;
    setBusy(true);
    try {
      const { data } = await agentApi.updateStatus(id, status);
      setComplaint(data);
      show(`Status updated to ${status.replace("_", " ")}`, "success");
    } catch {
      show("Failed to update status", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleAddNote = async () => {
    if (!id || !note.trim()) return;
    setBusy(true);
    try {
      await agentApi.addNote(id, note.trim());
      setNote("");
      show("Note added", "success");
      await load();
    } catch {
      show("Failed to add note", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleRequestInfo = async () => {
    if (!id || !infoMessage.trim()) return;
    setBusy(true);
    try {
      await agentApi.requestInfo(id, infoMessage.trim());
      setInfoMessage("");
      show("Message sent to customer", "success");
      await load();
    } catch {
      show("Failed to send message", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleAskCustomer = async (questions: string[]) => {
    if (!id || questions.length === 0) return;
    const message =
      questions.length === 1
        ? questions[0]
        : `To help resolve this, could you please clarify:\n${questions.map((q) => `- ${q}`).join("\n")}`;
    setBusy(true);
    try {
      await agentApi.requestInfo(id, message);
      show("Question sent to customer", "success");
      await load();
    } catch {
      show("Failed to send message", "error");
    } finally {
      setBusy(false);
    }
  };

  if (!complaint) {
    return (
      <AppShell title="Complaint">
        <p className="text-sm text-[--text-muted]">Loading…</p>
      </AppShell>
    );
  }

  const groundTruth = complaint.pipeline_results.find(
    (r) => r.pipeline === "ground_truth",
  );
  const genai = complaint.pipeline_results.find((r) => r.pipeline === "genai");
  const primary = groundTruth ?? genai;
  // GenAI's summary is preferred (richer, natural language); the ground-truth pipeline's
  // extractive summary is only shown as a fallback when GenAI didn't produce one.
  const summary = genai?.summary || groundTruth?.summary;

  return (
    <AppShell
      title={complaint.complaint_id}
      actions={
        <Button variant="ghost" onClick={() => navigate(-1)}>
          ← Back
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <Panel title="Complaint">
            <div className="mb-3 flex items-center gap-2">
              <PriorityBadge priority={complaint.priority} />
              <StatusBadge status={complaint.status} />
              {complaint.has_conflict && (
                <span className="text-xs font-medium text-p0-text">
                  Pipeline conflict
                </span>
              )}
              {complaint.is_duplicate && (
                <span className="text-xs font-medium text-[--status-yellow]">
                  Possible duplicate
                </span>
              )}
            </div>
            <h2 className="mb-2 text-lg font-medium text-[--text-primary]">
              {complaint.title}
            </h2>
            {summary && (
              <p className="mb-3 rounded-md border border-[--border] bg-[--zinc-50] px-3 py-2 text-sm italic text-[--text-secondary]">
                {summary}
              </p>
            )}
            <p className="whitespace-pre-wrap text-sm text-[--text-primary]">
              {complaint.description}
            </p>
          </Panel>

          {primary && (
            <Panel title="Pipeline Analysis">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-[--text-muted]">Category</dt>
                  <dd className="text-[--text-primary]">
                    {primary.category ?? "—"}{" "}
                    {primary.subcategory ? `→ ${primary.subcategory}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[--text-muted]">Department</dt>
                  <dd className="text-[--text-primary]">
                    {complaint.department_name ?? "—"}
                    {complaint.supporting_department_name
                      ? ` (+ ${complaint.supporting_department_name} supporting)`
                      : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[--text-muted]">
                    Primary / Secondary Issue
                  </dt>
                  <dd className="text-[--text-primary]">
                    {primary.primary_issue ?? "—"}
                    {primary.secondary_issue
                      ? ` + ${primary.secondary_issue}`
                      : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[--text-muted]">
                    Refund / Compensation
                  </dt>
                  <dd className="text-[--text-primary]">
                    {primary.refund_eligible ? "Refund eligible" : "No refund"}{" "}
                    ·{" "}
                    {primary.compensation_eligible
                      ? "Compensation eligible"
                      : "No compensation"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[--text-muted]">Sentiment</dt>
                  <dd className="mt-0.5">
                    <SentimentBadge
                      sentiment={genai?.sentiment}
                      score={genai?.sentiment_score}
                    />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[--text-muted]">
                    Entities extracted
                  </dt>
                  <dd className="mt-0.5">
                    <EntitiesList entities={genai?.entities_extracted} />
                  </dd>
                </div>
                {!!genai?.clarification_questions?.length && (
                  <div className="col-span-2 rounded-md border border-[--status-yellow]/40 bg-[--status-yellow-bg] p-3">
                    <dt className="mb-1 text-xs font-medium text-[--status-yellow]">
                      Missing information -- consider asking the customer
                    </dt>
                    <dd className="text-[--text-primary]">
                      <ul className="list-disc space-y-0.5 pl-4">
                        {genai.clarification_questions.map((q) => (
                          <li key={q}>{q}</li>
                        ))}
                      </ul>
                      <Button
                        className="mt-2"
                        variant="secondary"
                        onClick={() =>
                          handleAskCustomer(genai.clarification_questions ?? [])
                        }
                        loading={busy}
                      >
                        Ask customer
                      </Button>
                    </dd>
                  </div>
                )}
                {!!primary.required_actions?.length && (
                  <div className="col-span-2 rounded-md border border-[--status-green]/40 bg-[--status-green-bg] p-3">
                    <dt className="mb-1 text-xs font-medium text-[--status-green]">
                      Required actions
                    </dt>
                    <dd className="text-[--text-primary]">
                      <ul className="list-disc space-y-0.5 pl-4">
                        {primary.required_actions.map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
                {!!primary.prohibited_actions?.length && (
                  <div className="col-span-2 rounded-md border border-p0-border bg-p0-bg p-3">
                    <dt className="mb-1 text-xs font-medium text-p0-text">
                      Do not
                    </dt>
                    <dd className="text-[--text-primary]">
                      <ul className="list-disc space-y-0.5 pl-4">
                        {primary.prohibited_actions.map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
                {!!genai?.validation_issues?.length && (
                  <div className="col-span-2">
                    <dt className="mb-1 text-xs text-[--text-muted]">
                      Validation warnings
                    </dt>
                    <dd>
                      <ValidationIssuesList issues={genai.validation_issues} />
                    </dd>
                  </div>
                )}
                {primary.suggested_response && (
                  <div className="col-span-2">
                    <dt className="text-xs text-[--text-muted]">
                      Suggested response
                    </dt>
                    <dd className="text-[--text-primary]">
                      {primary.suggested_response}
                    </dd>
                  </div>
                )}
              </dl>
            </Panel>
          )}

          <Panel title="Messages">
            <div className="space-y-3">
              {complaint.messages.length === 0 && (
                <p className="text-sm text-[--text-muted]">No messages yet.</p>
              )}
              {complaint.messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.sender === "agent" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-md px-3 py-2 text-sm ${
                      m.sender === "agent"
                        ? "bg-black text-white"
                        : "border border-[--border] bg-[--surface] text-[--text-primary]"
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
                value={infoMessage}
                onChange={(e) => setInfoMessage(e.target.value)}
                placeholder="Request more info from customer…"
              />
              <Button
                onClick={handleRequestInfo}
                loading={busy}
                disabled={!infoMessage.trim()}
              >
                Send
              </Button>
            </div>
          </Panel>

          <Panel title="Internal Notes (staff only)">
            <div className="space-y-2">
              {complaint.history
                .filter((h) => h.action === "note_added")
                .map((h, i) => (
                  <div
                    key={i}
                    className="rounded-md bg-[--zinc-50] px-3 py-2 text-sm text-[--text-primary]"
                  >
                    {h.notes}
                    <p className="mt-1 text-xs text-[--text-muted]">
                      {new Date(h.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Textarea
                className="min-h-[40px]"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add an internal note…"
              />
              <Button
                variant="secondary"
                onClick={handleAddNote}
                loading={busy}
                disabled={!note.trim()}
              >
                Add
              </Button>
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Actions">
            <label className="mb-1.5 block text-sm font-medium text-[--text-primary]">
              Status
            </label>
            <Select
              value={complaint.status}
              onChange={(e) =>
                handleStatusChange(e.target.value as ComplaintStatus)
              }
              disabled={busy}
            >
              <option value={complaint.status} disabled>
                {complaint.status.replace("_", " ")}
              </option>
              {AGENT_STATUSES.filter((s) => s !== complaint.status).map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </Select>
          </Panel>

          <Panel title="Details">
            <dl className="space-y-2 text-xs">
              <div>
                <dt className="text-[--text-muted]">Product</dt>
                <dd className="text-[--text-primary]">
                  {complaint.product_type}
                </dd>
              </div>
              {complaint.booking_reference && (
                <div>
                  <dt className="text-[--text-muted]">Booking Ref</dt>
                  <dd className="font-mono text-[--text-primary]">
                    {complaint.booking_reference}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-[--text-muted]">Received</dt>
                <dd className="text-[--text-primary]">
                  {new Date(complaint.created_at).toLocaleString()}
                </dd>
              </div>
              {complaint.sla_resolution_deadline && (
                <div>
                  <dt className="text-[--text-muted]">SLA Deadline</dt>
                  <dd className="text-[--text-primary]">
                    {new Date(
                      complaint.sla_resolution_deadline,
                    ).toLocaleString()}
                  </dd>
                </div>
              )}
              {complaint.next_follow_up_at && (
                <div>
                  <dt className="text-[--text-muted]">Follow-up</dt>
                  <dd className="mt-0.5">
                    <FollowUpBadge dueAt={complaint.next_follow_up_at} />
                  </dd>
                </div>
              )}
              {complaint.escalation_level > 0 && (
                <div>
                  <dt className="text-[--text-muted]">Escalation Level</dt>
                  <dd className="text-[--text-primary]">
                    {complaint.escalation_level} —{" "}
                    {escalationLevelLabel(complaint.escalation_level)}
                  </dd>
                </div>
              )}
            </dl>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
