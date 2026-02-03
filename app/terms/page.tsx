'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, FileText, Users, CreditCard, Shield, AlertTriangle, Scale, Gavel, RefreshCw, Mail, ChevronRight, Building2, UserCheck, Ban, FileWarning, Handshake } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'

const sections = [
    { id: 'acceptance', title: 'Acceptance of Terms', icon: FileText },
    { id: 'description', title: 'Description of Service', icon: Building2 },
    { id: 'accounts', title: 'User Accounts', icon: Users },
    { id: 'startups', title: 'Startup Obligations', icon: Building2 },
    { id: 'sellers', title: 'Seller Obligations', icon: UserCheck },
    { id: 'fees', title: 'Fees & Payments', icon: CreditCard },
    { id: 'commissions', title: 'Commission Structure', icon: Scale },
    { id: 'intellectual', title: 'Intellectual Property', icon: Shield },
    { id: 'prohibited', title: 'Prohibited Activities', icon: Ban },
    { id: 'termination', title: 'Termination', icon: FileWarning },
    { id: 'disclaimers', title: 'Disclaimers', icon: AlertTriangle },
    { id: 'liability', title: 'Limitation of Liability', icon: Gavel },
    { id: 'indemnification', title: 'Indemnification', icon: Handshake },
    { id: 'changes', title: 'Changes to Terms', icon: RefreshCw },
    { id: 'contact', title: 'Contact Us', icon: Mail },
]

