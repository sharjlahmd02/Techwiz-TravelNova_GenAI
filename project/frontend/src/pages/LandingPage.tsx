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
  Cpu,
  CheckCircle2,
  Star,
  Menu,
} from 'lucide-react'

// Inter is already loaded globally (see index.css) and set as the default
// sans font in tailwind.config.js -- no separate font import needed here.

const NAV_LINKS = [
  { label: 'Home', href: '#top' },
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#cta' },
  { label: 'Help', href: '#footer' },
]

const FEATURES = [
  {
    icon: Sparkles,
    name: 'AI-Powered Classification',
    description:
      'Google Gemini reads every complaint and classifies category, urgency, and priority in seconds.',
  },
  {
    icon: ShieldCheck,
    name: 'Ground-Truth Validation',
    description:
      'A pure rule-based engine cross-checks the AI against 105 policy rules -- no hallucinated resolutions.',
  },
  {
    icon: Activity,
    name: 'Real-Time Status Tracking',
    description: 'Watch your complaint move from submitted to resolved with a live status timeline.',
  },
  {
    icon: Users,
    name: 'Role-Based Resolution',
    description: 'Complaints route straight to the right department agent -- no manual triage needed.',
  },
]

const STEPS = [
  {
    step: 'Step 1',
    icon: FileText,
    title: 'Submit Your Complaint',
    description: 'Tell us what happened through the web form, chat, email, or a document upload.',
  },
  {
    step: 'Step 2',
    icon: Cpu,
    title: 'AI Analyzes & Routes',
    description: 'Dual pipelines classify severity and route it to the right department automatically.',
  },
  {
    step: 'Step 3',
    icon: CheckCircle2,
    title: 'Agent Resolves & Updates',
    description: 'A specialist resolves your case and keeps you updated at every step.',
  },
]

const TESTIMONIALS = [
  {
    quote:
      "My flight was delayed by six hours and I expected weeks of back-and-forth. SupportNova flagged it as urgent immediately and I had a resolution the next morning.",
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

function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-black text-white">
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
  className = '',
}: {
  children: ReactNode
  variant?: 'primary' | 'outline' | 'inverse' | 'outlineInverse'
  to?: string
  href?: string
  className?: string
}) {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-full px-6 py-3 text-[14px] font-medium transition-colors'
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
    <a href={href ?? '#'} className={classes}>
      {children}
    </a>
  )
}

function SectionHeading({
  eyebrow,
  title,
  subtext,
}: {
  eyebrow?: string
  title: ReactNode
  subtext?: ReactNode
}) {
  return (
    <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
      <div>
        {eyebrow && <p className="mb-2 text-[13px] font-medium text-zinc-400">{eyebrow}</p>}
        <h2 className="text-[32px] font-bold leading-tight tracking-tight text-black md:text-[36px]">{title}</h2>
      </div>
      {subtext && <p className="max-w-sm text-[15px] text-zinc-500 md:text-right">{subtext}</p>}
    </div>
  )
}

