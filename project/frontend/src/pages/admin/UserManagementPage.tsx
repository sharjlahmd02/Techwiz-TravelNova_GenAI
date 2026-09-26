import { useEffect, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Input, Label, Select } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Table } from '../../components/ui/Table'
import { useToast } from '../../components/ui/Toast'
import { adminApi } from '../../services/admin'
import type { AdminUser } from '../../types/admin'
import type { UserRole } from '../../types/auth'

const ROLES: UserRole[] = ['customer', 'agent', 'reviewer', 'manager', 'admin']

export function UserManagementPage() {
  const { show } = useToast()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'agent' as UserRole })
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    const { data } = await adminApi.listUsers(roleFilter || undefined)
    setUsers(data)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter])

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      await adminApi.createUser(form)
      show('User created', 'success')
      setModalOpen(false)
      setForm({ email: '', password: '', full_name: '', role: 'agent' })
      await load()
    } catch (err) {
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to create user'
      show(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (user: AdminUser) => {
    await adminApi.updateUser(user.id, { is_active: !user.is_active })
    await load()
  }

  return (
    <AppShell title="User Management" actions={<Button onClick={() => setModalOpen(true)}>New User</Button>}>
      <div className="mb-4">
        <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as UserRole | '')} className="w-48">
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </Select>
      </div>

      <Table
        rows={users}
        keyFor={(u) => u.id}
        columns={[
          { header: 'Name', accessor: (u) => u.full_name },
          { header: 'Email', accessor: (u) => u.email },
          { header: 'Role', accessor: (u) => <span className="capitalize">{u.role}</span> },
          {
            header: 'Status',
            accessor: (u) => (
              <span className={u.is_active ? 'text-[--status-green]' : 'text-[--text-muted]'}>
                {u.is_active ? 'Active' : 'Inactive'}
              </span>
            ),
          },
          {
            header: '',
            accessor: (u) => (
              <Button variant="ghost" onClick={() => handleToggleActive(u)}>
                {u.is_active ? 'Deactivate' : 'Reactivate'}
              </Button>
            ),
          },
        ]}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New User"
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
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Select id="role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
