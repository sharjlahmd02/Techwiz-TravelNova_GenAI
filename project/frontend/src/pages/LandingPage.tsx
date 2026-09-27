import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowDown,
  MessageSquareCode,
  Sparkles,
  ShieldCheck,
  Activity,
  Users,
  FileText,
  Cog,
  CheckCircle2,
  Quote,
  FileCheck,
  MapPin,
  Mail,
  Clock,
  Check,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react'

// Inter is already loaded globally (see index.css) and set as the default
// sans font in tailwind.config.js -- no separate font import needed here.

const NAV_LINKS = [
  { label: 'Home', id: 'top' },
  { label: 'Features', id: 'features' },
  { label: 'How It Works', id: 'how-it-works' },
  { label: 'Pricing', id: 'pricing' },
  { label: 'Help', id: 'footer' },
]

const HEADER_OFFSET = 80

function avatar(n: number, size = 64) {
  return `https://i.pravatar.cc/${size}?img=${n}`
}

function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white">
        <MessageSquareCode className="h-4 w-4" strokeWidth={2.5} />
      </span>
      <span className="text-[15px] font-bold tracking-tight text-black">SupportNova</span>
    </div>
  )
}

function PillButton({
  children,
  variant = 'primary',
  to,
  href,
  onClick,
  className = '',
}: {
  children: ReactNode
  variant?: 'primary' | 'outline' | 'inverse' | 'outlineInverse'
  to?: string
  href?: string
  onClick?: (e: React.MouseEvent) => void
  className?: string
}) {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium transition-colors'
  const variants: Record<string, string> = {
    primary: 'bg-black text-white hover:bg-zinc-800',
    outline: 'border border-zinc-300 text-black hover:border-zinc-400',
    inverse: 'bg-white text-black hover:bg-zinc-100',
    outlineInverse: 'border border-white/40 text-white hover:border-white',
  }
  const classes = `${base} ${variants[variant]} ${className}`

  if (to) {
    return (
      <Link to={to} className={classes}>
        {children}
      </Link>
    )
  }
  return (
    <a href={href ?? '#'} onClick={onClick} className={classes}>
      {children}
    </a>
  )
}

function SectionHeading({ title, subtext }: { title: ReactNode; subtext?: ReactNode }) {
  return (
    <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
      <h2 className="text-[32px] font-bold leading-tight tracking-tight text-black md:text-[36px]">{title}</h2>
      {subtext && <p className="max-w-sm text-[15px] text-zinc-500 md:text-right">{subtext}</p>}
    </div>
  )
}

// ---- Small inline mockup pieces (no chart library, no gray placeholder boxes) ----

function MiniBarList() {
  const rows = [
    { name: 'Flight Delay', pct: 82, tag: 'P1', dot: 'bg-amber-400', bar: 'bg-amber-400' },
    { name: 'Baggage Loss', pct: 65, tag: 'P2', dot: 'bg-blue-400', bar: 'bg-blue-400' },
    { name: 'Refund Issue', pct: 45, tag: 'P0', dot: 'bg-red-400', bar: 'bg-red-400' },
    { name: 'Hotel Complaint', pct: 30, tag: 'P3', dot: 'bg-zinc-400', bar: 'bg-zinc-400' },
  ]
  return (
    <div className="mt-5 space-y-2.5">
      {rows.map((r) => (
        <div key={r.name} className="flex items-center gap-3">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${r.dot}`} />
          <span className="w-28 shrink-0 text-[12px] text-zinc-600">{r.name}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
            <div className={`h-full rounded-full ${r.bar}`} style={{ width: `${r.pct}%` }} />
          </div>
          <span className="w-6 shrink-0 text-right text-[11px] font-medium text-zinc-400">{r.tag}</span>
        </div>
      ))}
    </div>
  )
}

function MiniLineChart() {
  return (
    <div className="relative mt-5">
      <svg viewBox="0 0 220 70" className="h-20 w-full" fill="none">
        <polyline
          points="0,60 30,52 60,55 90,38 120,42 150,20 180,24 220,6"
          stroke="#16A34A"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points="0,60 30,52 60,55 90,38 120,42 150,20 180,24 220,6 220,70 0,70"
          fill="#16A34A"
          opacity="0.08"
          stroke="none"
        />
      </svg>
      <span className="absolute right-0 top-0 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-black shadow-sm">
        99.2% accuracy
      </span>
    </div>
  )
}

function MiniTimeline() {
  const steps = ['Submitted', 'In Review', 'Resolved']
  return (
    <div className="mt-6 flex items-center">
      {steps.map((label, i) => (
        <div key={label} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                i === 1 ? 'bg-black text-white' : 'border border-zinc-300 bg-white text-zinc-400'
              }`}
            >
              {i + 1}
            </span>
            <span className={`text-[10px] ${i === 1 ? 'font-medium text-black' : 'text-zinc-400'}`}>{label}</span>
          </div>
          {i < steps.length - 1 && <div className="mx-1.5 h-px flex-1 bg-zinc-200" />}
        </div>
      ))}
    </div>
  )
}