export function LandingPage() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSubscribe = (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubscribed(true)
  }

  return (
    <div id="top" className="min-h-screen scroll-smooth bg-white font-sans text-black">
      {/* 1. Navbar */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Logo />
          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.label} href={link.href} className="text-[14px] text-zinc-600 hover:text-black">
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
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-zinc-200 bg-white px-6 py-4 md:hidden">
            <nav className="flex flex-col gap-3">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-[14px] text-zinc-600 hover:text-black"
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
      <section className="bg-white px-6 pt-20 pb-24 md:pt-28">
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="text-[38px] font-bold leading-[1.1] tracking-tight text-black sm:text-[46px] md:text-[52px]">
            Resolve Complaints Faster with
            <br />
            Intelligent AI Analysis
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed text-zinc-500">
            SupportNova processes your travel complaints through dual AI pipelines -- giving you faster
            resolutions, transparent tracking, and guaranteed policy-backed responses.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <PillButton to="/register" variant="primary" className="px-7 py-3.5">
              Submit a Complaint
            </PillButton>
            <PillButton to="/login" variant="outline" className="px-7 py-3.5">
              Track My Complaint <ArrowDown className="h-3.5 w-3.5" />
            </PillButton>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Tall left card: mock complaint form */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-zinc-400 sm:row-span-2">
            <p className="mb-3 text-[13px] font-semibold text-black">New Complaint</p>
            <div className="space-y-2">
              <div className="h-2.5 w-3/4 rounded-full bg-zinc-100" />
              <div className="h-8 rounded-md border border-zinc-200 bg-zinc-50" />
              <div className="h-2.5 w-1/2 rounded-full bg-zinc-100" />
              <div className="h-16 rounded-md border border-zinc-200 bg-zinc-50" />
              <div className="h-2.5 w-2/3 rounded-full bg-zinc-100" />
              <div className="h-8 rounded-md border border-zinc-200 bg-zinc-50" />
              <div className="mt-3 h-8 w-24 rounded-full bg-black" />
            </div>
          </div>

          {/* 98% resolution rate */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-zinc-400">
            <p className="text-[34px] font-extrabold tracking-tight text-black">98%</p>
            <p className="text-[13px] text-zinc-500">Resolution rate</p>
          </div>

          {/* Dual pipeline */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-zinc-400">
            <p className="mb-3 text-[13px] font-semibold text-black">Dual Pipeline</p>
            <div className="flex items-center gap-2">
              <div className="flex h-8 flex-1 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50">
                <Sparkles className="h-3.5 w-3.5 text-zinc-400" />
              </div>
              <div className="flex h-8 flex-1 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50">
                <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" />
              </div>
            </div>
          </div>

          {/* 2,400+ complaints resolved */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-zinc-400">
            <p className="text-[20px] font-extrabold tracking-tight text-black">2,400+</p>
            <p className="text-[13px] text-zinc-500">Complaints Resolved</p>
          </div>

          {/* 24/7 support */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-zinc-400">
            <p className="mb-3 text-[13px] font-semibold text-black">24/7 Support</p>
            <div className="flex -space-x-2">
              {['bg-zinc-300', 'bg-zinc-400', 'bg-zinc-500', 'bg-zinc-600'].map((c, i) => (
                <span key={i} className={`h-6 w-6 rounded-full border-2 border-white ${c}`} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Stats Strip */}
      <section className="border-t border-zinc-200 bg-white px-6 py-20">
        <div className="mx-auto grid max-w-5xl grid-cols-1 divide-y divide-zinc-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            { value: '530+', label: 'Complaints in Dataset' },
            { value: '10', label: 'Departments' },
            { value: '22', label: 'Policy Documents' },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center py-8 text-center sm:py-0">
              <p className="text-[56px] font-extrabold leading-none tracking-tight text-black sm:text-[72px]">
                {stat.value}
              </p>
              <p className="mt-2 text-[14px] text-zinc-500">{stat.label}</p>
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

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div
                key={feature.name}
                className="rounded-lg border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-400"
              >
                <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-zinc-100">
                  <feature.icon className="h-4.5 w-4.5 text-black" strokeWidth={2} />
                </span>
                <h3 className="text-[16px] font-semibold text-black">{feature.name}</h3>
                <p className="mt-1.5 text-[14px] text-zinc-500">{feature.description}</p>
                <div className="mt-4 flex h-24 items-center justify-center rounded-md bg-zinc-100">
                  <span className="text-[11px] text-zinc-400">Screenshot preview</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. How It Works */}
      <section id="how-it-works" className="border-t border-zinc-200 bg-white px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-[32px] font-bold tracking-tight text-black md:text-[36px]">
            Get resolved in 3 simple steps
          </h2>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.title}>
                <p className="mb-2 text-[13px] text-zinc-400">{s.step}</p>
                <div className="rounded-lg border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-400">
                  <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-zinc-100">
                    <s.icon className="h-4.5 w-4.5 text-black" strokeWidth={2} />
                  </span>
                  <h3 className="text-[16px] font-semibold text-black">{s.title}</h3>
                  <p className="mt-1.5 text-[14px] text-zinc-500">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Testimonials */}
      <section className="border-t border-zinc-200 bg-white px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <SectionHeading
            title="What Travelers Say"
            subtext="Real feedback from customers who got their travel issues resolved fast."
          />

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-lg border border-zinc-200 bg-white p-6">
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-black text-black" />
                  ))}
                </div>
                <p className="text-[14px] leading-relaxed text-zinc-700">&ldquo;{t.quote}&rdquo;</p>
                <p className="mt-4 text-[14px] font-semibold text-black">{t.name}</p>
                <p className="text-[13px] text-zinc-400">{t.role}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === 0 ? 'bg-black' : 'bg-zinc-300'}`} />
            ))}
          </div>
        </div>
      </section>

      {/* 7. CTA Banner */}
      <section id="cta" className="bg-black px-6 py-24 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-[32px] font-bold leading-tight tracking-tight text-white md:text-[40px]">
            Ready to resolve your complaint?
          </h2>
          <p className="mt-4 text-[15px] text-zinc-400">
            Join thousands of travelers who get faster, transparent, policy-backed resolutions.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <PillButton to="/register" variant="inverse" className="px-7 py-3.5">
              Submit a Complaint
            </PillButton>
            <PillButton href="#features" variant="outlineInverse" className="px-7 py-3.5">
              Learn More <ArrowDown className="h-3.5 w-3.5" />
            </PillButton>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer id="footer" className="border-t border-zinc-200 bg-white px-6 py-16">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-3 max-w-[220px] text-[13px] text-zinc-500">
              AI-powered complaint resolution for TravelNova customers.
            </p>
            {subscribed ? (
              <p className="mt-4 text-[13px] font-medium text-black">Thanks for subscribing!</p>
            ) : (
              <form onSubmit={handleSubscribe} className="mt-4 flex max-w-[240px] gap-2">
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
            <p className="mb-3 text-[13px] font-semibold text-black">Contact</p>
            <ul className="space-y-2 text-[13px] text-zinc-500">
              <li>Karachi, Pakistan</li>
              <li>support@travelnova.com</li>
              <li>Mon–Sat, 9am–9pm PKT</li>
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-12 flex max-w-5xl flex-col items-center justify-between gap-3 border-t border-zinc-200 pt-6 text-[13px] text-zinc-400 sm:flex-row">
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
