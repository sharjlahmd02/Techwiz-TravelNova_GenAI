import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Table } from '../../components/ui/Table'
import { useToast } from '../../components/ui/Toast'
import { adminApi } from '../../services/admin'
import type { EscalationRule } from '../../types/admin'

export function EscalationRulesPage() {
  const { show } = useToast()
  const [rules, setRules] = useState<EscalationRule[]>([])
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editResponseTime, setEditResponseTime] = useState('')

  const load = async () => {
    const { data } = await adminApi.listEscalationRules()
    setRules(data)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rules.filter((r) => r.rule_id.toLowerCase().includes(q) || r.trigger_condition.toLowerCase().includes(q))
  }, [rules, search])

  const startEdit = (rule: EscalationRule) => {
    setEditingId(rule.id)
    setEditResponseTime(rule.response_time)
  }

  const saveEdit = async (rule: EscalationRule) => {
    try {
      await adminApi.updateEscalationRule(rule.id, { response_time: editResponseTime })
      show('Rule updated', 'success')
      setEditingId(null)
      await load()
    } catch {
      show('Failed to update rule', 'error')
    }
  }

  const handleDelete = async (rule: EscalationRule) => {
    if (!confirm(`Delete rule ${rule.rule_id}?`)) return
    await adminApi.deleteEscalationRule(rule.id)
    show('Rule deleted', 'success')
    await load()
  }

  return (
    <AppShell title="Escalation Rules">
      <div className="mb-4">
        <Input placeholder="Search by rule ID or trigger…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      </div>

      <Table
        rows={filtered}
        keyFor={(r) => r.id}
        emptyMessage="No rules match your search."
        columns={[
          { header: 'Rule ID', accessor: (r) => <span className="font-mono text-xs">{r.rule_id}</span> },
          { header: 'Trigger', accessor: (r) => r.trigger_condition, className: 'max-w-sm' },
          { header: 'Level', accessor: (r) => r.level ?? r.relative_level ?? '—' },
          { header: 'Priority Override', accessor: (r) => r.priority_override ?? '—' },
          {
            header: 'Response Time',
            accessor: (r) =>
              editingId === r.id ? (
                <Input className="h-7 w-24" value={editResponseTime} onChange={(e) => setEditResponseTime(e.target.value)} />
              ) : (
                r.response_time
              ),
          },
          {
            header: '',
            accessor: (r) =>
              editingId === r.id ? (
                <div className="flex gap-1">
                  <Button variant="ghost" onClick={() => saveEdit(r)}>Save</Button>
                  <Button variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              ) : (
                <div className="flex gap-1">
                  <Button variant="ghost" onClick={() => startEdit(r)}>Edit</Button>
                  <Button variant="ghost" onClick={() => handleDelete(r)}>Delete</Button>
                </div>
              ),
          },
        ]}
      />
    </AppShell>
  )
}
