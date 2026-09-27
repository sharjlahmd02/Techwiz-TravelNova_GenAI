import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '../../../components/ui/Button'
import { FieldError, Input, Label, Textarea } from '../../../components/ui/Input'
import { complaintsApi } from '../../../services/complaints'
import { PRODUCT_TYPES } from '../../../types/complaint'
import type { ComplaintCreateResponse } from '../../../types/complaint'

const schema = z.object({
  product_type: z.string().min(1, 'Choose a service type'),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(50, 'Please provide at least 50 characters so we can help effectively').max(5000),
  booking_reference: z.string().max(20).optional(),
})

type FormData = z.infer<typeof schema>

export function WebFormFlow({ onSubmitted }: { onSubmitted: (result: ComplaintCreateResponse) => void }) {
  const [step, setStep] = useState<0 | 1>(0)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { product_type: '' } })

  const values = watch()

  const goToReview = async () => {
    const valid = await trigger()
    if (valid) setStep(1)
  }

  const onSubmit = async (data: FormData) => {
    setSubmitError(null)
    try {
      const { data: response } = await complaintsApi.create({
        ...data,
        booking_reference: data.booking_reference || null,
        channel: 'web_form',
      })
      onSubmitted(response)
    } catch {
      setSubmitError('Something went wrong submitting your complaint. Please try again.')
    }
  }

  if (step === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-7 transition-colors hover:border-zinc-300 sm:p-9">
        <h2 className="mb-4 text-xl text-[#0A0A0A]">What's this about?</h2>
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {PRODUCT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setValue('product_type', type)}
              className={`rounded-md border px-3 py-3 text-sm font-medium transition-colors ${
                values.product_type === type
                  ? 'border-black bg-zinc-50 text-[#0A0A0A]'
                  : 'border-zinc-200 text-[#0A0A0A] hover:border-zinc-400'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        <FieldError message={errors.product_type?.message} />

        <div className="mt-5">
          <Label htmlFor="title">Complaint title</Label>
          <Input id="title" {...register('title')} placeholder="e.g. Flight delayed with no communication" />
          <FieldError message={errors.title?.message} />
        </div>

        <div className="mt-4">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Tell us what happened, including dates, booking reference, and any relevant details."
          />
          <FieldError message={errors.description?.message} />
        </div>

        <div className="mt-4">
          <Label htmlFor="booking_reference" optional>
            Booking reference
          </Label>
          <Input id="booking_reference" {...register('booking_reference')} placeholder="e.g. TNV-12345" />
        </div>

        <Button className="mt-6 w-full" onClick={goToReview}>
          Continue to review
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-7 transition-colors hover:border-zinc-300 sm:p-9">
      <h2 className="mb-4 text-xl text-[#0A0A0A]">Review your complaint</h2>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-zinc-500">Service</dt>
          <dd className="text-[#0A0A0A]">{values.product_type}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Title</dt>
          <dd className="text-[#0A0A0A]">{values.title}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Description</dt>
          <dd className="whitespace-pre-wrap text-[#0A0A0A]">{values.description}</dd>
        </div>
        {values.booking_reference && (
          <div>
            <dt className="text-zinc-500">Booking reference</dt>
            <dd className="font-mono text-[#0A0A0A]">{values.booking_reference}</dd>
          </div>
        )}
      </dl>

      {submitError && <p className="mt-4 text-sm text-p0-text">{submitError}</p>}

      <div className="mt-6 flex items-center justify-between">
        <button onClick={() => setStep(0)} className="text-sm text-link hover:text-link-hover">
          ← Looks wrong? Go back
        </button>
      </div>
      <Button className="mt-4 w-full" onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
        Submit complaint
      </Button>
    </div>
  )
}
