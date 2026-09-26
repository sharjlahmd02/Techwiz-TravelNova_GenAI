import { useEffect, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Input, Label } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import { adminApi } from '../../services/admin'
import type { Category } from '../../types/admin'

export function CategoriesPage() {
  const { show } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ code: '', name: '', description: '' })
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    const { data } = await adminApi.listCategories()
    setCategories(data)
  }

  useEffect(() => {
    load()
  }, [])

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      await adminApi.createCategory(form)
      show('Category created', 'success')
      setModalOpen(false)
      setForm({ code: '', name: '', description: '' })
      await load()
    } catch {
      show('Failed to create category', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (category: Category) => {
    await adminApi.updateCategory(category.id, { is_active: !category.is_active })
    await load()
  }

  const handleDelete = async (category: Category) => {
    if (!confirm(`Delete category "${category.name}"? This also removes its subcategories.`)) return
    try {
      await adminApi.deleteCategory(category.id)
      show('Category deleted', 'success')
      await load()
    } catch {
      show('Failed to delete category', 'error')
    }
  }

  return (
    <AppShell title="Categories" actions={<Button onClick={() => setModalOpen(true)}>New Category</Button>}>
      <div className="space-y-3">
        {categories.map((c) => (
          <div key={c.id} className="rounded-lg border border-[--border] bg-[--surface] p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-xs text-[--text-muted]">{c.code}</span>
                <h3 className="text-sm font-medium text-[--text-primary]">{c.name}</h3>
                {c.description && <p className="text-xs text-[--text-secondary]">{c.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${c.is_active ? 'text-[--status-green]' : 'text-[--text-muted]'}`}>
                  {c.is_active ? 'Active' : 'Inactive'}
                </span>
                <Button variant="ghost" onClick={() => handleToggleActive(c)}>
                  {c.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button variant="ghost" onClick={() => handleDelete(c)}>Delete</Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Category"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={submitting}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="code">Code</Label>
            <Input id="code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CAT-16" />
          </div>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="description" optional>Description</Label>
            <Input id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