export default function TermsOfServicePage() {
    const [activeSection, setActiveSection] = useState('acceptance')
    const [scrollProgress, setScrollProgress] = useState(0)
    const contentRef = useRef<HTMLDivElement>(null)

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
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA] text-slate-900 selection:bg-blue-500/20">
            {/* Subtle background pattern */}
            <div className="fixed inset-0 pointer-events-none opacity-40">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-blue-100/50 to-transparent rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-slate-100/50 to-transparent rounded-full blur-3xl" />
            </div>

            {/* Progress bar */}
            <div className="fixed top-0 left-0 right-0 h-[3px] bg-slate-200/50 z-50">
                <div
                    className="h-full bg-gradient-to-r from-blue-500 via-slate-700 to-blue-500 transition-all duration-150"
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
                                                ? 'bg-blue-50 text-blue-900'
                                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                                        }`}
                                    >
                                        <span className={`flex items-center justify-center w-6 h-6 rounded-md text-xs font-mono transition-colors ${
                                            isActive ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:text-slate-500'
                                        }`}>
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

                {/* Main content */}
                <main className="flex-1 lg:ml-72" ref={contentRef}>
                    {/* Hero section */}
                    <div className="px-6 lg:px-16 pt-16 pb-20 bg-white border-b border-slate-200/50">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium mb-8">
                                <Scale className="w-3 h-3" />
                                Legal Agreement
                            </div>
                            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
                                Terms of
                                <span className="block text-slate-300">Service</span>
                            </h1>
                            <p className="text-lg text-slate-500 leading-relaxed max-w-xl mb-8">
                                Please read these terms carefully before using Traaaction. By accessing or using our platform, you agree to be bound by these terms.
                            </p>
                            <div className="flex items-center gap-4 text-sm text-slate-400">
                                <span>Effective date</span>
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
                                These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Traaaction platform,
                                including our website, applications, and services (collectively, the &quot;Service&quot;).
                            </p>
                            <p className="text-slate-500 leading-relaxed mt-4">
                                Traaaction is operated by Traaaction SAS, a company registered in France. By using our Service,
                                you enter into a binding agreement with us.
                            </p>
                        </div>

                        {/* Section 1 - Acceptance */}
                        <Section id="acceptance" number={1} title="Acceptance of Terms">
                            <p>
                                By accessing or using the Service, you agree to be bound by these Terms and our{' '}
                                <Link href="/privacy" className="text-blue-600 hover:text-blue-700">Privacy Policy</Link>.
                                If you do not agree to these Terms, you may not access or use the Service.
                            </p>
                            <InfoCard variant="subtle" className="mt-6">
                                <p className="text-slate-600 text-sm">
                                    <span className="text-slate-800 font-medium">Important:</span> You must be at least 18 years old and capable of forming a binding contract to use our Service.
                                </p>
                            </InfoCard>
                            <p className="mt-4">
                                If you are using the Service on behalf of a company or organization, you represent that you have
                                the authority to bind that entity to these Terms.
                            </p>
                        </Section>

                        {/* Section 2 - Description */}
                        <Section id="description" number={2} title="Description of Service">
                            <p>
                                Traaaction is a SaaS platform that connects Startups (businesses) with Sellers (affiliates) to create
                                and manage affiliate marketing programs. Our Service includes:
                            </p>
                            <div className="grid md:grid-cols-2 gap-4 mt-8">
                                {[
                                    { title: 'Mission Creation', desc: 'Startups create affiliate programs with customizable commission structures' },
                                    { title: 'Seller Marketplace', desc: 'Sellers browse and join affiliate programs that match their audience' },
                                    { title: 'Attribution Tracking', desc: 'Real-time tracking of clicks, leads, and sales via unique links' },
                                    { title: 'Commission Management', desc: 'Automated calculation and tracking of commissions' },
                                    { title: 'Payout Processing', desc: 'Secure payouts via Stripe Connect, PayPal, or bank transfer' },
                                    { title: 'Analytics Dashboard', desc: 'Comprehensive reporting for both startups and sellers' },
                                ].map((item) => (
                                    <div key={item.title} className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all">
                                        <div className="font-medium text-slate-800 mb-1">{item.title}</div>
                                        <div className="text-sm text-slate-500">{item.desc}</div>
                                    </div>
                                ))}
                            </div>
                        </Section>

                        {/* Section 3 - Accounts */}
                        <Section id="accounts" number={3} title="User Accounts">
                            <p>To use certain features of the Service, you must create an account. When creating an account, you agree to:</p>
                            <DataList items={[
                                'Provide accurate, current, and complete information',
                                'Maintain and promptly update your account information',
                                'Keep your password secure and confidential',
                                'Accept responsibility for all activities under your account',
                                'Notify us immediately of any unauthorized access',
                            ]} className="mt-6" />

                            <SubSection title="Account Types">
                                <div className="grid md:grid-cols-2 gap-6 mt-4">
                                    <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-white border border-blue-200">
                                        <div className="text-xs uppercase tracking-widest text-blue-600 mb-3 font-medium">Business</div>
                                        <div className="text-xl font-bold text-slate-800 mb-2">Startup Account</div>
                                        <p className="text-sm text-slate-500">
                                            For businesses creating affiliate programs and managing sellers.
                                        </p>
                                    </div>
                                    <div className="p-6 rounded-xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-200">
                                        <div className="text-xs uppercase tracking-widest text-emerald-600 mb-3 font-medium">Individual</div>
                                        <div className="text-xl font-bold text-slate-800 mb-2">Seller Account</div>
                                        <p className="text-sm text-slate-500">
                                            For affiliates promoting products and earning commissions.
                                        </p>
                                    </div>
                                </div>
                            </SubSection>
                        </Section>

                        {/* Section 4 - Startup Obligations */}
                        <Section id="startups" number={4} title="Startup Obligations">
                            <p>As a Startup using our platform, you agree to:</p>
                            <DataList items={[
                                'Provide accurate information about your products, services, and commission structures',
                                'Honor all commissions earned by Sellers according to your program terms',
                                'Pay platform fees and Seller commissions in a timely manner',
                                'Comply with all applicable laws regarding advertising and affiliate marketing',
                                'Not modify commission terms retroactively to disadvantage Sellers',
                                'Maintain adequate funds to cover earned commissions',
                            ]} className="mt-6" />

                            <InfoCard className="mt-8">
                                <p className="text-slate-600">
                                    <span className="text-slate-800 font-semibold">Payment Obligation:</span> You must pay all approved commissions within 30 days of the commission becoming payable. Failure to do so may result in account suspension.
                                </p>
                            </InfoCard>
                        </Section>

                        {/* Section 5 - Seller Obligations */}
                        <Section id="sellers" number={5} title="Seller Obligations">
                            <p>As a Seller using our platform, you agree to:</p>
                            <DataList items={[
                                'Promote products and services honestly and transparently',
                                'Disclose your affiliate relationship as required by law (FTC, GDPR, etc.)',
                                'Not engage in fraudulent activities such as fake clicks, leads, or self-referrals',
                                'Not use spam, misleading advertising, or deceptive practices',
                                'Comply with each program\'s specific terms and guidelines',
                                'Provide accurate payment information for receiving commissions',
                            ]} className="mt-6" />

                            <SubSection title="Disclosure Requirements">
                                <p className="text-slate-500 mb-4">
                                    You must clearly disclose your affiliate relationship when promoting products. Example disclosures include:
                                </p>
                                <div className="space-y-3">
                                    {[
                                        '"This post contains affiliate links"',
                                        '"I may earn a commission if you purchase through my link"',
                                        '"#ad" or "#affiliate" on social media posts',
                                    ].map((item) => (
                                        <div key={item} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                                            <span className="text-sm text-slate-600 italic">{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </SubSection>
                        </Section>

                        {/* Section 6 - Fees & Payments */}
                        <Section id="fees" number={6} title="Fees & Payments">
                            <p>Traaaction charges fees for the use of our platform:</p>

                            <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50">
                                            <th className="text-left py-4 px-5 font-medium text-slate-700">Fee Type</th>
                                            <th className="text-left py-4 px-5 font-medium text-slate-700">Amount</th>
                                            <th className="text-left py-4 px-5 font-medium text-slate-700">Paid By</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        <tr className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-5 text-slate-800 font-medium">Platform Fee</td>
                                            <td className="py-4 px-5 text-slate-600">15% of net transaction</td>
                                            <td className="py-4 px-5 text-slate-500">Startup</td>
                                        </tr>
                                        <tr className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-5 text-slate-800 font-medium">Payment Processing</td>
                                            <td className="py-4 px-5 text-slate-600">Stripe fees (passed through)</td>
                                            <td className="py-4 px-5 text-slate-500">Startup</td>
                                        </tr>
                                        <tr className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-5 text-slate-800 font-medium">Payout Fee</td>
                                            <td className="py-4 px-5 text-slate-600">Free (Stripe Connect)</td>
                                            <td className="py-4 px-5 text-slate-500">Seller</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <InfoCard variant="subtle" className="mt-6">
                                <p className="text-slate-500 text-sm">
                                    Platform fees are calculated on the net amount after Stripe processing fees and applicable taxes.
                                </p>
                            </InfoCard>
                        </Section>

                        {/* Section 7 - Commission Structure */}
                        <Section id="commissions" number={7} title="Commission Structure">
                            <p>Commissions are earned based on the program terms set by each Startup:</p>

                            <SubSection title="Commission Types">
                                <div className="grid gap-4 mt-4">
                                    {[
                                        { type: 'Sale Commission', desc: 'Percentage or flat rate per completed sale', example: 'e.g., 10% of sale or €5 per sale' },
                                        { type: 'Lead Commission', desc: 'Flat rate per qualified lead or signup', example: 'e.g., €3 per lead' },
                                        { type: 'Recurring Commission', desc: 'Commission on subscription renewals', example: 'e.g., 10% monthly for 12 months' },
                                    ].map((item) => (
                                        <div key={item.type} className="flex gap-4 p-5 rounded-xl bg-white border-l-4 border-blue-500 shadow-sm">
                                            <div>
                                                <div className="font-medium text-slate-800 mb-1">{item.type}</div>
                                                <div className="text-sm text-slate-500">{item.desc}</div>
                                                <div className="text-xs text-slate-400 mt-1">{item.example}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </SubSection>

                            <SubSection title="Commission Lifecycle">
                                <div className="grid gap-3 mt-4">
                                    {[
                                        { status: 'Pending', period: '0-30 days', desc: 'Commission created, subject to refund period' },
                                        { status: 'Approved', period: 'After hold period', desc: 'Commission cleared, ready for payout' },
                                        { status: 'Paid', period: 'Payout processed', desc: 'Transferred to Seller' },
                                    ].map((item) => (
                                        <div key={item.status} className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200">
                                            <div>
                                                <span className="font-medium text-slate-700">{item.status}</span>
                                                <span className="text-sm text-slate-400 ml-2">— {item.desc}</span>
                                            </div>
                                            <span className="text-sm font-mono text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{item.period}</span>
                                        </div>
                                    ))}
                                </div>
                            </SubSection>

                            <InfoCard className="mt-8">
                                <p className="text-slate-600">
                                    <span className="text-slate-800 font-semibold">Hold Period:</span> Commissions are held for 30 days (sales/recurring) or 3 days (leads) to account for refunds and chargebacks.
                                </p>
                            </InfoCard>
                        </Section>

                        {/* Section 8 - Intellectual Property */}
                        <Section id="intellectual" number={8} title="Intellectual Property">
                            <p>
                                All intellectual property rights in the Service, including but not limited to software, design,
                                logos, and content, are owned by Traaaction or our licensors.
                            </p>
                            <DataList items={[
                                'You may not copy, modify, or distribute our proprietary materials',
                                'You may not reverse engineer or decompile our software',
                                'You retain ownership of content you upload to the platform',
                                'You grant us a license to use your content to provide the Service',
                                'Trademarks and logos remain the property of their respective owners',
                            ]} className="mt-6" />
                        </Section>

                        {/* Section 9 - Prohibited Activities */}
                        <Section id="prohibited" number={9} title="Prohibited Activities">
                            <p>You agree not to engage in any of the following prohibited activities:</p>
                            <div className="grid md:grid-cols-2 gap-4 mt-8">
                                {[
                                    { title: 'Fraud', desc: 'Fake clicks, leads, self-referrals, or cookie stuffing' },
                                    { title: 'Spam', desc: 'Unsolicited emails, messages, or automated submissions' },
                                    { title: 'Deception', desc: 'Misleading advertising or false claims about products' },
                                    { title: 'Impersonation', desc: 'Pretending to be another person or entity' },
                                    { title: 'Hacking', desc: 'Attempting to access systems without authorization' },
                                    { title: 'Abuse', desc: 'Harassing other users or disrupting the Service' },
                                ].map((item) => (
                                    <div key={item.title} className="p-4 rounded-xl bg-red-50/50 border border-red-200/50">
                                        <div className="font-medium text-red-800 mb-1">{item.title}</div>
                                        <div className="text-sm text-red-600/70">{item.desc}</div>
                                    </div>
                                ))}
                            </div>
                            <InfoCard variant="subtle" className="mt-6">
                                <p className="text-slate-600 text-sm">
                                    <span className="text-red-600 font-medium">Warning:</span> Violation of these terms may result in immediate account termination, forfeiture of commissions, and legal action.
                                </p>
                            </InfoCard>
                        </Section>

                        {/* Section 10 - Termination */}
                        <Section id="termination" number={10} title="Termination">
                            <p>Either party may terminate the agreement under the following conditions:</p>

                            <SubSection title="Termination by You">
                                <DataList items={[
                                    'You may close your account at any time through account settings',
                                    'Startups must pay all outstanding commissions before closure',
                                    'Sellers will receive earned commissions after standard hold periods',
                                ]} />
                            </SubSection>

                            <SubSection title="Termination by Traaaction">
                                <DataList items={[
                                    'We may suspend or terminate accounts for Terms violations',
                                    'We may terminate with 30 days notice for any reason',
                                    'Immediate termination for fraud, illegal activity, or abuse',
                                ]} />
                            </SubSection>

                            <InfoCard className="mt-8">
                                <p className="text-slate-600">
                                    <span className="text-slate-800 font-semibold">Effect of Termination:</span> Upon termination, your right to use the Service ceases immediately. Provisions that should survive (payment obligations, limitations of liability) will remain in effect.
                                </p>
                            </InfoCard>
                        </Section>

                        {/* Section 11 - Disclaimers */}
                        <Section id="disclaimers" number={11} title="Disclaimers">
                            <p>
                                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
                                EITHER EXPRESS OR IMPLIED.
                            </p>
                            <DataList items={[
                                'We do not guarantee uninterrupted or error-free operation',
                                'We do not guarantee specific results or earnings',
                                'We are not responsible for third-party products or services',
                                'We do not endorse any Startup or Seller on the platform',
                                'Technical issues may temporarily affect tracking or payments',
                            ]} className="mt-6" />
                        </Section>

                        {/* Section 12 - Limitation of Liability */}
                        <Section id="liability" number={12} title="Limitation of Liability">
                            <p>
                                TO THE MAXIMUM EXTENT PERMITTED BY LAW, TRAAACTION SHALL NOT BE LIABLE FOR:
                            </p>
                            <DataList items={[
                                'Indirect, incidental, special, or consequential damages',
                                'Loss of profits, revenue, data, or business opportunities',
                                'Damages exceeding fees paid in the 12 months prior to the claim',
                                'Actions or omissions of other users on the platform',
                                'Service interruptions or data loss',
                            ]} className="mt-6" />

                            <InfoCard variant="subtle" className="mt-6">
                                <p className="text-slate-500 text-sm">
                                    Some jurisdictions do not allow limitation of liability for certain damages. In such cases, our liability is limited to the maximum extent permitted by applicable law.
                                </p>
                            </InfoCard>
                        </Section>

                        {/* Section 13 - Indemnification */}
                        <Section id="indemnification" number={13} title="Indemnification">
                            <p>
                                You agree to indemnify and hold harmless Traaaction and its officers, directors, employees,
                                and agents from any claims, damages, losses, or expenses arising from:
                            </p>
                            <DataList items={[
                                'Your use of the Service or violation of these Terms',
                                'Your violation of any third-party rights',
                                'Content you submit or transmit through the Service',
                                'Your negligence or willful misconduct',
                            ]} className="mt-6" />
                        </Section>

                        {/* Section 14 - Changes to Terms */}
                        <Section id="changes" number={14} title="Changes to Terms">
                            <p>We may modify these Terms at any time. When we make material changes:</p>
                            <DataList items={[
                                'We will post the updated Terms with a new effective date',
                                'We will notify registered users via email at least 30 days in advance',
                                'Continued use after the effective date constitutes acceptance',
                                'If you disagree with changes, you may close your account',
                            ]} className="mt-6" />
                        </Section>

                        {/* Section 15 - Contact */}
                        <Section id="contact" number={15} title="Contact Us">
                            <p>If you have any questions about these Terms of Service:</p>
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

                        {/* Governing Law */}
                        <Section id="governing" number={16} title="Governing Law">
                            <p>
                                These Terms shall be governed by and construed in accordance with the laws of France,
                                without regard to its conflict of law provisions.
                            </p>
                            <p className="mt-4">
                                Any disputes arising from these Terms or your use of the Service shall be subject to the
                                exclusive jurisdiction of the courts of Brest, France.
                            </p>
                            <InfoCard variant="subtle" className="mt-6">
                                <p className="text-slate-500 text-sm">
                                    For EU consumers: Nothing in these Terms affects your statutory rights under applicable consumer protection laws.
                                </p>
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
                                <Link href="/privacy" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
                                    Privacy Policy
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
                <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 shadow-lg shadow-slate-900/25 flex items-center justify-center text-white font-mono text-sm font-bold">
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
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500 mt-2" />
                    <span className="text-slate-500">{item}</span>
                </li>
            ))}
        </ul>
    )
}
