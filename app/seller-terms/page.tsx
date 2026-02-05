'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, UserCheck, Shield, CreditCard, Ban, AlertTriangle, Scale, Gavel, Clock, Mail, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'

const sections = [
    { id: 'eligibility', title: 'Eligibility & Account', icon: UserCheck },
    { id: 'obligations', title: 'Seller Obligations', icon: Shield },
    { id: 'commissions', title: 'Commissions & Payouts', icon: CreditCard },
    { id: 'hold-periods', title: 'Hold Periods & Clawbacks', icon: Clock },
    { id: 'prohibited', title: 'Prohibited Activities', icon: Ban },
    { id: 'fraud', title: 'Fraud & Detection', icon: AlertTriangle },
    { id: 'termination', title: 'Termination & Suspension', icon: Gavel },
    { id: 'liability', title: 'Liability & Disclaimers', icon: Scale },
    { id: 'contact', title: 'Contact', icon: Mail },
]

export default function SellerTermsPage() {
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
        <div className="min-h-screen bg-[#FAFAFA] text-slate-900 selection:bg-emerald-500/20">
            <div className="fixed inset-0 pointer-events-none opacity-40">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-emerald-100/50 to-transparent rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-slate-100/50 to-transparent rounded-full blur-3xl" />
            </div>

            <div className="fixed top-0 left-0 right-0 h-[3px] bg-slate-200/50 z-50">
                <div className="h-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 transition-all duration-150" style={{ width: `${scrollProgress}%` }} />
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
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 group ${isActive ? 'bg-emerald-50 text-emerald-900' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
                                    >
                                        <span className={`flex items-center justify-center w-6 h-6 rounded-md text-xs font-mono transition-colors ${isActive ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:text-slate-500'}`}>
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                        <span className="text-sm truncate">{section.title}</span>
                                        {isActive && <ChevronRight className="w-3 h-3 ml-auto text-emerald-500" />}
                                    </button>
                                )
                            })}
                        </nav>
                    </div>
                </aside>

                <main className="flex-1 lg:ml-72">
                    <div className="px-6 lg:px-16 pt-16 pb-20 bg-white border-b border-slate-200/50">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium mb-8">
                                <UserCheck className="w-3 h-3" />
                                Seller Agreement
                            </div>
                            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
                                Seller
                                <span className="block text-slate-300">Terms</span>
                            </h1>
                            <p className="text-lg text-slate-500 leading-relaxed max-w-xl mb-8">
                                These terms govern your participation as a Seller (affiliate) on the Traaaction platform. Please read them carefully before joining any program.
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
                                These Seller Terms (&quot;Seller Terms&quot;) supplement the general <Link href="/terms" className="text-emerald-600 hover:text-emerald-700">Terms of Service</Link> and apply specifically to users who register as Sellers on Traaaction. In case of conflict, these Seller Terms prevail for seller-related matters.
                            </p>
                        </div>

                        {/* 1 - Eligibility */}
                        <Section id="eligibility" number={1} title="Eligibility & Account">
                            <p>To participate as a Seller on Traaaction, you must:</p>
                            <DataList items={[
                                'Be at least 18 years old and legally capable of entering into contracts',
                                'Provide accurate personal information (name, email, country of residence)',
                                'Complete the onboarding process including profile setup',
                                'Set up a valid payout method (Stripe Connect, PayPal, IBAN, or Platform Wallet)',
                                'Not have been previously banned from the platform',
                            ]} className="mt-6" />
                            <InfoCard className="mt-8">
                                <p className="text-slate-600">
                                    <span className="text-slate-800 font-semibold">Stripe Connect:</span> To receive direct payouts, you must complete Stripe&apos;s identity verification (KYC). Until verified, earnings accumulate in your Platform Wallet and can only be redeemed as gift cards.
                                </p>
                            </InfoCard>
                        </Section>

                        {/* 2 - Obligations */}
                        <Section id="obligations" number={2} title="Seller Obligations">
                            <p>As a Seller, you commit to the following:</p>

                            <SubSection title="Ethical Promotion">
                                <DataList items={[
                                    'Promote products and services honestly and transparently',
                                    'Always disclose your affiliate relationship as required by law (FTC, GDPR, EU Directive 2005/29/EC)',
                                    'Never make false, misleading, or exaggerated claims about products you promote',
                                    'Use only approved marketing materials and messaging provided by the Startup',
                                    'Respect each program\'s specific guidelines and restrictions',
                                ]} />
                            </SubSection>

                            <SubSection title="Legal Compliance">
                                <DataList items={[
                                    'Comply with all applicable laws in your country of residence and your audience\'s jurisdictions',
                                    'Declare affiliate income to your tax authorities as required',
                                    'Obtain necessary business licenses or registrations if applicable',
                                    'Respect GDPR and data protection laws when collecting or processing user data',
                                ]} />
                            </SubSection>

                            <SubSection title="Content Standards">
                                <DataList items={[
                                    'Do not associate promoted products with illegal, adult, violent, or hateful content',
                                    'Do not use trademarked terms in domain names or paid ad keywords without written permission',
                                    'Do not create fake reviews, testimonials, or endorsements',
                                ]} />
                            </SubSection>
                        </Section>

                        {/* 3 - Commissions */}
                        <Section id="commissions" number={3} title="Commissions & Payouts">
                            <p>Commission rules are defined by each Startup program you join:</p>

                            <div className="grid gap-4 mt-8">
                                {[
                                    { type: 'Sale Commission', desc: 'Earned when a referred customer completes a purchase', example: 'Flat rate (e.g., €5/sale) or percentage of net sale amount' },
                                    { type: 'Lead Commission', desc: 'Earned when a referred visitor completes a qualifying action (signup, form, etc.)', example: 'Flat rate per lead (e.g., €3/lead)' },
                                    { type: 'Recurring Commission', desc: 'Earned on subscription renewals from referred customers', example: 'Percentage of each renewal payment' },
                                ].map((item) => (
                                    <div key={item.type} className="flex gap-4 p-5 rounded-xl bg-white border-l-4 border-emerald-500 shadow-sm">
                                        <div>
                                            <div className="font-medium text-slate-800 mb-1">{item.type}</div>
                                            <div className="text-sm text-slate-500">{item.desc}</div>
                                            <div className="text-xs text-slate-400 mt-1">{item.example}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <SubSection title="Payout Methods & Minimums">
                                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm mt-4">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-50">
                                                <th className="text-left py-4 px-5 font-medium text-slate-700">Method</th>
                                                <th className="text-left py-4 px-5 font-medium text-slate-700">Minimum</th>
                                                <th className="text-left py-4 px-5 font-medium text-slate-700">Frequency</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            <tr><td className="py-4 px-5 text-slate-800 font-medium">Stripe Connect</td><td className="py-4 px-5 text-slate-600">€10</td><td className="py-4 px-5 text-slate-500">Weekly (Mondays)</td></tr>
                                            <tr><td className="py-4 px-5 text-slate-800 font-medium">PayPal</td><td className="py-4 px-5 text-slate-600">€10</td><td className="py-4 px-5 text-slate-500">Manual</td></tr>
                                            <tr><td className="py-4 px-5 text-slate-800 font-medium">IBAN / SEPA</td><td className="py-4 px-5 text-slate-600">€25</td><td className="py-4 px-5 text-slate-500">Manual</td></tr>
                                            <tr><td className="py-4 px-5 text-slate-800 font-medium">Platform Wallet</td><td className="py-4 px-5 text-slate-600">€0</td><td className="py-4 px-5 text-slate-500">Instant (gift cards only)</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </SubSection>

                            <InfoCard variant="subtle" className="mt-6">
                                <p className="text-slate-600 text-sm">
                                    <span className="text-slate-800 font-medium">Wallet limitation:</span> Funds in your Platform Wallet can only be redeemed as gift cards (Amazon, iTunes, Steam, PayPal Gift). Wallet balances are not transferable to Stripe Connect or bank accounts.
                                </p>
                            </InfoCard>
                        </Section>

                        {/* 4 - Hold Periods */}
                        <Section id="hold-periods" number={4} title="Hold Periods & Clawbacks">
                            <p>Commissions are subject to hold periods before becoming payable:</p>

                            <div className="grid gap-3 mt-8">
                                {[
                                    { type: 'Lead commissions', period: '3 days', reason: 'Validation of lead quality' },
                                    { type: 'Sale commissions', period: '30 days', reason: 'Protection against refunds and chargebacks' },
                                    { type: 'Recurring commissions', period: '30 days', reason: 'Protection against subscription cancellations' },
                                ].map((item) => (
                                    <div key={item.type} className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200">
                                        <div>
                                            <span className="font-medium text-slate-700">{item.type}</span>
                                            <span className="text-sm text-slate-400 ml-2">— {item.reason}</span>
                                        </div>
                                        <span className="text-sm font-mono text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">{item.period}</span>
                                    </div>
                                ))}
                            </div>

                            <SubSection title="Clawback Policy">
                                <p className="text-slate-500 mb-4">Commissions may be revoked (&quot;clawed back&quot;) in the following situations:</p>
                                <DataList items={[
                                    'The referred customer requests a refund within the hold period',
                                    'A chargeback is filed against the transaction',
                                    'The lead or sale is determined to be fraudulent or self-referred',
                                    'The Startup cancels the program or disputes the conversion',
                                ]} />
                            </SubSection>

                            <InfoCard className="mt-8">
                                <p className="text-slate-600">
                                    <span className="text-slate-800 font-semibold">Already paid commissions:</span> If a commission has already been paid (status COMPLETE) and a refund or fraud is later discovered, a negative balance entry will be created on your account. This balance will be deducted from future earnings.
                                </p>
                            </InfoCard>
                        </Section>

                        {/* 5 - Prohibited */}
                        <Section id="prohibited" number={5} title="Prohibited Activities">
                            <p>The following activities are strictly prohibited and will result in immediate action:</p>
                            <div className="grid md:grid-cols-2 gap-4 mt-8">
                                {[
                                    { title: 'Self-referrals', desc: 'Purchasing through your own affiliate links or using fake accounts to generate commissions' },
                                    { title: 'Click fraud', desc: 'Artificially inflating clicks through bots, scripts, click farms, or automated tools' },
                                    { title: 'Cookie stuffing', desc: 'Dropping affiliate cookies without genuine user intent or knowledge' },
                                    { title: 'Spam', desc: 'Sending unsolicited emails, messages, or bulk communications to promote affiliate links' },
                                    { title: 'Misleading ads', desc: 'Using deceptive ad copy, fake urgency, or misleading landing pages' },
                                    { title: 'Brand bidding', desc: 'Bidding on the Startup\'s brand name in paid search without written permission' },
                                    { title: 'Incentivized traffic', desc: 'Offering rewards for clicking or purchasing through your links (unless explicitly allowed)' },
                                    { title: 'Account sharing', desc: 'Sharing your account credentials or affiliate links with unauthorized third parties' },
                                ].map((item) => (
                                    <div key={item.title} className="p-4 rounded-xl bg-red-50/50 border border-red-200/50">
                                        <div className="font-medium text-red-800 mb-1">{item.title}</div>
                                        <div className="text-sm text-red-600/70">{item.desc}</div>
                                    </div>
                                ))}
                            </div>
                        </Section>

                        {/* 6 - Fraud */}
                        <Section id="fraud" number={6} title="Fraud Detection & Monitoring">
                            <p>Traaaction employs automated and manual fraud detection systems. By using the platform, you acknowledge:</p>
                            <DataList items={[
                                'All traffic and conversions are subject to automated fraud analysis',
                                'Suspicious patterns (unusual click volumes, geographic anomalies, conversion spikes) may trigger review',
                                'Traaaction reserves the right to hold or withhold commissions pending fraud investigation',
                                'Investigations may take up to 30 days; you will be notified of the outcome',
                                'Repeat offenders will be permanently banned with forfeiture of all pending commissions',
                            ]} className="mt-6" />

                            <InfoCard variant="subtle" className="mt-6">
                                <p className="text-slate-600 text-sm">
                                    <span className="text-slate-800 font-medium">Appeals:</span> If you believe a fraud determination is incorrect, you may appeal by contacting <a href="mailto:contact@traaaction.com" className="text-emerald-600 hover:text-emerald-700">contact@traaaction.com</a> within 14 days of notification with supporting evidence.
                                </p>
                            </InfoCard>
                        </Section>

                        {/* 7 - Termination */}
                        <Section id="termination" number={7} title="Termination & Suspension">
                            <SubSection title="Voluntary Termination">
                                <DataList items={[
                                    'You may close your Seller account at any time through account settings',
                                    'Pending commissions in hold period will still be processed and paid after maturation',
                                    'Wallet balance remains available for gift card redemption for 90 days after closure',
                                    'After 90 days, unclaimed wallet balances are forfeited',
                                ]} />
                            </SubSection>

                            <SubSection title="Termination by Traaaction">
                                <DataList items={[
                                    'Immediate suspension for suspected fraud, policy violations, or illegal activity',
                                    'Account termination with 14 days notice for repeated minor violations',
                                    'Account termination with 30 days notice for business reasons',
                                ]} />
                            </SubSection>

                            <SubSection title="Effect of Termination for Cause">
                                <DataList items={[
                                    'All pending (PENDING) commissions are immediately forfeited',
                                    'Matured (PROCEED) commissions may be withheld pending investigation',
                                    'Platform Wallet balance may be frozen',
                                    'Affiliate links are deactivated and will redirect to the Startup\'s homepage',
                                    'You may not create a new account without written permission',
                                ]} />
                            </SubSection>
                        </Section>

                        {/* 8 - Liability */}
                        <Section id="liability" number={8} title="Liability & Disclaimers">
                            <p>Important limitations on Traaaction&apos;s liability:</p>
                            <DataList items={[
                                'Traaaction is not responsible for Startup program changes, including commission rate modifications or program closures',
                                'Traaaction does not guarantee any minimum level of earnings or conversions',
                                'Technical tracking issues (cookie blocking, ad blockers, browser restrictions) may affect attribution',
                                'Traaaction is not liable for payment delays caused by Stripe, PayPal, or banking systems',
                                'Traaaction\'s total liability is limited to the commissions earned in the 3 months preceding the claim',
                            ]} className="mt-6" />

                            <InfoCard className="mt-8">
                                <p className="text-slate-600">
                                    <span className="text-slate-800 font-semibold">Independent Contractor:</span> As a Seller, you are an independent contractor, not an employee, agent, or representative of Traaaction or any Startup. You are solely responsible for your own taxes, insurance, and legal compliance.
                                </p>
                            </InfoCard>
                        </Section>

                        {/* 9 - Contact */}
                        <Section id="contact" number={9} title="Contact">
                            <p>For questions about these Seller Terms:</p>
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
                                <Link href="/startup-terms" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">Startup Terms</Link>
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
                <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/25 flex items-center justify-center text-white font-mono text-sm font-bold">
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
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
                    <span className="text-slate-500">{item}</span>
                </li>
            ))}
        </ul>
    )
}
