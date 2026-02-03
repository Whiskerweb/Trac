'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Shield, Database, Cookie, Scale, Globe, Clock, UserCheck, Users, Lock, Baby, RefreshCw, Mail, ChevronRight } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'

const sections = [
    { id: 'controller', title: 'Data Controller', icon: Shield },
    { id: 'collection', title: 'Information We Collect', icon: Database },
    { id: 'cookies', title: 'Cookies & Tracking', icon: Cookie },
    { id: 'usage', title: 'How We Use Your Data', icon: Scale },
    { id: 'legal-basis', title: 'Legal Basis (GDPR)', icon: Scale },
    { id: 'sharing', title: 'Data Sharing', icon: Users },
    { id: 'transfers', title: 'International Transfers', icon: Globe },
    { id: 'retention', title: 'Data Retention', icon: Clock },
    { id: 'rights', title: 'Your GDPR Rights', icon: UserCheck },
    { id: 'roles', title: 'Controller vs Processor', icon: Users },
    { id: 'security', title: 'Security', icon: Lock },
    { id: 'children', title: "Children's Privacy", icon: Baby },
    { id: 'changes', title: 'Policy Changes', icon: RefreshCw },
    { id: 'contact', title: 'Contact Us', icon: Mail },
]

export default function PrivacyPolicyPage() {
    const [activeSection, setActiveSection] = useState('controller')
    const [scrollProgress, setScrollProgress] = useState(0)
    const contentRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY
            const docHeight = document.documentElement.scrollHeight - window.innerHeight
            setScrollProgress((scrollTop / docHeight) * 100)

            // Find active section
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
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA] text-slate-900 selection:bg-violet-500/20">
            {/* Subtle background pattern */}
            <div className="fixed inset-0 pointer-events-none opacity-40">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-violet-100/50 to-transparent rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-blue-100/50 to-transparent rounded-full blur-3xl" />
            </div>

            {/* Progress bar */}
            <div className="fixed top-0 left-0 right-0 h-[3px] bg-slate-200/50 z-50">
                <div
                    className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500 transition-all duration-150"
                    style={{ width: `${scrollProgress}%` }}
                />
            </div>

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span>Back to Traaaction</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <Image
                            src="/Logotrac/Logo5.png"
                            alt="Traaaction"
                            width={24}
                            height={24}
                            className="rounded-md"
                        />
                        <span className="text-sm font-medium text-slate-500">Legal</span>
                    </div>
                </div>
            </header>

            {/* Main layout */}
            <div className="pt-20 flex">
                {/* Left sidebar - Navigation spine */}
                <aside className="hidden lg:block fixed left-0 top-20 bottom-0 w-72 bg-white/50 backdrop-blur-sm border-r border-slate-200/50 overflow-y-auto">
                    <div className="p-6 pt-12">
                        <div className="text-xs uppercase tracking-widest text-slate-400 mb-6 font-medium">
                            Table of Contents
                        </div>
                        <nav className="space-y-1">
                            {sections.map((section, index) => {
                                const isActive = activeSection === section.id
                                return (
                                    <button
                                        key={section.id}
                                        onClick={() => scrollToSection(section.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 group ${
                                            isActive
                                                ? 'bg-violet-50 text-violet-900'
                                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                                        }`}
                                    >
                                        <span className={`flex items-center justify-center w-6 h-6 rounded-md text-xs font-mono transition-colors ${
                                            isActive ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:text-slate-500'
                                        }`}>
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                        <span className="text-sm truncate">{section.title}</span>
                                        {isActive && <ChevronRight className="w-3 h-3 ml-auto text-violet-500" />}
                                    </button>
                                )
                            })}
                        </nav>
                    </div>
                </aside>

                {/* Main content */}
                <main className="flex-1 lg:ml-72" ref={contentRef}>
                    {/* Hero section */}
                    <div className="px-6 lg:px-16 pt-16 pb-20 bg-white border-b border-slate-200/50">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium mb-8">
                                <Shield className="w-3 h-3" />
                                GDPR Compliant
                            </div>
                            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
                                Privacy
                                <span className="block text-slate-300">Policy</span>
                            </h1>
                            <p className="text-lg text-slate-500 leading-relaxed max-w-xl mb-8">
                                Your privacy matters. This policy explains how Traaaction collects, uses, and protects your data with full GDPR compliance.
                            </p>
                            <div className="flex items-center gap-4 text-sm text-slate-400">
                                <span>Last updated</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                <span className="text-slate-600 font-medium">February 3, 2026</span>
                            </div>
                        </div>
                    </div>

                    {/* Content sections */}
                    <div className="px-6 lg:px-16 py-16 space-y-24">
                        {/* Introduction */}
                        <div className="max-w-3xl">
                            <p className="text-lg text-slate-600 leading-relaxed">
                                Welcome to Traaaction. We provide a platform for managing affiliate and partner marketing programs,
                                enabling startups to create missions and sellers to earn commissions through tracked referrals.
                            </p>
                            <p className="text-slate-500 leading-relaxed mt-4">
                                We are committed to protecting your privacy and personal data. By using our Service, you agree to
                                the collection and use of information as described in this policy.
                            </p>
                        </div>

                        {/* Section 1 - Data Controller */}
                        <Section id="controller" number={1} title="Data Controller">
                            <p>The data controller responsible for your personal data is:</p>
                            <InfoCard>
                                <div className="font-semibold text-slate-900 text-lg mb-2">Traaaction</div>
                                <div className="text-slate-500 space-y-1">
                                    <p>60 rue Amiral Romain-Desfossés</p>
                                    <p>29200 Brest, France</p>
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <a href="mailto:contact@traaaction.com" className="text-violet-600 hover:text-violet-700 transition-colors">
                                        contact@traaaction.com
                                    </a>
                                </div>
                            </InfoCard>
                        </Section>

                        {/* Section 2 - Information We Collect */}
                        <Section id="collection" number={2} title="Information We Collect">
                            <p>We collect different types of information depending on how you interact with our Service:</p>

                            <SubSection title="For Startups (Program Owners)">
                                <DataList items={[
                                    'Account information: name, email address, company name',
                                    'Workspace settings and preferences',
                                    'Payment information processed through Stripe',
                                    'Mission and program configurations',
                                ]} />
                            </SubSection>

                            <SubSection title="For Sellers (Affiliates)">
                                <DataList items={[
                                    'Account information: name, email address',
                                    'Profile information: bio, social media links, profile picture',
                                    'Payout information: Stripe Connect, PayPal, or IBAN',
                                    'Performance data: clicks, leads, sales, commissions',
                                ]} />
                            </SubSection>

                            <SubSection title="For End Users (Visitors)">
                                <p className="text-slate-500 mb-4">When you click on a tracking link, we may collect:</p>
                                <DataList items={[
                                    'Click identifiers for attribution',
                                    'IP address (geolocation only, not stored for EU)',
                                    'Device type and browser information',
                                    'Country and city (derived from IP)',
                                    'Referrer URL and timestamp',
                                ]} />
                            </SubSection>
                        </Section>

                        {/* Section 3 - Cookies */}
                        <Section id="cookies" number={3} title="Cookies & Tracking Technologies">
                            <p>We use cookies and similar technologies to operate our Service and provide attribution tracking.</p>

                            <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50">
                                            <th className="text-left py-4 px-5 font-medium text-slate-700">Cookie</th>
                                            <th className="text-left py-4 px-5 font-medium text-slate-700">Purpose</th>
                                            <th className="text-left py-4 px-5 font-medium text-slate-700">Duration</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        <tr className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-5 font-mono text-xs text-violet-600">trac_id</td>
                                            <td className="py-4 px-5 text-slate-500">Attribution tracking</td>
                                            <td className="py-4 px-5 text-slate-500">90 days</td>
                                        </tr>
                                        <tr className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-5 font-mono text-xs text-violet-600">trac_active_ws</td>
                                            <td className="py-4 px-5 text-slate-500">Active workspace session</td>
                                            <td className="py-4 px-5 text-slate-500">Session</td>
                                        </tr>
                                        <tr className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-5 font-mono text-xs text-violet-600">sb-*</td>
                                            <td className="py-4 px-5 text-slate-500">Authentication (Supabase)</td>
                                            <td className="py-4 px-5 text-slate-500">Session</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <InfoCard variant="subtle" className="mt-6">
                                <p className="text-slate-500 text-sm">
                                    <span className="text-slate-700 font-medium">No advertising cookies.</span> Our tracking cookies are strictly first-party and used solely for affiliate attribution.
                                </p>
                            </InfoCard>
                        </Section>

                        {/* Section 4 - How We Use Your Data */}
                        <Section id="usage" number={4} title="How We Use Your Information">
                            <p>We use the collected information for the following purposes:</p>
                            <div className="grid md:grid-cols-2 gap-4 mt-8">
                                {[
                                    { title: 'Service Delivery', desc: 'To provide, operate, and maintain our platform' },
                                    { title: 'Attribution', desc: 'To track clicks, leads, and sales to correct sellers' },
                                    { title: 'Payments', desc: 'To process commissions and payouts' },
                                    { title: 'Analytics', desc: 'To provide insights about affiliate programs' },
                                    { title: 'Communication', desc: 'Transactional emails and support responses' },
                                    { title: 'Security', desc: 'Fraud detection and abuse prevention' },
                                    { title: 'Improvement', desc: 'Analyze usage patterns to improve Service' },
                                    { title: 'Legal', desc: 'Comply with applicable laws and regulations' },
                                ].map((item) => (
                                    <div key={item.title} className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all">
                                        <div className="font-medium text-slate-800 mb-1">{item.title}</div>
                                        <div className="text-sm text-slate-500">{item.desc}</div>
                                    </div>
                                ))}
                            </div>
                        </Section>

                        {/* Section 5 - Legal Basis */}
                        <Section id="legal-basis" number={5} title="Legal Basis for Processing (GDPR)">
                            <p>Under the General Data Protection Regulation (GDPR), we process your personal data based on:</p>
                            <div className="space-y-4 mt-8">
                                {[
                                    { basis: 'Contract Performance', desc: 'Processing necessary to provide our Service (account management, payments, tracking)' },
                                    { basis: 'Legitimate Interests', desc: 'Fraud prevention, security, and service improvement' },
                                    { basis: 'Legal Obligation', desc: 'Tax records, anti-money laundering compliance' },
                                    { basis: 'Consent', desc: 'Where required (e.g., marketing communications)' },
                                ].map((item, i) => (
                                    <div key={item.basis} className="flex gap-4 p-5 rounded-xl bg-white border-l-4 border-violet-500 shadow-sm">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600 font-mono text-sm font-bold">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-800 mb-1">{item.basis}</div>
                                            <div className="text-sm text-slate-500">{item.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Section>

                        {/* Section 6 - Data Sharing */}
                        <Section id="sharing" number={6} title="Data Sharing and Third Parties">
                            <p>We share your data with trusted service providers who help us operate our platform:</p>

                            <SubSection title="Service Providers (Subprocessors)">
                                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm mt-4">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-50">
                                                <th className="text-left py-4 px-5 font-medium text-slate-700">Provider</th>
                                                <th className="text-left py-4 px-5 font-medium text-slate-700">Purpose</th>
                                                <th className="text-left py-4 px-5 font-medium text-slate-700">Location</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {[
                                                { name: 'Stripe', purpose: 'Payment processing', location: 'US (EU available)' },
                                                { name: 'Supabase', purpose: 'Authentication, database', location: 'EU (Frankfurt)' },
                                                { name: 'Vercel', purpose: 'Hosting, edge functions', location: 'Global (EU edge)' },
                                                { name: 'Tinybird', purpose: 'Real-time analytics', location: 'EU (GCP Europe)' },
                                                { name: 'Upstash', purpose: 'Redis cache, rate limiting', location: 'EU (Frankfurt)' },
                                            ].map((provider) => (
                                                <tr key={provider.name} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="py-4 px-5 text-slate-800 font-medium">{provider.name}</td>
                                                    <td className="py-4 px-5 text-slate-500">{provider.purpose}</td>
                                                    <td className="py-4 px-5 text-slate-500">{provider.location}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </SubSection>

                            <SubSection title="Other Disclosures">
                                <DataList items={[
                                    'To comply with legal obligations or lawful requests',
                                    'To protect our rights, privacy, safety, or property',
                                    'In connection with a merger or acquisition (with prior notice)',
                                    'With your consent for any other purpose',
                                ]} />
                            </SubSection>
                        </Section>

                        {/* Section 7 - International Transfers */}
                        <Section id="transfers" number={7} title="International Data Transfers">
                            <p>Your data may be transferred to countries outside the EEA. We ensure appropriate safeguards:</p>
                            <DataList items={[
                                'Standard Contractual Clauses (SCCs) approved by the European Commission',
                                'Adequacy decisions where applicable',
                                'Data Processing Agreements with all subprocessors',
                            ]} className="mt-6" />
                        </Section>

                        {/* Section 8 - Data Retention */}
                        <Section id="retention" number={8} title="Data Retention">
                            <p>We retain your personal data only as long as necessary:</p>
                            <div className="grid gap-3 mt-8">
                                {[
                                    { type: 'Account data', period: 'Until deletion + backup period' },
                                    { type: 'Transaction data', period: '7 years (legal requirement)' },
                                    { type: 'Analytics data', period: '24 months detailed, aggregated longer' },
                                    { type: 'Tracking data', period: '90 days for attribution' },
                                    { type: 'Log data', period: '30 days for security/debugging' },
                                ].map((item) => (
                                    <div key={item.type} className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200">
                                        <span className="text-slate-600">{item.type}</span>
                                        <span className="text-sm font-mono text-violet-600 bg-violet-50 px-3 py-1 rounded-full">{item.period}</span>
                                    </div>
                                ))}
                            </div>
                        </Section>

                        {/* Section 9 - Your Rights */}
                        <Section id="rights" number={9} title="Your Rights Under GDPR">
                            <p>If you are in the EU/EEA, you have the following rights:</p>
                            <div className="grid md:grid-cols-2 gap-4 mt-8">
                                {[
                                    { right: 'Access', desc: 'Request a copy of your personal data' },
                                    { right: 'Rectification', desc: 'Request correction of inaccurate data' },
                                    { right: 'Erasure', desc: 'Request deletion ("right to be forgotten")' },
                                    { right: 'Restriction', desc: 'Limit processing in certain cases' },
                                    { right: 'Portability', desc: 'Receive data in machine-readable format' },
                                    { right: 'Object', desc: 'Object to legitimate interest processing' },
                                ].map((item) => (
                                    <div key={item.right} className="p-5 rounded-xl bg-gradient-to-br from-violet-50 to-white border border-violet-100">
                                        <div className="text-lg font-medium text-slate-800 mb-2">Right to {item.right}</div>
                                        <div className="text-sm text-slate-500">{item.desc}</div>
                                    </div>
                                ))}
                            </div>
                            <InfoCard className="mt-8">
                                <p className="text-slate-500">
                                    To exercise these rights, contact us at{' '}
                                    <a href="mailto:contact@traaaction.com" className="text-violet-600 hover:text-violet-700">
                                        contact@traaaction.com
                                    </a>
                                    . We will respond within 30 days. You may also lodge a complaint with your local Data Protection Authority.
                                </p>
                            </InfoCard>
                        </Section>

                        {/* Section 10 - Controller vs Processor */}
                        <Section id="roles" number={10} title="Data Controller vs Processor">
                            <p>When you use our tracking features on your website:</p>
                            <div className="grid md:grid-cols-2 gap-6 mt-8">
                                <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-white border border-blue-200">
                                    <div className="text-xs uppercase tracking-widest text-blue-600 mb-3 font-medium">You (Startup)</div>
                                    <div className="text-xl font-bold text-slate-800 mb-2">Data Controller</div>
                                    <p className="text-sm text-slate-500">
                                        Responsible for obtaining consent, informing users, and responding to privacy requests.
                                    </p>
                                </div>
                                <div className="p-6 rounded-xl bg-gradient-to-br from-violet-50 to-white border border-violet-200">
                                    <div className="text-xs uppercase tracking-widest text-violet-600 mb-3 font-medium">Traaaction</div>
                                    <div className="text-xl font-bold text-slate-800 mb-2">Data Processor</div>
                                    <p className="text-sm text-slate-500">
                                        Processes data on your behalf according to our Data Processing Agreement.
                                    </p>
                                </div>
                            </div>
                        </Section>

                        {/* Section 11 - Security */}
                        <Section id="security" number={11} title="Security">
                            <p>We implement appropriate technical and organizational measures:</p>
                            <div className="grid md:grid-cols-3 gap-4 mt-8">
                                {[
                                    'Encryption (TLS/HTTPS)',
                                    'Secure authentication',
                                    'Regular security audits',
                                    'Access controls',
                                    'Input validation',
                                    'Rate limiting',
                                ].map((item) => (
                                    <div key={item} className="flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-200">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span className="text-sm text-slate-600">{item}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-slate-400 text-sm mt-6">
                                While we strive to protect your data, no method of transmission over the Internet is 100% secure.
                            </p>
                        </Section>

                        {/* Section 12 - Children */}
                        <Section id="children" number={12} title="Children's Privacy">
                            <p>
                                Our Service is not intended for individuals under 18. We do not knowingly collect data from children.
                                If you become aware that a child has provided us with personal data, please contact us.
                            </p>
                        </Section>

                        {/* Section 13 - Changes */}
                        <Section id="changes" number={13} title="Changes to This Policy">
                            <p>We may update this Privacy Policy from time to time. When we make significant changes:</p>
                            <DataList items={[
                                'We will post the updated policy with a new "Last updated" date',
                                'We will send email notification to registered users for material changes',
                            ]} className="mt-6" />
                            <p className="text-slate-400 mt-4">
                                Continued use of the Service after changes constitutes acceptance of the updated policy.
                            </p>
                        </Section>

                        {/* Section 14 - Contact */}
                        <Section id="contact" number={14} title="Contact Us">
                            <p>If you have any questions about this Privacy Policy:</p>
                            <InfoCard className="mt-6">
                                <div className="font-semibold text-slate-800 text-lg mb-3">Traaaction</div>
                                <div className="text-slate-500 space-y-1 mb-4">
                                    <p>60 rue Amiral Romain-Desfossés</p>
                                    <p>29200 Brest, France</p>
                                </div>
                                <a
                                    href="mailto:contact@traaaction.com"
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors"
                                >
                                    <Mail className="w-4 h-4" />
                                    contact@traaaction.com
                                </a>
                            </InfoCard>
                        </Section>
                    </div>

                    {/* Footer */}
                    <footer className="border-t border-slate-200 bg-white px-6 lg:px-16 py-12">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <p className="text-sm text-slate-400">
                                © {new Date().getFullYear()} Traaaction. All rights reserved.
                            </p>
                            <div className="flex items-center gap-6">
                                <Link href="/terms" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
                                    Terms of Service
                                </Link>
                                <Link href="/" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
                                    Home
                                </Link>
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
                <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 shadow-lg shadow-violet-500/25 flex items-center justify-center text-white font-mono text-sm font-bold">
                    {String(number).padStart(2, '0')}
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{title}</h2>
            </div>
            <div className="text-slate-600 leading-relaxed space-y-4">
                {children}
            </div>
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
    const baseClasses = variant === 'subtle'
        ? 'p-4 rounded-xl bg-slate-50 border border-slate-100'
        : 'p-6 rounded-xl bg-white border border-slate-200 shadow-sm'
    return (
        <div className={`${baseClasses} ${className}`}>
            {children}
        </div>
    )
}

function DataList({ items, className = '' }: { items: string[]; className?: string }) {
    return (
        <ul className={`space-y-2 ${className}`}>
            {items.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-violet-500 mt-2" />
                    <span className="text-slate-500">{item}</span>
                </li>
            ))}
        </ul>
    )
}