function ProgressBar({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="mt-5">
      <div className="mb-1.5 flex items-center justify-between text-[11px]">
        <span className="text-zinc-500">{label}</span>
        <span className="font-semibold text-black">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
        <div className="h-full rounded-full bg-black" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function SocialIcon({ type }: { type: 'facebook' | 'x' | 'instagram' | 'linkedin' }) {
  const paths: Record<string, ReactNode> = {
    facebook: (
      <path d="M13.5 9H15V6.5h-1.75C11.6 6.5 10.5 7.6 10.5 9.25V11H9v2.5h1.5V19H13v-5.5h1.75L15 11h-2v-1.25c0-.4.1-.75.5-.75Z" />
    ),
    x: <path d="M6 6l12 12M18 6L6 18" strokeWidth="1.6" stroke="currentColor" fill="none" strokeLinecap="round" />,
    instagram: (
      <>
        <rect x="5" y="5" width="14" height="14" rx="4" stroke="currentColor" strokeWidth="1.6" fill="none" />
        <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.6" fill="none" />
        <circle cx="16.2" cy="7.8" r="0.9" fill="currentColor" />
      </>
    ),
    linkedin: (
      <>
        <rect x="5" y="9.5" width="2.6" height="8.5" fill="currentColor" />
        <circle cx="6.3" cy="6.3" r="1.5" fill="currentColor" />
        <path d="M10.5 9.5h2.5v1.3c.5-.9 1.5-1.5 2.8-1.5 2.2 0 3.2 1.4 3.2 4v4.7h-2.6v-4.2c0-1.1-.4-1.9-1.5-1.9-.8 0-1.3.6-1.5 1.1-.1.2-.1.5-.1.8v4.2h-2.6c0-.1.1-7.6 0-8.5Z" />
      </>
    ),
  }
  return (
    <a
      href="#"
      aria-label={type}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-colors hover:bg-black hover:text-white"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        {paths[type]}
      </svg>
    </a>
  )
}

const FEATURES_LARGE = [
  {
    icon: Sparkles,
    name: 'AI-Powered Classification',
    description: 'Google Gemini reads every complaint and classifies category, urgency, and priority in seconds.',
    mockup: <MiniBarList />,
  },
  {
    icon: ShieldCheck,
    name: 'Ground-Truth Validation',
    description: 'A pure rule-based engine cross-checks the AI against 105 policy rules -- no hallucinated resolutions.',
    mockup: <MiniLineChart />,
  },
]

const TESTIMONIALS = [
  {
    quote:
      'My flight was delayed by six hours and I expected weeks of back-and-forth. SupportNova flagged it as urgent immediately and I had a resolution the next morning.',
    name: 'Ahmed Khan',
    role: 'Lahore',
  },
  {
    quote:
      'I could actually see my complaint move through each stage instead of just waiting for an email. That transparency alone made the whole thing less stressful.',
    name: 'Sara Malik',
    role: 'Karachi',
  },
  {
    quote:
      'A hotel booking issue that usually takes forever to sort out was routed to the right agent and resolved within a day. Genuinely impressed.',
    name: 'Usman Raza',
    role: 'Islamabad',
  },
]

const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    tagline: 'For individual travelers or small support teams',
    monthly: 0,
    yearly: 0,
    highlighted: false,
    features: ['Up to 20 complaints / month', 'Email support', 'Basic status tracking', 'Community help center'],
  },
  {
    key: 'professional',
    name: 'Professional',
    tagline: 'For growing support teams',
    monthly: 49,
    yearly: 39,
    highlighted: true,
    features: [
      'Unlimited complaints',
      'Dual AI + rule-based validation',
      'Priority SLA tracking',
      'Role-based dashboards',
      'Priority email & chat support',
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    tagline: 'For large travel companies',
    monthly: null,
    yearly: null,
    highlighted: false,
    features: [
      'Dedicated account manager',
      'Custom SLA agreements',
      'Advanced audit & compliance',
      'SSO & custom integrations',
      '24/7 phone support',
    ],
  },
] as const

export function LandingPage() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [activeTestimonial, setActiveTestimonial] = useState(0)

  const handleSubscribe = (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubscribed(true)
  }

  const scrollToSection = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    setMobileMenuOpen(false)
    const el = document.getElementById(id)
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET
    window.scrollTo({ top, behavior: 'smooth' })
  }

  return (
    <div id="top" className="min-h-screen bg-white font-sans text-black">
      {/* 1. Navbar */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <a href="#top" onClick={scrollToSection('top')}>
            <Logo />
          </a>
          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={`#${link.id}`}
                onClick={scrollToSection(link.id)}
                className="text-sm font-medium text-zinc-600 hover:text-black"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <PillButton to="/register" variant="primary" className="hidden sm:inline-flex">
              Submit a Complaint <ArrowRight className="h-3.5 w-3.5" />
            </PillButton>
            <button
              className="text-zinc-500 md:hidden"
              aria-label="Toggle menu"
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-zinc-200 bg-white px-6 py-4 md:hidden">
            <nav className="flex flex-col gap-3">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={`#${link.id}`}
                  onClick={scrollToSection(link.id)}
                  className="text-sm font-medium text-zinc-600 hover:text-black"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <PillButton to="/register" variant="primary" className="mt-4 w-full">
              Submit a Complaint <ArrowRight className="h-3.5 w-3.5" />
            </PillButton>
          </div>
        )}
      </header>

      {/* 2. Hero */}
      <section className="relative overflow-hidden bg-white px-6 pb-20 pt-36">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[420px] opacity-70 [-webkit-mask-image:radial-gradient(ellipse_60%_55%_at_50%_35%,black,transparent)] [mask-image:radial-gradient(ellipse_60%_55%_at_50%_35%,black,transparent)]"
          style={{ backgroundImage: 'radial-gradient(circle, #e4e4e7 1px, transparent 1px)', backgroundSize: '22px 22px' }}
        />

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h1 className="text-[38px] font-bold leading-[1.1] tracking-tight text-black sm:text-[46px] md:text-[52px]">
            Resolve Complaints Faster with
            <br />
            Intelligent AI Analysis
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed text-zinc-500">
            SupportNova processes your travel complaints through dual AI pipelines -- giving you faster
            resolutions, transparent tracking, and guaranteed policy-backed responses.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <PillButton to="/register" variant="primary" className="px-7 py-3.5">
              Submit a Complaint
            </PillButton>
            <PillButton to="/login" variant="outline" className="px-7 py-3.5">
              Track My Complaint <ArrowDown className="h-3.5 w-3.5" />
            </PillButton>
          </div>
        </div>

        {/* Bento grid */}
        <div className="relative z-10 mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3 md:grid-rows-2">
          {/* Card 1: New Complaint mock form -- tall, spans both rows */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-zinc-400 md:col-span-1 md:row-span-2">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[13px] font-semibold text-black">New Complaint</p>
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100">
                <FileText className="h-3.5 w-3.5 text-zinc-500" />
              </span>
            </div>
            <div className="space-y-2.5">
              <div className="h-2 w-2/3 rounded-full bg-zinc-100" />
              <div className="h-8 rounded-md border border-zinc-200 bg-zinc-50" />
              <div className="h-2 w-1/2 rounded-full bg-zinc-100" />
              <div className="h-16 rounded-md border border-zinc-200 bg-zinc-50" />
              <div className="h-2 w-2/5 rounded-full bg-zinc-100" />
              <div className="h-8 rounded-md border border-zinc-200 bg-zinc-50" />
              <div className="mt-3 flex h-9 items-center justify-center rounded-md bg-black text-[12px] font-medium text-white">
                Submit Complaint
              </div>
            </div>
          </div>

          {/* Card 2: 98% resolution rate -- soft tinted accent */}
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-5 transition-colors hover:border-blue-300 md:col-start-2 md:row-start-1">
            <p className="text-[40px] font-extrabold leading-none tracking-tight text-black">98%</p>
            <p className="mt-2 text-[13px] text-zinc-600">Resolution rate</p>
          </div>

          {/* Card 3: Dual Pipeline -- dark card */}
          <div className="rounded-lg border border-zinc-800 bg-black p-5 transition-colors hover:border-zinc-600 md:col-start-3 md:row-start-1">
            <p className="mb-3 text-[13px] font-semibold text-white">Dual Pipeline</p>
            <div className="flex items-center gap-2">
              <div className="flex h-9 flex-1 items-center justify-center rounded-md bg-white/10">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="flex h-9 flex-1 items-center justify-center rounded-md bg-white/10">
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>

          {/* Card 4: 2,400+ complaints resolved */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-zinc-400 md:col-start-2 md:row-start-2">
            <p className="text-[26px] font-extrabold tracking-tight text-black">2,400+</p>
            <p className="mt-1 text-[13px] text-zinc-500">Complaints Resolved</p>
          </div>

          {/* Card 5: 24/7 support -- avatar group */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-zinc-400 md:col-start-3 md:row-start-2">
            <p className="mb-3 text-[13px] font-semibold text-black">24/7 Support</p>
            <div className="flex -space-x-2">
              {[12, 32, 47, 5].map((n) => (
                <img key={n} src={avatar(n, 40)} alt="" className="h-7 w-7 rounded-full ring-2 ring-white" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Stats Strip */}
      <section className="border-t border-zinc-200 bg-white px-6 py-20">
        <div className="mx-auto grid max-w-5xl grid-cols-1 divide-y divide-zinc-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            { value: '530+', l1: 'Real complaints', l2: 'sourced across 10 departments' },
            { value: '10', l1: 'Specialized teams', l2: 'each owning a domain' },
            { value: '22', l1: 'Policy documents', l2: 'powering every resolution' },
          ].map((stat) => (
            <div key={stat.value} className="flex flex-col items-center py-8 text-center sm:py-0">
              <p className="text-[56px] font-extrabold leading-none tracking-tight text-black sm:text-[72px]">
                {stat.value}
              </p>
              <p className="mt-3 text-[14px] leading-snug text-zinc-500">
                {stat.l1}
                <br />
                {stat.l2}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Features */}
      <section id="features" className="bg-white px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <SectionHeading
            title={
              <>
                Features Built for
                <br />
                Travel Complaints
              </>
            }
            subtext="Each complaint goes through two independent pipelines -- AI analysis and rule-based validation -- so every resolution is accurate and policy-backed."
          />

          {/* Row 1: two large cards */}
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            {FEATURES_LARGE.map((feature) => (
              <div
                key={feature.name}
                className="flex min-h-72 flex-col rounded-lg border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-400"
              >
                <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100">
                  <feature.icon className="h-4.5 w-4.5 text-black" strokeWidth={2} />
                </span>
                <h3 className="text-[16px] font-semibold text-black">{feature.name}</h3>
                <p className="mt-1.5 text-[14px] text-zinc-500">{feature.description}</p>
                <div className="mt-auto">{feature.mockup}</div>
              </div>
            ))}
          </div>

          {/* Row 2: three small cards */}
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="flex min-h-56 flex-col rounded-lg border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-400">
              <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100">
                <Activity className="h-4.5 w-4.5 text-black" strokeWidth={2} />
              </span>
              <h3 className="text-[16px] font-semibold text-black">Real-Time Status Tracking</h3>
              <p className="mt-1.5 text-[14px] text-zinc-500">Watch your complaint move through every stage live.</p>
              <div className="mt-auto">
                <MiniTimeline />
              </div>
            </div>

            <div className="flex min-h-56 flex-col rounded-lg border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-400">
              <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100">
                <Users className="h-4.5 w-4.5 text-black" strokeWidth={2} />
              </span>
              <h3 className="text-[16px] font-semibold text-black">Role-Based Resolution</h3>
              <p className="mt-1.5 text-[14px] text-zinc-500">Complaints route straight to the right specialist.</p>
              <div className="mt-auto">
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {[15, 22, 8].map((n) => (
                      <img key={n} src={avatar(n, 40)} alt="" className="h-7 w-7 rounded-full ring-2 ring-white" />
                    ))}
                  </div>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-medium text-zinc-600">
                    Routed to Ticketing Dept
                  </span>
                </div>
              </div>
            </div>

            <div className="flex min-h-56 flex-col rounded-lg border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-400">
              <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100">
                <FileCheck className="h-4.5 w-4.5 text-black" strokeWidth={2} />
              </span>
              <h3 className="text-[16px] font-semibold text-black">Policy-Backed Answers</h3>
              <p className="mt-1.5 text-[14px] text-zinc-500">Every resolution cites a real, verifiable policy.</p>
              <div className="mt-auto space-y-2 rounded-md border border-zinc-200 bg-zinc-50 p-3">
                <div className="h-1.5 w-5/6 rounded-full bg-zinc-200" />
                <div className="h-1.5 w-full rounded-full bg-zinc-200" />
                <div className="h-1.5 w-2/3 rounded-full bg-zinc-200" />
                <div className="flex items-center gap-1.5 pt-1 text-[11px] font-medium text-emerald-600">
                  <Check className="h-3 w-3" /> Refund Policy verified
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. How It Works */}
      <section id="how-it-works" className="border-t border-zinc-200 bg-white px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-[32px] font-bold tracking-tight text-black md:text-[36px]">
              Get resolved in 3 simple steps
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] text-zinc-500">
              From the moment you submit to the moment it's resolved -- fully tracked, every step of the way.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <p className="mb-2 text-[13px] text-zinc-400">Step 1</p>
              <div className="flex h-full flex-col rounded-lg border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-400">
                <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100">
                  <FileText className="h-4.5 w-4.5 text-black" strokeWidth={2} />
                </span>
                <h3 className="text-[16px] font-semibold text-black">Submit Your Complaint</h3>
                <p className="mt-1.5 text-[14px] text-zinc-500">
                  Tell us what happened through the web form, chat, email, or a document upload.
                </p>
                <div className="mt-5 space-y-3">
                  <div className="flex h-9 items-center justify-center gap-2 rounded-md border border-zinc-200 text-[12px] font-medium text-zinc-600">
                    <span className="h-3.5 w-3.5 rounded-full bg-zinc-300" /> Continue with Google
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                    <span className="h-px flex-1 bg-zinc-200" /> or <span className="h-px flex-1 bg-zinc-200" />
                  </div>
                  <div className="h-9 rounded-md border border-zinc-200 bg-zinc-50" />
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[13px] text-zinc-400">Step 2</p>
              <div className="flex h-full flex-col rounded-lg border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-400">
                <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100">
                  <Cog className="h-4.5 w-4.5 text-black" strokeWidth={2} />
                </span>
                <h3 className="text-[16px] font-semibold text-black">AI Analyzes & Routes</h3>
                <p className="mt-1.5 text-[14px] text-zinc-500">
                  Dual pipelines classify severity and route it to the right department automatically.
                </p>
                <div className="mt-5 flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-[12px] font-medium text-zinc-600">
                  <Cog className="h-3.5 w-3.5 animate-spin text-zinc-400" />
                  Analyzing complaint...
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[13px] text-zinc-400">Step 3</p>
              <div className="flex h-full flex-col rounded-lg border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-400">
                <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100">
                  <CheckCircle2 className="h-4.5 w-4.5 text-black" strokeWidth={2} />
                </span>
                <h3 className="text-[16px] font-semibold text-black">Agent Resolves & Updates</h3>
                <p className="mt-1.5 text-[14px] text-zinc-500">
                  A specialist resolves your case and keeps you updated at every step.
                </p>
                <ProgressBar pct={80} label="Resolution Progress" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Pricing */}
      <section id="pricing" className="border-t border-zinc-200 bg-white px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-[32px] font-bold tracking-tight text-black md:text-[36px]">
              Simple, transparent pricing
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] text-zinc-500">
              Choose the plan that fits your complaint volume -- upgrade any time as you grow.
            </p>

            <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-zinc-200 p-1">
              <button
                onClick={() => setBilling('monthly')}
                className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
                  billing === 'monthly' ? 'bg-black text-white' : 'text-zinc-500'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling('yearly')}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
                  billing === 'yearly' ? 'bg-black text-white' : 'text-zinc-500'
                }`}
              >
                Yearly
                <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {PLANS.map((plan) => {
              const price = plan.monthly === null ? null : billing === 'monthly' ? plan.monthly : plan.yearly
              return (
                <div
                  key={plan.key}
                  className={`relative flex flex-col rounded-lg border p-6 transition-colors ${
                    plan.highlighted ? 'border-black bg-zinc-50' : 'border-zinc-200 bg-white hover:border-zinc-400'
                  }`}
                >
                  {plan.highlighted && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-black px-3 py-1 text-[11px] font-semibold text-white">
                      Most Popular
                    </span>
                  )}
                  <h3 className="text-[17px] font-semibold text-black">{plan.name}</h3>
                  <p className="mt-1 text-[13px] text-zinc-500">{plan.tagline}</p>

                  <div className="mt-5">
                    {price === null ? (
                      <p className="text-[32px] font-extrabold tracking-tight text-black">Custom</p>
                    ) : (
                      <p className="text-[32px] font-extrabold tracking-tight text-black">
                        ${price}
                        <span className="text-[14px] font-medium text-zinc-400">/mo</span>
                      </p>
                    )}
                  </div>

                  <ul className="mt-5 flex-1 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-[13px] text-zinc-600">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-black" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <PillButton
                    to="/register"
                    variant={plan.highlighted ? 'primary' : 'outline'}
                    className="mt-6 w-full"
                  >
                    {plan.key === 'enterprise' ? 'Contact Sales' : 'Get Started'}
                  </PillButton>
                </div>
              )
            })}
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-lg bg-black px-6 py-6 sm:flex-row">
            <div>
              <p className="text-[15px] font-semibold text-white">Need a custom solution?</p>
              <p className="mt-0.5 text-[13px] text-zinc-400">
                We tailor plans to match your complaint volume and scale.
              </p>
            </div>
            <PillButton variant="inverse" href="#footer" onClick={scrollToSection('footer')} className="shrink-0">
              Contact Us
            </PillButton>
          </div>
        </div>
      </section>

      {/* 7. Testimonials */}
      <section className="border-t border-zinc-200 bg-white px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <SectionHeading
            title="What Travelers Say"
            subtext="Real feedback from travelers who got their complaints resolved fast."
          />

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={t.name}
                className={`rounded-lg border bg-white p-6 transition-colors ${
                  activeTestimonial === i ? 'border-black' : 'border-zinc-200'
                }`}
              >
                <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100">
                  <Quote className="h-4 w-4 text-black" />
                </span>
                <p className="text-[14px] leading-relaxed text-zinc-700">{t.quote}</p>
                <p className="mt-4 text-[14px] font-semibold text-black">{t.name}</p>
                <p className="text-[13px] text-zinc-400">{t.role}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-between">
            <div className="flex gap-2">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Show testimonial ${i + 1}`}
                  onClick={() => setActiveTestimonial(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    activeTestimonial === i ? 'w-6 bg-black' : 'w-1.5 bg-zinc-300'
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                aria-label="Previous testimonial"
                onClick={() => setActiveTestimonial((i) => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                aria-label="Next testimonial"
                onClick={() => setActiveTestimonial((i) => (i + 1) % TESTIMONIALS.length)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 8. CTA Banner */}
      <section className="bg-black px-6 py-24 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-[32px] font-bold leading-tight tracking-tight text-white md:text-[40px]">
            Ready to resolve your complaint?
          </h2>
          <p className="mt-4 text-[15px] text-zinc-400">
            Join thousands of travelers who get faster, transparent, policy-backed resolutions.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <PillButton to="/register" variant="inverse" className="px-7 py-3.5">
              Submit a Complaint
            </PillButton>
            <PillButton
              href="#features"
              onClick={scrollToSection('features')}
              variant="outlineInverse"
              className="px-7 py-3.5"
            >
              Learn More <ArrowDown className="h-3.5 w-3.5" />
            </PillButton>
          </div>
        </div>
      </section>

      {/* 9. Footer */}
      <footer id="footer" className="border-t border-zinc-200 bg-white px-6 py-16">
        <div className="mx-auto max-w-5xl">
          {/* Tier 1 */}
          <div className="grid grid-cols-1 gap-10 border-b border-zinc-200 pb-12 md:grid-cols-2">
            <div>
              <Logo />
              <p className="mt-3 max-w-[260px] text-[13px] text-zinc-500">
                AI-powered complaint resolution for TravelNova customers.
              </p>
              {subscribed ? (
                <p className="mt-4 text-[13px] font-medium text-black">Thanks for subscribing!</p>
              ) : (
                <form onSubmit={handleSubscribe} className="mt-4 flex max-w-[280px] gap-2">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email"
                    className="h-9 min-w-0 flex-1 rounded-md border border-zinc-200 px-3 text-[13px] focus:border-zinc-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="h-9 shrink-0 rounded-md bg-black px-3 text-[13px] font-medium text-white hover:bg-zinc-800"
                  >
                    Subscribe
                  </button>
                </form>
              )}
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                <div>
                  <p className="text-[12px] text-zinc-400">Location</p>
                  <p className="text-[13px] font-medium text-black">Karachi, Pakistan</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                <div>
                  <p className="text-[12px] text-zinc-400">Email</p>
                  <p className="text-[13px] font-medium text-black">support@travelnova.com</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                <div>
                  <p className="text-[12px] text-zinc-400">Working Hours</p>
                  <p className="text-[13px] font-medium text-black">Mon–Sat, 9am–9pm PKT</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tier 2 */}
          <div className="grid grid-cols-2 gap-8 pt-12 sm:grid-cols-4">
            <div>
              <p className="mb-3 text-[13px] font-semibold text-black">Products</p>
              <ul className="space-y-2 text-[13px] text-zinc-500">
                <li><Link to="/register" className="hover:text-black">Complaint Portal</Link></li>
                <li><Link to="/login" className="hover:text-black">Track Status</Link></li>
                <li><Link to="/login" className="hover:text-black">Agent Login</Link></li>
                <li><Link to="/login" className="hover:text-black">Admin Panel</Link></li>
              </ul>
            </div>

            <div>
              <p className="mb-3 text-[13px] font-semibold text-black">Support</p>
              <ul className="space-y-2 text-[13px] text-zinc-500">
                <li><a href="#" className="hover:text-black">FAQ</a></li>
                <li><a href="#" className="hover:text-black">Contact Us</a></li>
                <li><a href="#" className="hover:text-black">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-black">Terms</a></li>
              </ul>
            </div>

            <div>
              <p className="mb-3 text-[13px] font-semibold text-black">Company</p>
              <ul className="space-y-2 text-[13px] text-zinc-500">
                <li><a href="#" className="hover:text-black">About</a></li>
                <li><a href="#" className="hover:text-black">Careers</a></li>
                <li><a href="#" className="hover:text-black">Blog</a></li>
              </ul>
            </div>

            <div>
              <p className="mb-3 text-[13px] font-semibold text-black">Social</p>
              <div className="flex gap-2">
                <SocialIcon type="facebook" />
                <SocialIcon type="x" />
                <SocialIcon type="instagram" />
                <SocialIcon type="linkedin" />
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-8 flex max-w-5xl flex-col items-center justify-between gap-3 border-t border-zinc-200 pt-8 text-xs text-zinc-400 sm:flex-row">
          <p>© 2026 TravelNova. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-black">Terms of Service</a>
            <a href="#" className="hover:text-black">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
