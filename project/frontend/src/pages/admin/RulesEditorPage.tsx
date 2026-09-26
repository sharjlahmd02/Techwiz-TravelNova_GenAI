import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Table } from '../../components/ui/Table'
import { useToast } from '../../components/ui/Toast'
import { adminApi } from '../../services/admin'
import type { ResolutionRule } from '../../types/admin'

export function RulesEditorPage() {
  const { show } = useToast()
  const [rules, setRules] = useState<ResolutionRule[]>([])
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPriority, setEditPriority] = useState('')

  const load = async () => {
    const { data } = await adminApi.listRules()
    setRules(data)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rules.filter(
      (r) => r.rule_id.toLowerCase().includes(q) || r.category.toLowerCase().includes(q) || r.subcategory.toLowerCase().includes(q)
    )
  }, [rules, search])

  const startEdit = (rule: ResolutionRule) => {
    setEditingId(rule.id)
    setEditPriority(rule.priority)
  }

  const saveEdit = async (rule: ResolutionRule) => {
    try {
      await adminApi.updateRule(rule.id, { priority: editPriority })
      show('Rule updated', 'success')
      setEditingId(null)
      await load()
    } catch {
      show('Failed to update rule', 'error')
    }
  }

  const handleDelete = async (rule: ResolutionRule) => {
    if (!confirm(`Delete rule ${rule.rule_id}?`)) return
    await adminApi.deleteRule(rule.id)
    show('Rule deleted', 'success')
    await load()
  }

  return (
    <AppShell title="Resolution Rules">
      <div className="mb-4">
        <Input placeholder="Search by rule ID, category, subcategory…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      </div>

      <Table
        rows={filtered}
        keyFor={(r) => r.id}
        emptyMessage="No rules match your search."
        columns={[
          { header: 'Rule ID', accessor: (r) => <span className="font-mono text-xs">{r.rule_id}</span> },
          { header: 'Category', accessor: (r) => r.category },
          { header: 'Subcategory', accessor: (r) => r.subcategory },
          { header: 'Department', accessor: (r) => r.department },
          {
            header: 'Priority',
            accessor: (r) =>
              editingId === r.id ? (
                <Input className="h-7 w-16" value={editPriority} onChange={(e) => setEditPriority(e.target.value)} />
              ) : (
                r.priority
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
