import { useEffect, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Input, Label, Select } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Table } from '../../components/ui/Table'
import { useToast } from '../../components/ui/Toast'
import { adminApi } from '../../services/admin'
import { managerApi } from '../../services/manager'
import type { AdminUser, Department } from '../../types/admin'

export function AgentManagement() {
  const { show } = useToast()
  const [agents, setAgents] = useState<AdminUser[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', full_name: '', department_id: '' })
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    const [agentsRes, deptsRes] = await Promise.all([managerApi.listAgents(), adminApi.listDepartments()])
    setAgents(agentsRes.data)
    setDepartments(deptsRes.data)
  }

  useEffect(() => {
    load()
  }, [])

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      await managerApi.createAgent(form)
      show('Agent created', 'success')
      setModalOpen(false)
      setForm({ email: '', password: '', full_name: '', department_id: '' })
      await load()
    } catch (err) {
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to create agent'
      show(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (agent: AdminUser) => {
    if (agent.is_active) {
      await managerApi.deactivateAgent(agent.id)
    } else {
      await managerApi.updateAgent(agent.id, { is_active: true })
    }
    show(agent.is_active ? 'Agent deactivated' : 'Agent reactivated', 'success')
    await load()
  }

  const departmentName = (id: string | null) => departments.find((d) => d.id === id)?.name ?? '—'

  return (
    <AppShell title="Agent Management" actions={<Button onClick={() => setModalOpen(true)}>New Agent</Button>}>
      <Table
        rows={agents}
        keyFor={(a) => a.id}
        columns={[
          { header: 'Name', accessor: (a) => a.full_name },
          { header: 'Email', accessor: (a) => a.email },
          { header: 'Department', accessor: (a) => departmentName(a.department_id) },
          {
            header: 'Status',
            accessor: (a) => (
              <span className={a.is_active ? 'text-[--status-green]' : 'text-[--text-muted]'}>
                {a.is_active ? 'Active' : 'Inactive'}
              </span>
            ),
          },
          {
            header: '',
            accessor: (a) => (
              <Button variant="ghost" onClick={() => handleToggleActive(a)}>
                {a.is_active ? 'Deactivate' : 'Reactivate'}
              </Button>
            ),
          },
        ]}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Agent"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={submitting}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="password">Temporary password</Label>
            <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="department">Department</Label>
            <Select id="department" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
              <option value="">Select a department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
