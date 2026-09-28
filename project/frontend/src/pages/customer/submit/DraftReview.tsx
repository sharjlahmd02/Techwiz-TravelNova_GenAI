import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { FieldError, Input, Label, Select, Textarea } from '../../../components/ui/Input'
import { Button } from '../../../components/ui/Button'
import { PRODUCT_TYPES, type ComplaintFieldsDraft, type PreferredContactChannel } from '../../../types/complaint'
import { PreviousComplaintSelect } from './PreviousComplaintSelect'
import { ContactChannelSelect } from './ContactChannelSelect'

export interface DraftSubmitExtras {
  previous_complaint_reference: string | null
  preferred_contact_channel: PreferredContactChannel | null
}

export function DraftReview({
  draft,
  onChange,
  onBack,
  onSubmit,
  submitting,
  error,
  sourceLabel,
}: {
  draft: ComplaintFieldsDraft
  onChange: (draft: ComplaintFieldsDraft) => void
  onBack: () => void
  onSubmit: (extras: DraftSubmitExtras) => void
  submitting: boolean
  error: string | null
  sourceLabel: string
}) {
  const titleInvalid = draft.title.trim().length === 0
  const descriptionInvalid = draft.description.trim().length < 50
  const [previousComplaintReference, setPreviousComplaintReference] = useState<string | null>(null)
  const [preferredContactChannel, setPreferredContactChannel] = useState<PreferredContactChannel | null>(null)

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-7 transition-colors hover:border-zinc-300 sm:p-9">
      <div className="mb-5 flex items-start gap-2.5 rounded-md border border-zinc-200 bg-zinc-50 p-3.5">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
        <p className="text-xs text-zinc-600">
          We've drafted this {sourceLabel}. Please review and edit anything that isn't quite right before
          submitting.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="draft-product-type">Service</Label>
          <Select
            id="draft-product-type"
            value={draft.product_type}
            onChange={(e) => onChange({ ...draft, product_type: e.target.value })}
          >
            {PRODUCT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="draft-title">Complaint title</Label>
          <Input
            id="draft-title"
            value={draft.title}
            onChange={(e) => onChange({ ...draft, title: e.target.value })}
            error={titleInvalid}
          />
          {titleInvalid && <FieldError message="Title is required." />}
        </div>

        <div>
          <Label htmlFor="draft-description">Description</Label>
          <Textarea
            id="draft-description"
            value={draft.description}
            onChange={(e) => onChange({ ...draft, description: e.target.value })}
            error={descriptionInvalid}
          />
          {descriptionInvalid && <FieldError message="Please provide at least 50 characters." />}
        </div>

        <div>
          <Label htmlFor="draft-booking-reference" optional>
            Booking reference
          </Label>
          <Input
            id="draft-booking-reference"
            value={draft.booking_reference ?? ''}
            onChange={(e) => onChange({ ...draft, booking_reference: e.target.value || null })}
            placeholder="e.g. TNV-12345"
          />
        </div>

        <PreviousComplaintSelect value={previousComplaintReference} onChange={setPreviousComplaintReference} />
        <ContactChannelSelect value={preferredContactChannel} onChange={setPreferredContactChannel} />
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-p0-text">
          {error}
        </p>
      )}

      <div className="mt-6 flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-link hover:text-link-hover">
          ← Start over
        </button>
      </div>
      <Button
        className="mt-4 w-full"
        onClick={() =>
          onSubmit({
            previous_complaint_reference: previousComplaintReference,
            preferred_contact_channel: preferredContactChannel,
          })
        }
        loading={submitting}
        disabled={titleInvalid || descriptionInvalid}
      >
        Submit complaint
      </Button>
    </div>
  )
}
