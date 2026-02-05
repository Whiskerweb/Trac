'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Building2, Shield, CreditCard, Clock, Users, AlertTriangle, Scale, Gavel, RefreshCw, Mail, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'

const sections = [
    { id: 'eligibility', title: 'Eligibility & Workspace', icon: Building2 },
    { id: 'obligations', title: 'Startup Obligations', icon: Shield },
    { id: 'programs', title: 'Program Management', icon: Users },
    { id: 'fees', title: 'Fees & Payment Obligations', icon: CreditCard },
    { id: 'commissions', title: 'Commission Responsibilities', icon: Clock },
    { id: 'tracking', title: 'Tracking & Attribution', icon: RefreshCw },
    { id: 'sellers', title: 'Seller Management', icon: Users },
    { id: 'prohibited', title: 'Prohibited Activities', icon: AlertTriangle },
    { id: 'termination', title: 'Termination & Effects', icon: Gavel },
    { id: 'liability', title: 'Liability & Indemnification', icon: Scale },
    { id: 'contact', title: 'Contact', icon: Mail },
]

export default function StartupTermsPage() {
    const [activeSection, setActiveSection] = useState('eligibility')
    const [scrollProgress, setScrollProgress] = useState(0)

    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY
            const docHeight = document.documentElement.scrollHeight - window.innerHeight
            setScrollProgress((scrollTop / docHeight) * 100)

            const sectionElements = sections.map(s => document.getElementById(s.id))
            const scrollPosition = scrollTop + 200

            for (let i = sectionElements.length - 1; i >= 0; i--) {
                const el = sectionElements[i]
                if (el && el.offsetTop <= scrollPosition) {
                    setActiveSection(sections[i].id)
                    break
                }
            }
        }

        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const scrollToSection = (id: string) => {
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA] text-slate-900 selection:bg-blue-500/20">
            <div className="fixed inset-0 pointer-events-none opacity-40">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-blue-100/50 to-transparent rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-slate-100/50 to-transparent rounded-full blur-3xl" />
            </div>

            <div className="fixed top-0 left-0 right-0 h-[3px] bg-slate-200/50 z-50">
                <div className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 transition-all duration-150" style={{ width: `${scrollProgress}%` }} />
            </div>

            <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span>Back to Traaaction</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <Image src="/Logotrac/Logo5.png" alt="Traaaction" width={24} height={24} className="rounded-md" />
                        <span className="text-sm font-medium text-slate-500">Legal</span>
                    </div>
                </div>
            </header>

            <div className="pt-20 flex">
                <aside className="hidden lg:block fixed left-0 top-20 bottom-0 w-72 bg-white/50 backdrop-blur-sm border-r border-slate-200/50 overflow-y-auto">
                    <div className="p-6 pt-12">
                        <div className="text-xs uppercase tracking-widest text-slate-400 mb-6 font-medium">Table of Contents</div>
                        <nav className="space-y-1">
                            {sections.map((section, index) => {
                                const isActive = activeSection === section.id
                                return (
                                    <button
                                        key={section.id}
                                        onClick={() => scrollToSection(section.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 group ${isActive ? 'bg-blue-50 text-blue-900' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
                                    >
                                        <span className={`flex items-center justify-center w-6 h-6 rounded-md text-xs font-mono transition-colors ${isActive ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:text-slate-500'}`}>
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                        <span className="text-sm truncate">{section.title}</span>
                                        {isActive && <ChevronRight className="w-3 h-3 ml-auto text-blue-500" />}
                                    </button>
                                )
                            })}
                        </nav>
                    </div>
                </aside>

                <main className="flex-1 lg:ml-72">
                    <div className="px-6 lg:px-16 pt-16 pb-20 bg-white border-b border-slate-200/50">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium mb-8">
                                <Building2 className="w-3 h-3" />
                                Startup Agreement
                            </div>
                            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
                                Startup
                                <span className="block text-slate-300">Terms</span>
                            </h1>
                            <p className="text-lg text-slate-500 leading-relaxed max-w-xl mb-8">
                                These terms govern your use of Traaaction as a Startup creating and managing affiliate programs. They define your obligations toward Sellers and the platform.
                            </p>
                            <div className="flex items-center gap-4 text-sm text-slate-400">
                                <span>Effective date</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                <span className="text-slate-600 font-medium">February 5, 2026</span>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 lg:px-16 py-16 space-y-24">
                        <div className="max-w-3xl">
                            <p className="text-lg text-slate-600 leading-relaxed">
                                These Startup Terms (&quot;Startup Terms&quot;) supplement the general <Link href="/terms" className="text-blue-600 hover:text-blue-700">Terms of Service</Link> and apply specifically to users who register as Startups on Traaaction. In case of conflict, these Startup Terms prevail for startup-related matters.
                            </p>
                        </div>

                        {/* 1 - Eligibility */}
                        <Section id="eligibility" number={1} title="Eligibility & Workspace">
                            <p>To use Traaaction as a Startup, you must:</p>
                            <DataList items={[
                                'Be a legally registered business entity or sole proprietorship',
                                'Provide accurate company information (name, address, registration number if applicable)',
                                'Create a Workspace with a unique slug identifier',
                                'Designate at least one Workspace Owner with full administrative rights',
                                'Have a functioning website or application where the Traaaction tracking SDK will be installed',
                            ]} className="mt-6" />
                            <InfoCard className="mt-8">
                                <p className="text-slate-600">
                                    <span className="text-slate-800 font-semibold">API Keys:</span> Upon workspace creation, you receive a public key (pk_*) for client-side tracking and a secret key (trac_live_*) for server-side operations. Secret keys are hashed and cannot be recovered — store them securely.
                                </p>
                            </InfoCard>
                        </Section>

                        {/* 2 - Obligations */}
                        <Section id="obligations" number={2} title="Startup Obligations">
                            <p>As a Startup using Traaaction, you commit to:</p>

                            <SubSection title="Program Integrity">
                                <DataList items={[
                                    'Provide accurate and truthful descriptions of your products and services',
                                    'Set fair and sustainable commission rates that you can honor',
                                    'Not retroactively reduce commission rates for already-generated conversions',
                                    'Clearly communicate program rules, restrictions, and approved promotion methods',
                                    'Respond to Seller inquiries within a reasonable timeframe',
                                ]} />
                            </SubSection>

                            <SubSection title="Financial Obligations">
                                <DataList items={[
                                    'Pay all approved commissions within the timeframe defined by these terms',
                                    'Maintain sufficient funds to cover earned commissions',
                                    'Pay the 15% platform fee on all transactions processed through Traaaction',
                                    'Not dispute legitimate commissions without valid grounds (refund, fraud, chargeback)',
                                ]} />
                            </SubSection>

                            <SubSection title="Legal & Compliance">
                                <DataList items={[
                                    'Comply with all applicable e-commerce, consumer protection, and advertising laws',
                                    'Include required affiliate disclosure notices on your website',
                                    'Install the Traaaction tracking SDK in accordance with privacy regulations (GDPR cookie consent)',
                                    'Inform your customers that affiliate tracking is in use through your privacy policy',
                                    'Process refunds fairly and in accordance with your published refund policy',
                                ]} />
                            </SubSection>
                        </Section>

                        {/* 3 - Programs */}
                        <Section id="programs" number={3} title="Program Management">
                            <p>When creating and managing affiliate programs (Missions) on Traaaction:</p>

                            <div className="grid md:grid-cols-2 gap-6 mt-8">
                                <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-white border border-blue-200">
                                    <div className="text-xs uppercase tracking-widest text-blue-600 mb-3 font-medium">Program Setup</div>
                                    <DataList items={[
                                        'Define clear reward type: Sale, Lead, or Recurring',
                                        'Set commission structure: Flat rate or Percentage',
                                        'Choose visibility: Public, Private, or Invite-Only',
                                        'Provide marketing materials and content for Sellers',
                                    ]} />
                                </div>
                                <div className="p-6 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200">
                                    <div className="text-xs uppercase tracking-widest text-slate-600 mb-3 font-medium">Program Changes</div>
                                    <DataList items={[
                                        'Commission rate changes apply only to future conversions',
                                        'Program archival requires 30 days notice to active Sellers',
                                        'You must honor pending commissions after program closure',
                                        'Seller removal requires valid justification',
                                    ]} />
                                </div>
                            </div>

                            <InfoCard variant="subtle" className="mt-6">
                                <p className="text-slate-600 text-sm">
                                    <span className="text-slate-800 font-medium">Program Status:</span> Programs can be DRAFT (not visible), ACTIVE (accepting sellers), or ARCHIVED (no new enrollments, existing commissions still honored).
                                </p>
                            </InfoCard>
                        </Section>

                        {/* 4 - Fees */}
                        <Section id="fees" number={4} title="Fees & Payment Obligations">
                            <p>Traaaction charges the following fees:</p>

                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm mt-8">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50">
                                            <th className="text-left py-4 px-5 font-medium text-slate-700">Fee</th>
                                            <th className="text-left py-4 px-5 font-medium text-slate-700">Amount</th>
                                            <th className="text-left py-4 px-5 font-medium text-slate-700">Calculation</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        <tr><td className="py-4 px-5 text-slate-800 font-medium">Platform Fee</td><td className="py-4 px-5 text-slate-600">15%</td><td className="py-4 px-5 text-slate-500">Of net amount (after Stripe fees + taxes)</td></tr>
                                        <tr><td className="py-4 px-5 text-slate-800 font-medium">Payment Processing</td><td className="py-4 px-5 text-slate-600">Stripe rates</td><td className="py-4 px-5 text-slate-500">Pass-through, deducted before commission calc</td></tr>
                                        <tr><td className="py-4 px-5 text-slate-800 font-medium">Workspace</td><td className="py-4 px-5 text-slate-600">Free</td><td className="py-4 px-5 text-slate-500">No monthly or setup fees</td></tr>
                                    </tbody>
                                </table>
                            </div>

                            <SubSection title="Payment Process">
                                <div className="grid gap-3 mt-4">
                                    {[
                                        { step: '1', desc: 'Commissions mature after the hold period (3 days for leads, 30 days for sales)' },
                                        { step: '2', desc: 'Matured commissions appear as "unpaid" in your dashboard' },
                                        { step: '3', desc: 'You select commissions to pay and initiate a batch payment via Stripe Checkout' },
                                        { step: '4', desc: 'Payment includes Seller commissions + 15% platform fee' },
                                        { step: '5', desc: 'Upon confirmation, commissions are distributed to Sellers automatically' },
                                    ].map((item) => (
                                        <div key={item.step} className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-200">
                                            <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-mono text-xs font-bold">{item.step}</span>
                                            <span className="text-slate-600 pt-0.5">{item.desc}</span>
                                        </div>
                                    ))}
                                </div>
                            </SubSection>

                            <InfoCard className="mt-8">
                                <p className="text-slate-600">
                                    <span className="text-red-600 font-semibold">Late Payment:</span> Failure to pay matured commissions within 30 days may result in account suspension, loss of access to the platform, and Sellers being notified of the payment delay. Persistent non-payment may lead to legal action.
                                </p>
                            </InfoCard>
                        </Section>

                        {/* 5 - Commission Responsibilities */}
                        <Section id="commissions" number={5} title="Commission Responsibilities">
                            <p>You are responsible for ensuring fair commission practices:</p>
                            <DataList items={[
                                'Commission rates set in a program are binding for all conversions generated under those rates',
                                'Refunds must be processed through the original payment method; Traaaction will automatically claw back affected commissions',
                                'Chargebacks trigger automatic commission reversal — you are responsible for managing disputes with your payment processor',
                                'You may not artificially delay or block legitimate conversions to avoid paying commissions',
                                'Batch payouts can only be initiated for commissions with status PROCEED (fully matured)',
                            ]} className="mt-6" />

                            <InfoCard variant="subtle" className="mt-6">
                                <p className="text-slate-600 text-sm">
                                    <span className="text-slate-800 font-medium">Dispute Resolution:</span> If you dispute a commission, you must provide evidence (refund receipt, chargeback notice, fraud documentation) within 7 days. Undisputed commissions after hold period are final.
                                </p>
                            </InfoCard>
                        </Section>

                        {/* 6 - Tracking */}
                        <Section id="tracking" number={6} title="Tracking & Attribution">
                            <p>Traaaction provides tracking infrastructure. Your responsibilities:</p>
                            <DataList items={[
                                'Install and maintain the Traaaction tracking SDK (trac.js) correctly on your website',
                                'Not interfere with, block, or manipulate tracking cookies or attribution data',
                                'Configure Stripe webhooks correctly for automatic sale attribution',
                                'Report any tracking issues promptly so they can be resolved',
                                'Maintain proper GDPR consent mechanisms for tracking cookies on your website',
                            ]} className="mt-6" />

                            <SubSection title="Attribution Model">
                                <p className="text-slate-500 mb-4">Traaaction uses a <span className="text-slate-700 font-medium">first-click attribution model</span> with a 90-day cookie window:</p>
                                <DataList items={[
                                    'The first Seller to generate a click for a customer receives attribution',
                                    'Attribution is locked to the customer record and cannot be overwritten by subsequent clicks',
                                    'Cookie window is 90 days from the initial click',
                                    'If the cookie expires, the customer can be re-attributed to a new Seller',
                                ]} />
                            </SubSection>
                        </Section>

                        {/* 7 - Seller Management */}
                        <Section id="sellers" number={7} title="Seller Management">
                            <p>You have control over which Sellers participate in your programs:</p>
                            <DataList items={[
                                'You may set program visibility to Public (open enrollment), Private (approval required), or Invite-Only',
                                'You may approve or reject Seller applications based on legitimate criteria',
                                'You may remove a Seller from your program with valid justification',
                                'You may not discriminate against Sellers based on protected characteristics',
                                'Communication with Sellers must be professional and through the platform messaging system',
                            ]} className="mt-6" />

                            <InfoCard className="mt-8">
                                <p className="text-slate-600">
                                    <span className="text-slate-800 font-semibold">Seller Removal:</span> When removing a Seller, all pending commissions must still be honored. The Seller&apos;s existing tracking links will be deactivated. You must provide a reason for removal upon request.
                                </p>
                            </InfoCard>
                        </Section>

                        {/* 8 - Prohibited */}
                        <Section id="prohibited" number={8} title="Prohibited Activities">
                            <p>As a Startup, the following are strictly prohibited:</p>
                            <div className="grid md:grid-cols-2 gap-4 mt-8">
                                {[
                                    { title: 'Commission manipulation', desc: 'Artificially reducing conversion rates, blocking valid attributions, or rejecting legitimate commissions' },
                                    { title: 'Deceptive programs', desc: 'Creating programs with unrealistic commission rates to attract Sellers with no intent to pay' },
                                    { title: 'Data misuse', desc: 'Using Seller contact information for purposes outside the platform relationship' },
                                    { title: 'Retroactive changes', desc: 'Modifying commission rates to apply to already-generated conversions' },
                                    { title: 'Payment avoidance', desc: 'Closing workspace or archiving programs to avoid paying earned commissions' },
                                    { title: 'Webhook tampering', desc: 'Modifying, delaying, or blocking Stripe webhook events to prevent commission creation' },
                                ].map((item) => (
                                    <div key={item.title} className="p-4 rounded-xl bg-red-50/50 border border-red-200/50">
                                        <div className="font-medium text-red-800 mb-1">{item.title}</div>
                                        <div className="text-sm text-red-600/70">{item.desc}</div>
                                    </div>
                                ))}
                            </div>
                        </Section>

                        {/* 9 - Termination */}
                        <Section id="termination" number={9} title="Termination & Effects">
                            <SubSection title="Voluntary Closure">
                                <DataList items={[
                                    'You may close your Workspace at any time through settings',
                                    'All matured (PROCEED) and pending (PENDING) commissions must be paid before closure is finalized',
                                    'Active Sellers will be notified 30 days before program closure',
                                    'Tracking links will be deactivated upon workspace closure',
                                ]} />
                            </SubSection>

                            <SubSection title="Termination by Traaaction">
                                <DataList items={[
                                    'Immediate suspension for fraud, non-payment, or serious policy violations',
                                    'Account termination with 30 days notice for repeated minor violations',
                                    'In case of suspension, unpaid commissions remain a financial obligation',
                                ]} />
                            </SubSection>

                            <InfoCard className="mt-8">
                                <p className="text-slate-600">
                                    <span className="text-red-600 font-semibold">Surviving Obligations:</span> Payment obligations survive termination. Traaaction reserves the right to pursue unpaid commissions through legal means, including debt collection and court proceedings under French law.
                                </p>
                            </InfoCard>
                        </Section>

                        {/* 10 - Liability */}
                        <Section id="liability" number={10} title="Liability & Indemnification">
                            <p>Important provisions regarding liability:</p>
                            <DataList items={[
                                'Traaaction provides tracking and payment infrastructure "as is" without guarantee of uninterrupted service',
                                'Traaaction is not liable for Seller actions, including misleading promotion or policy violations',
                                'Traaaction is not liable for conversion loss due to ad blockers, cookie restrictions, or browser privacy features',
                                'You indemnify Traaaction against claims arising from your products, services, or marketing practices',
                                'You indemnify Traaaction against claims from your customers related to purchases made through affiliate links',
                            ]} className="mt-6" />

                            <SubSection title="Indemnification">
                                <p className="text-slate-500">
                                    You agree to indemnify and hold harmless Traaaction, its founders, employees, and agents from any claims, damages, losses, or legal fees arising from: (a) your use of the platform, (b) your products or services, (c) your violation of these terms, (d) disputes with Sellers, or (e) claims from your customers.
                                </p>
                            </SubSection>
                        </Section>

                        {/* 11 - Contact */}
                        <Section id="contact" number={11} title="Contact">
                            <p>For questions about these Startup Terms:</p>
                            <InfoCard className="mt-6">
                                <div className="font-semibold text-slate-800 text-lg mb-3">Traaaction</div>
                                <div className="text-slate-500 space-y-1 mb-4">
                                    <p>60 rue Amiral Romain-Desfossés</p>
                                    <p>29200 Brest, France</p>
                                </div>
                                <a href="mailto:contact@traaaction.com" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors">
                                    <Mail className="w-4 h-4" />
                                    contact@traaaction.com
                                </a>
                            </InfoCard>
                        </Section>
                    </div>

                    <footer className="border-t border-slate-200 bg-white px-6 lg:px-16 py-12">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <p className="text-sm text-slate-400">&copy; {new Date().getFullYear()} Traaaction. All rights reserved.</p>
                            <div className="flex items-center gap-6">
                                <Link href="/seller-terms" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">Seller Terms</Link>
                                <Link href="/terms" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">General Terms</Link>
                                <Link href="/privacy" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">Privacy</Link>
                                <Link href="/" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">Home</Link>
                            </div>
                        </div>
                    </footer>
                </main>
            </div>
        </div>
    )
}

function Section({ id, number, title, children }: { id: string; number: number; title: string; children: React.ReactNode }) {
    return (
        <section id={id} className="scroll-mt-24 max-w-3xl">
            <div className="flex items-center gap-4 mb-6">
                <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25 flex items-center justify-center text-white font-mono text-sm font-bold">
                    {String(number).padStart(2, '0')}
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{title}</h2>
            </div>
            <div className="text-slate-600 leading-relaxed space-y-4">{children}</div>
        </section>
    )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mt-8">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">{title}</h3>
            {children}
        </div>
    )
}

function InfoCard({ children, variant = 'default', className = '' }: { children: React.ReactNode; variant?: 'default' | 'subtle'; className?: string }) {
    return (
        <div className={`${variant === 'subtle' ? 'p-4 rounded-xl bg-slate-50 border border-slate-100' : 'p-6 rounded-xl bg-white border border-slate-200 shadow-sm'} ${className}`}>
            {children}
        </div>
    )
}

function DataList({ items, className = '' }: { items: string[]; className?: string }) {
    return (
        <ul className={`space-y-2 ${className}`}>
            {items.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500 mt-2" />
                    <span className="text-slate-500">{item}</span>
                </li>
            ))}
        </ul>
    )
}
