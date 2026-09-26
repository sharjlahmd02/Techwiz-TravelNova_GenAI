import { useEffect, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Input, Label } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Table } from '../../components/ui/Table'
import { useToast } from '../../components/ui/Toast'
import { adminApi } from '../../services/admin'
import type { Department } from '../../types/admin'

export function DepartmentsPage() {
  const { show } = useToast()
  const [departments, setDepartments] = useState<Department[]>([])
  const [editing, setEditing] = useState<Department | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '' })
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ code: '', name: '', description: '' })
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    const { data } = await adminApi.listDepartments()
    setDepartments(data)
  }

  useEffect(() => {
    load()
  }, [])

  const startEdit = (dept: Department) => {
    setEditing(dept)
    setEditForm({ name: dept.name, description: dept.description ?? '' })
  }

  const saveEdit = async () => {
    if (!editing) return
    setSubmitting(true)
    try {
      await adminApi.updateDepartment(editing.id, editForm)
      show('Department updated', 'success')
      setEditing(null)
      await load()
    } catch {
      show('Failed to update department', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      await adminApi.createDepartment(createForm)
      show('Department created', 'success')
      setCreateOpen(false)
      setCreateForm({ code: '', name: '', description: '' })
      await load()
    } catch {
      show('Failed to create department', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell title="Departments" actions={<Button onClick={() => setCreateOpen(true)}>New Department</Button>}>
      <Table
        rows={departments}
        keyFor={(d) => d.id}
        columns={[
          { header: 'Code', accessor: (d) => <span className="font-mono text-xs">{d.code}</span> },
          { header: 'Name', accessor: (d) => d.name },
          { header: 'Description', accessor: (d) => d.description ?? '—', className: 'max-w-sm truncate' },
          {
            header: 'Status',
            accessor: (d) => (
              <span className={d.is_active ? 'text-[--status-green]' : 'text-[--text-muted]'}>
                {d.is_active ? 'Active' : 'Inactive'}
              </span>
            ),
          },
          { header: '', accessor: (d) => <Button variant="ghost" onClick={() => startEdit(d)}>Edit</Button> },
        ]}
      />

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Edit ${editing?.name ?? ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} loading={submitting}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="edit-desc" optional>Description</Label>
            <Input id="edit-desc" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
          </div>
        </div>
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Department"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={submitting}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="new-code">Code</Label>
            <Input id="new-code" value={createForm.code} onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })} placeholder="DEPT-11" />
          </div>
          <div>
            <Label htmlFor="new-name">Name</Label>
            <Input id="new-name" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="new-desc" optional>Description</Label>
            <Input id="new-desc" value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} />
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
