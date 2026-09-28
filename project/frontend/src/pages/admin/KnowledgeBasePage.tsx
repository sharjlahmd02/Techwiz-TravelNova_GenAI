import { useEffect, useRef, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Input, Label } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Table } from '../../components/ui/Table'
import { useToast } from '../../components/ui/Toast'
import { adminApi } from '../../services/admin'
import type { KnowledgeBaseDoc, KnowledgeBaseStatus } from '../../types/admin'

const STATUS_LABELS: Record<KnowledgeBaseStatus, string> = {
  active: 'Active',
  previous: 'Previous',
  superseded: 'Superseded',
  draft: 'Draft',
}

const STATUS_STYLES: Record<KnowledgeBaseStatus, string> = {
  active: 'text-[--status-green]',
  previous: 'text-[--text-secondary]',
  superseded: 'text-[--text-muted]',
  draft: 'text-[--status-yellow]',
}

export function KnowledgeBasePage() {
  const { show } = useToast()
  const [docs, setDocs] = useState<KnowledgeBaseDoc[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [documentId, setDocumentId] = useState('')
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    const { data } = await adminApi.listKnowledgeBase()
    setDocs(data)
  }

  useEffect(() => {
    load()
  }, [])

  const handleUpload = async () => {
    if (!file || !documentId.trim()) {
      show('Document ID and file are required', 'error')
      return
    }
    setSubmitting(true)
    try {
      await adminApi.uploadPolicy(documentId.trim(), title.trim() || documentId.trim(), file)
      show('Policy uploaded', 'success')
      setModalOpen(false)
      setDocumentId('')
      setTitle('')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await load()
    } catch {
      show('Failed to upload policy', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeactivate = async (doc: KnowledgeBaseDoc) => {
    await adminApi.deactivateKnowledgeBaseDoc(doc.id)
    show('Document deactivated', 'success')
    await load()
  }

  const handleStatusChange = async (doc: KnowledgeBaseDoc, status: KnowledgeBaseStatus) => {
    try {
      await adminApi.updateKnowledgeBaseDoc(doc.id, { status })
      show(`Marked as ${STATUS_LABELS[status]}`, 'success')
      await load()
    } catch {
      show('Failed to update status', 'error')
    }
  }

  const handleExpiryChange = async (doc: KnowledgeBaseDoc, value: string) => {
    try {
      await adminApi.updateKnowledgeBaseDoc(doc.id, { expiry_date: value || null })
      show(value ? 'Expiry date set' : 'Expiry date cleared', 'success')
      await load()
    } catch {
      show('Failed to update expiry date', 'error')
    }
  }

  const expiryInfo = (doc: KnowledgeBaseDoc): { label: string; className: string } | null => {
    if (!doc.expiry_date) return null
    const daysLeft = Math.ceil((new Date(doc.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (daysLeft < 0) return { label: 'Expired', className: 'text-[--status-red]' }
    if (daysLeft <= 30) return { label: `Expires in ${daysLeft}d`, className: 'text-[--status-yellow]' }
    return null
  }

  return (
    <AppShell title="Knowledge Base" actions={<Button onClick={() => setModalOpen(true)}>Upload Policy</Button>}>
      <Table
        rows={docs}
        keyFor={(d) => d.id}
        columns={[
          { header: 'ID', accessor: (d) => <span className="font-mono text-xs">{d.document_id}</span> },
          { header: 'Title', accessor: (d) => d.title },
          { header: 'Version', accessor: (d) => d.version },
          {
            header: 'Expiry',
            accessor: (d) => {
              const info = expiryInfo(d)
              return (
                <div className="flex flex-col gap-0.5">
                  <input
                    type="date"
                    value={d.expiry_date ?? ''}
                    onChange={(e) => handleExpiryChange(d, e.target.value)}
                    className="rounded-md border border-[--border] bg-transparent px-1.5 py-0.5 text-xs"
                  />
                  {info && <span className={`text-xs font-medium ${info.className}`}>{info.label}</span>}
                </div>
              )
            },
          },
          {
            header: 'Status',
            accessor: (d) => (
              <select
                value={d.status}
                onChange={(e) => handleStatusChange(d, e.target.value as KnowledgeBaseStatus)}
                className={`rounded-md border border-[--border] bg-transparent px-1.5 py-0.5 text-xs font-medium ${STATUS_STYLES[d.status]}`}
              >
                {(Object.keys(STATUS_LABELS) as KnowledgeBaseStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            ),
          },
          {
            header: '',
            accessor: (d) =>
              d.status === 'active' && (
                <Button variant="ghost" onClick={() => handleDeactivate(d)}>Deactivate</Button>
              ),
          },
        ]}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Upload Policy Document"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload} loading={submitting}>Upload</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="doc-id">Document ID</Label>
            <Input id="doc-id" value={documentId} onChange={(e) => setDocumentId(e.target.value)} placeholder="e.g. CMP-POL-07" />
          </div>
          <div>
            <Label htmlFor="doc-title" optional>Title</Label>
            <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="doc-file">PDF or DOCX file</Label>
            <input
              id="doc-file"
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-[--text-secondary]"
            />
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
