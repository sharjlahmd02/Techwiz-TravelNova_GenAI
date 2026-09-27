import { zodResolver } from '@hookform/resolvers/zod'
import { Check, MessageSquareCode } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { FieldError, Input, Label, Textarea } from '../../components/ui/Input'
import { complaintsApi } from '../../services/complaints'
import { PRODUCT_TYPES } from '../../types/complaint'
import type { ComplaintCreateResponse } from '../../types/complaint'

const schema = z.object({
  product_type: z.string().min(1, 'Choose a service type'),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(50, 'Please provide at least 50 characters so we can help effectively').max(5000),
  booking_reference: z.string().max(20).optional(),
})

type FormData = z.infer<typeof schema>

const STEPS = ['Details', 'Review', 'Done']

export function SubmitComplaintPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [result, setResult] = useState<ComplaintCreateResponse | null>(null)
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
      })
      setResult(response)
      setStep(2)
    } catch {
      setSubmitError('Something went wrong submitting your complaint. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-[--bg]">
      <header className="sticky top-0 z-10 border-b border-[--border] bg-white/90 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-black text-white">
            <MessageSquareCode className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="text-[15px] font-bold text-[--text-primary]">SupportNova</span>
        </div>
      </header>

      <div className="mx-auto max-w-[640px] px-4 py-10">
        <div className="mb-8 flex items-center justify-center gap-3">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${i <= step ? 'bg-black' : 'bg-[--zinc-300]'}`}
                />
                <span className={`text-xs ${i === step ? 'font-medium text-[--text-primary]' : 'text-[--text-muted]'}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && <div className="h-px w-10 bg-[--zinc-300]" />}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="rounded-lg border border-[--border] bg-[--surface] p-6">
            <h2 className="mb-4 text-xl text-[--text-primary]">What's this about?</h2>
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {PRODUCT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setValue('product_type', type)}
                  className={`rounded-md border px-3 py-3 text-sm font-medium transition-colors ${
                    values.product_type === type
                      ? 'border-black bg-[--zinc-50] text-[--text-primary]'
                      : 'border-[--border] text-[--text-primary] hover:border-[--border-strong]'
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
        )}

        {step === 1 && (
          <div className="rounded-lg border border-[--border] bg-[--surface] p-6">
            <h2 className="mb-4 text-xl text-[--text-primary]">Review your complaint</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-[--text-secondary]">Service</dt>
                <dd className="text-[--text-primary]">{values.product_type}</dd>
              </div>
              <div>
                <dt className="text-[--text-secondary]">Title</dt>
                <dd className="text-[--text-primary]">{values.title}</dd>
              </div>
              <div>
                <dt className="text-[--text-secondary]">Description</dt>
                <dd className="whitespace-pre-wrap text-[--text-primary]">{values.description}</dd>
              </div>
              {values.booking_reference && (
                <div>
                  <dt className="text-[--text-secondary]">Booking reference</dt>
                  <dd className="font-mono text-[--text-primary]">{values.booking_reference}</dd>
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
        )}

        {step === 2 && result && (
          <div className="rounded-lg border border-[--border] bg-[--surface] p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[--status-green-bg] text-[--status-green]">
              <Check className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <h2 className="text-xl text-[--text-primary]">Your complaint has been submitted</h2>
            <p className="mt-3 font-mono text-lg text-[--text-primary]">{result.complaint_id}</p>
            <p className="mt-2 text-sm text-[--text-secondary]">
              We're reviewing it now and will follow up shortly with next steps.
            </p>
            <Button className="mt-6" onClick={() => navigate('/customer/dashboard')}>
              Track your complaint →
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
