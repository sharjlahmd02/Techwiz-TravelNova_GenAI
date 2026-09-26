import { useEffect, useRef, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { Button } from '../../components/ui/Button'
import { Input, Label } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Table } from '../../components/ui/Table'
import { useToast } from '../../components/ui/Toast'
import { adminApi } from '../../services/admin'
import type { KnowledgeBaseDoc } from '../../types/admin'

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
            header: 'Status',
            accessor: (d) => (
              <span className={d.is_active ? 'text-[--status-green]' : 'text-[--text-muted]'}>
                {d.is_active ? 'Active' : 'Inactive'}
              </span>
            ),
          },
          {
            header: '',
            accessor: (d) =>
              d.is_active && (
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
            <Label htmlFor="doc-file">DOCX file</Label>
            <input
              id="doc-file"
              ref={fileInputRef}
              type="file"
              accept=".docx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-[--text-secondary]"
            />
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
