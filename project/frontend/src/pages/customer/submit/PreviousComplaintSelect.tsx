import { useEffect, useState } from 'react'
import { Label, Select } from '../../../components/ui/Input'
import { complaintsApi } from '../../../services/complaints'
import type { ComplaintSummary } from '../../../types/complaint'

export function PreviousComplaintSelect({
  value,
  onChange,
}: {
  value: string | null
  onChange: (value: string | null) => void
}) {
  const [complaints, setComplaints] = useState<ComplaintSummary[]>([])

  useEffect(() => {
    complaintsApi
      .list(1, 50)
      .then(({ data }) => setComplaints(data.items))
      .catch(() => setComplaints([]))
  }, [])

  if (complaints.length === 0) return null

  return (
    <div>
      <Label htmlFor="previous-complaint-reference" optional>
        Related to an earlier complaint?
      </Label>
      <Select
        id="previous-complaint-reference"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">Not related to a previous complaint</option>
        {complaints.map((c) => (
          <option key={c.id} value={c.complaint_id}>
            {c.complaint_id} — {c.title}
          </option>
        ))}
      </Select>
    </div>
  )
}
