'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, FileText, Users, CreditCard, Shield, AlertTriangle, Scale, Gavel, RefreshCw, Mail, ChevronRight, Building2, UserCheck, Ban, FileWarning, Handshake } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { useTranslations } from 'next-intl'

const sectionIds = [
    { id: 'acceptance', icon: FileText },
    { id: 'description', icon: Building2 },
    { id: 'accounts', icon: Users },
    { id: 'startups', icon: Building2 },
    { id: 'sellers', icon: UserCheck },
    { id: 'fees', icon: CreditCard },
    { id: 'commissions', icon: Scale },
    { id: 'intellectual', icon: Shield },
    { id: 'prohibited', icon: Ban },
    { id: 'termination', icon: FileWarning },
    { id: 'disclaimers', icon: AlertTriangle },
    { id: 'liability', icon: Gavel },
    { id: 'indemnification', icon: Handshake },
    { id: 'changes', icon: RefreshCw },
    { id: 'contact', icon: Mail },
]

export default function TermsOfServicePage() {
    const t = useTranslations('termsPage')
    const [activeSection, setActiveSection] = useState('acceptance')
    const [scrollProgress, setScrollProgress] = useState(0)
    const contentRef = useRef<HTMLDivElement>(null)

    const sections = sectionIds.map(s => ({
        ...s,
        title: t(`sections.${s.id}`),
    }))

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
    }, [sections])

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
                        <span>{t('header.backToHome')}</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <Image
                            src="/Logotrac/Logo5.png"
                            alt="Traaaction"
                            width={24}
                            height={24}
                            className="rounded-md"
                        />
                        <span className="text-sm font-medium text-slate-500">{t('header.legal')}</span>
                    </div>
                </div>
            </header>

            {/* Main layout */}
            <div className="pt-20 flex">
                {/* Left sidebar - Navigation spine */}
                <aside className="hidden lg:block fixed left-0 top-20 bottom-0 w-72 bg-white/50 backdrop-blur-sm border-r border-slate-200/50 overflow-y-auto">
                    <div className="p-6 pt-12">
                        <div className="text-xs uppercase tracking-widest text-slate-400 mb-6 font-medium">
                            {t('sidebar.toc')}
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
                                {t('hero.badge')}
                            </div>
                            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
                                {t('hero.titleLine1')}
                                <span className="block text-slate-300">{t('hero.titleLine2')}</span>
                            </h1>
                            <p className="text-lg text-slate-500 leading-relaxed max-w-xl mb-8">
                                {t('hero.subtitle')}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-slate-400">
                                <span>{t('hero.effectiveDateLabel')}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                <span className="text-slate-600 font-medium">{t('hero.effectiveDate')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Content sections */}
                    <div className="px-6 lg:px-16 py-16 space-y-24">
                        {/* Introduction */}
                        <div className="max-w-3xl">
                            <p className="text-lg text-slate-600 leading-relaxed">
                                {t('intro.p1')}
                            </p>
                            <p className="text-slate-500 leading-relaxed mt-4">
                                {t('intro.p2')}
                            </p>
                        </div>

                        {/* Section 1 - Acceptance */}
                        <Section id="acceptance" number={1} title={t('sections.acceptance')}>
                            <p>
                                {t('acceptance.p1_before')}{' '}
                                <Link href="/privacy" className="text-blue-600 hover:text-blue-700">{t('acceptance.privacyPolicyLink')}</Link>.
                                {' '}{t('acceptance.p1_after')}
                            </p>
                            <InfoCard variant="subtle" className="mt-6">
                                <p className="text-slate-600 text-sm">
                                    <span className="text-slate-800 font-medium">{t('acceptance.importantLabel')}</span> {t('acceptance.importantText')}
                                </p>
                            </InfoCard>
                            <p className="mt-4">
                                {t('acceptance.p2')}
                            </p>
                        </Section>

                        {/* Section 2 - Description */}
                        <Section id="description" number={2} title={t('sections.description')}>
                            <p>
                                {t('description.intro')}
                            </p>
                            <div className="grid md:grid-cols-2 gap-4 mt-8">
                                {Array.from({ length: Number(t('description.serviceCount')) }, (_, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all">
                                        <div className="font-medium text-slate-800 mb-1">{t(`description.services.${i}.title`)}</div>
                                        <div className="text-sm text-slate-500">{t(`description.services.${i}.desc`)}</div>
                                    </div>
                                ))}
                            </div>
                        </Section>

                        {/* Section 3 - Accounts */}
                        <Section id="accounts" number={3} title={t('sections.accounts')}>
                            <p>{t('accounts.intro')}</p>
                            <DataList items={Array.from({ length: Number(t('accounts.itemCount')) }, (_, i) => t(`accounts.items.${i}`))} className="mt-6" />

                            <SubSection title={t('accounts.accountTypesTitle')}>
                                <div className="grid md:grid-cols-2 gap-6 mt-4">
                                    <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-white border border-blue-200">
                                        <div className="text-xs uppercase tracking-widest text-blue-600 mb-3 font-medium">{t('accounts.startup.label')}</div>
                                        <div className="text-xl font-bold text-slate-800 mb-2">{t('accounts.startup.title')}</div>
                                        <p className="text-sm text-slate-500">
                                            {t('accounts.startup.desc')}
                                        </p>
                                    </div>
                                    <div className="p-6 rounded-xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-200">
                                        <div className="text-xs uppercase tracking-widest text-emerald-600 mb-3 font-medium">{t('accounts.seller.label')}</div>
                                        <div className="text-xl font-bold text-slate-800 mb-2">{t('accounts.seller.title')}</div>
                                        <p className="text-sm text-slate-500">
                                            {t('accounts.seller.desc')}
                                        </p>
                                    </div>
                                </div>
                            </SubSection>
                        </Section>

                        {/* Section 4 - Startup Obligations */}
                        <Section id="startups" number={4} title={t('sections.startups')}>
                            <p>{t('startups.intro')}</p>
                            <DataList items={Array.from({ length: Number(t('startups.itemCount')) }, (_, i) => t(`startups.items.${i}`))} className="mt-6" />

                            <InfoCard className="mt-8">
                                <p className="text-slate-600">
                                    <span className="text-slate-800 font-semibold">{t('startups.paymentLabel')}</span> {t('startups.paymentText')}
                                </p>
                            </InfoCard>
                        </Section>

                        {/* Section 5 - Seller Obligations */}
                        <Section id="sellers" number={5} title={t('sections.sellers')}>
                            <p>{t('sellers.intro')}</p>
                            <DataList items={Array.from({ length: Number(t('sellers.itemCount')) }, (_, i) => t(`sellers.items.${i}`))} className="mt-6" />

                            <SubSection title={t('sellers.disclosureTitle')}>
                                <p className="text-slate-500 mb-4">
                                    {t('sellers.disclosureIntro')}
                                </p>
                                <div className="space-y-3">
                                    {Array.from({ length: Number(t('sellers.disclosureCount')) }, (_, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                                            <span className="text-sm text-slate-600 italic">{t(`sellers.disclosures.${i}`)}</span>
                                        </div>
                                    ))}
                                </div>
                            </SubSection>
                        </Section>

                        {/* Section 6 - Fees & Payments */}
                        <Section id="fees" number={6} title={t('sections.fees')}>
                            <p>{t('fees.intro')}</p>

                            <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50">
                                            <th className="text-left py-4 px-5 font-medium text-slate-700">{t('fees.table.colType')}</th>
                                            <th className="text-left py-4 px-5 font-medium text-slate-700">{t('fees.table.colAmount')}</th>
                                            <th className="text-left py-4 px-5 font-medium text-slate-700">{t('fees.table.colPaidBy')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {Array.from({ length: Number(t('fees.table.rowCount')) }, (_, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-4 px-5 text-slate-800 font-medium">{t(`fees.table.rows.${i}.type`)}</td>
                                                <td className="py-4 px-5 text-slate-600">{t(`fees.table.rows.${i}.amount`)}</td>
                                                <td className="py-4 px-5 text-slate-500">{t(`fees.table.rows.${i}.paidBy`)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <InfoCard variant="subtle" className="mt-6">
                                <p className="text-slate-500 text-sm">
                                    {t('fees.note')}
                                </p>
                            </InfoCard>
                        </Section>

                        {/* Section 7 - Commission Structure */}
                        <Section id="commissions" number={7} title={t('sections.commissions')}>
                            <p>{t('commissions.intro')}</p>

                            <SubSection title={t('commissions.typesTitle')}>
                                <div className="grid gap-4 mt-4">
                                    {Array.from({ length: Number(t('commissions.typeCount')) }, (_, i) => (
                                        <div key={i} className="flex gap-4 p-5 rounded-xl bg-white border-l-4 border-blue-500 shadow-sm">
                                            <div>
                                                <div className="font-medium text-slate-800 mb-1">{t(`commissions.types.${i}.type`)}</div>
                                                <div className="text-sm text-slate-500">{t(`commissions.types.${i}.desc`)}</div>
                                                <div className="text-xs text-slate-400 mt-1">{t(`commissions.types.${i}.example`)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </SubSection>

                            <SubSection title={t('commissions.lifecycleTitle')}>
                                <div className="grid gap-3 mt-4">
                                    {Array.from({ length: Number(t('commissions.lifecycleCount')) }, (_, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200">
                                            <div>
                                                <span className="font-medium text-slate-700">{t(`commissions.lifecycle.${i}.status`)}</span>
                                                <span className="text-sm text-slate-400 ml-2">— {t(`commissions.lifecycle.${i}.desc`)}</span>
                                            </div>
                                            <span className="text-sm font-mono text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{t(`commissions.lifecycle.${i}.period`)}</span>
                                        </div>
                                    ))}
                                </div>
                            </SubSection>

                            <InfoCard className="mt-8">
                                <p className="text-slate-600">
                                    <span className="text-slate-800 font-semibold">{t('commissions.holdLabel')}</span> {t('commissions.holdText')}
                                </p>
                            </InfoCard>
                        </Section>

                        {/* Section 8 - Intellectual Property */}
                        <Section id="intellectual" number={8} title={t('sections.intellectual')}>
                            <p>
                                {t('intellectual.intro')}
                            </p>
                            <DataList items={Array.from({ length: Number(t('intellectual.itemCount')) }, (_, i) => t(`intellectual.items.${i}`))} className="mt-6" />
                        </Section>

                        {/* Section 9 - Prohibited Activities */}
                        <Section id="prohibited" number={9} title={t('sections.prohibited')}>
                            <p>{t('prohibited.intro')}</p>
                            <div className="grid md:grid-cols-2 gap-4 mt-8">
                                {Array.from({ length: Number(t('prohibited.activityCount')) }, (_, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-red-50/50 border border-red-200/50">
                                        <div className="font-medium text-red-800 mb-1">{t(`prohibited.activities.${i}.title`)}</div>
                                        <div className="text-sm text-red-600/70">{t(`prohibited.activities.${i}.desc`)}</div>
                                    </div>
                                ))}
                            </div>
                            <InfoCard variant="subtle" className="mt-6">
                                <p className="text-slate-600 text-sm">
                                    <span className="text-red-600 font-medium">{t('prohibited.warningLabel')}</span> {t('prohibited.warningText')}
                                </p>
                            </InfoCard>
                        </Section>

                        {/* Section 10 - Termination */}
                        <Section id="termination" number={10} title={t('sections.termination')}>
                            <p>{t('termination.intro')}</p>

                            <SubSection title={t('termination.byYouTitle')}>
                                <DataList items={Array.from({ length: Number(t('termination.byYouCount')) }, (_, i) => t(`termination.byYou.${i}`))} />
                            </SubSection>

                            <SubSection title={t('termination.byUsTitle')}>
                                <DataList items={Array.from({ length: Number(t('termination.byUsCount')) }, (_, i) => t(`termination.byUs.${i}`))} />
                            </SubSection>

                            <InfoCard className="mt-8">
                                <p className="text-slate-600">
                                    <span className="text-slate-800 font-semibold">{t('termination.effectLabel')}</span> {t('termination.effectText')}
                                </p>
                            </InfoCard>
                        </Section>

                        {/* Section 11 - Disclaimers */}
                        <Section id="disclaimers" number={11} title={t('sections.disclaimers')}>
                            <p>
                                {t('disclaimers.intro')}
                            </p>
                            <DataList items={Array.from({ length: Number(t('disclaimers.itemCount')) }, (_, i) => t(`disclaimers.items.${i}`))} className="mt-6" />
                        </Section>

                        {/* Section 12 - Limitation of Liability */}
                        <Section id="liability" number={12} title={t('sections.liability')}>
                            <p>
                                {t('liability.intro')}
                            </p>
                            <DataList items={Array.from({ length: Number(t('liability.itemCount')) }, (_, i) => t(`liability.items.${i}`))} className="mt-6" />

                            <InfoCard variant="subtle" className="mt-6">
                                <p className="text-slate-500 text-sm">
                                    {t('liability.note')}
                                </p>
                            </InfoCard>
                        </Section>

                        {/* Section 13 - Indemnification */}
                        <Section id="indemnification" number={13} title={t('sections.indemnification')}>
                            <p>
                                {t('indemnification.intro')}
                            </p>
                            <DataList items={Array.from({ length: Number(t('indemnification.itemCount')) }, (_, i) => t(`indemnification.items.${i}`))} className="mt-6" />
                        </Section>

                        {/* Section 14 - Changes to Terms */}
                        <Section id="changes" number={14} title={t('sections.changes')}>
                            <p>{t('changes.intro')}</p>
                            <DataList items={Array.from({ length: Number(t('changes.itemCount')) }, (_, i) => t(`changes.items.${i}`))} className="mt-6" />
                        </Section>

                        {/* Section 15 - Contact */}
                        <Section id="contact" number={15} title={t('sections.contact')}>
                            <p>{t('contact.intro')}</p>
                            <InfoCard className="mt-6">
                                <div className="font-semibold text-slate-800 text-lg mb-3">Traaaction</div>
                                <div className="text-slate-500 space-y-1 mb-4">
                                    <p>{t('contact.address1')}</p>
                                    <p>{t('contact.address2')}</p>
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
                        <Section id="governing" number={16} title={t('sections.governing')}>
                            <p>
                                {t('governing.p1')}
                            </p>
                            <p className="mt-4">
                                {t('governing.p2')}
                            </p>
                            <InfoCard variant="subtle" className="mt-6">
                                <p className="text-slate-500 text-sm">
                                    {t('governing.note')}
                                </p>
                            </InfoCard>
                        </Section>
                    </div>

                    {/* Footer */}
                    <footer className="border-t border-slate-200 bg-white px-6 lg:px-16 py-12">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <p className="text-sm text-slate-400">
                                {t('footer.copyright', { year: new Date().getFullYear() })}
                            </p>
                            <div className="flex items-center gap-6">
                                <Link href="/privacy" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
                                    {t('footer.privacy')}
                                </Link>
                                <Link href="/" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
                                    {t('footer.home')}
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
