import { Label, Select } from '../../../components/ui/Input'
import type { PreferredContactChannel } from '../../../types/complaint'

const OPTIONS: { value: PreferredContactChannel; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'sms', label: 'SMS' },
]

export function ContactChannelSelect({
  value,
  onChange,
}: {
  value: PreferredContactChannel | null
  onChange: (value: PreferredContactChannel | null) => void
}) {
  return (
    <div>
      <Label htmlFor="preferred-contact-channel" optional>
        Preferred contact method
      </Label>
      <Select
        id="preferred-contact-channel"
        value={value ?? ''}
        onChange={(e) => onChange((e.target.value || null) as PreferredContactChannel | null)}
      >
        <option value="">No preference</option>
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  )
}
