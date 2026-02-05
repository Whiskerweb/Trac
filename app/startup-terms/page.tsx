'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Building2, Shield, CreditCard, Clock, Users, AlertTriangle, Scale, Gavel, RefreshCw, Mail, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

export default function StartupTermsPage() {
    const t = useTranslations('startupTermsPage')
    const [activeSection, setActiveSection] = useState('eligibility')
    const [scrollProgress, setScrollProgress] = useState(0)

    const sections = [
        { id: 'eligibility', title: t('sections.eligibility'), icon: Building2 },
        { id: 'obligations', title: t('sections.obligations'), icon: Shield },
        { id: 'programs', title: t('sections.programs'), icon: Users },
        { id: 'fees', title: t('sections.fees'), icon: CreditCard },
        { id: 'commissions', title: t('sections.commissions'), icon: Clock },
        { id: 'tracking', title: t('sections.tracking'), icon: RefreshCw },
        { id: 'sellers', title: t('sections.sellers'), icon: Users },
        { id: 'prohibited', title: t('sections.prohibited'), icon: AlertTriangle },
        { id: 'termination', title: t('sections.termination'), icon: Gavel },
        { id: 'liability', title: t('sections.liability'), icon: Scale },
        { id: 'contact', title: t('sections.contact'), icon: Mail },
    ]

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
                        <span>{t('header.backToTraaaction')}</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <Image src="/Logotrac/Logo5.png" alt="Traaaction" width={24} height={24} className="rounded-md" />
                        <span className="text-sm font-medium text-slate-500">{t('header.legal')}</span>
                    </div>
                </div>
            </header>

            <div className="pt-20 flex">
                <aside className="hidden lg:block fixed left-0 top-20 bottom-0 w-72 bg-white/50 backdrop-blur-sm border-r border-slate-200/50 overflow-y-auto">
                    <div className="p-6 pt-12">
                        <div className="text-xs uppercase tracking-widest text-slate-400 mb-6 font-medium">{t('sidebar.toc')}</div>
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
                                {t('hero.badge')}
                            </div>
                            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
                                {t('hero.title')}
                                <span className="block text-slate-300">{t('hero.titleAccent')}</span>
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

                    <div className="px-6 lg:px-16 py-16 space-y-24">
                        <div className="max-w-3xl">
                            <p className="text-lg text-slate-600 leading-relaxed">
                                {t.rich('intro', {
                                    termsLink: (chunks) => <Link href="/terms" className="text-blue-600 hover:text-blue-700">{chunks}</Link>
                                })}
                            </p>
                        </div>

                        {/* 1 - Eligibility */}
                        <Section id="eligibility" number={1} title={t('sections.eligibility')}>
                            <p>{t('eligibility.intro')}</p>
                            <DataList items={Array.from({ length: 5 }, (_, i) => t(`eligibility.items.${i}`))} className="mt-6" />
                            <InfoCard className="mt-8">
                                <p className="text-slate-600">
                                    <span className="text-slate-800 font-semibold">{t('eligibility.infoCardLabel')}</span> {t('eligibility.infoCardText')}
                                </p>
                            </InfoCard>
                        </Section>

                        {/* 2 - Obligations */}
                        <Section id="obligations" number={2} title={t('sections.obligations')}>
                            <p>{t('obligations.intro')}</p>

                            <SubSection title={t('obligations.programIntegrity.title')}>
                                <DataList items={Array.from({ length: 5 }, (_, i) => t(`obligations.programIntegrity.items.${i}`))} />
                            </SubSection>

                            <SubSection title={t('obligations.financialObligations.title')}>
                                <DataList items={Array.from({ length: 4 }, (_, i) => t(`obligations.financialObligations.items.${i}`))} />
                            </SubSection>

                            <SubSection title={t('obligations.legalCompliance.title')}>
                                <DataList items={Array.from({ length: 5 }, (_, i) => t(`obligations.legalCompliance.items.${i}`))} />
                            </SubSection>
                        </Section>

                        {/* 3 - Programs */}
                        <Section id="programs" number={3} title={t('sections.programs')}>
                            <p>{t('programs.intro')}</p>

                            <div className="grid md:grid-cols-2 gap-6 mt-8">
                                <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-white border border-blue-200">
                                    <div className="text-xs uppercase tracking-widest text-blue-600 mb-3 font-medium">{t('programs.setup.title')}</div>
                                    <DataList items={Array.from({ length: 4 }, (_, i) => t(`programs.setup.items.${i}`))} />
                                </div>
                                <div className="p-6 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200">
                                    <div className="text-xs uppercase tracking-widest text-slate-600 mb-3 font-medium">{t('programs.changes.title')}</div>
                                    <DataList items={Array.from({ length: 4 }, (_, i) => t(`programs.changes.items.${i}`))} />
                                </div>
                            </div>

                            <InfoCard variant="subtle" className="mt-6">
                                <p className="text-slate-600 text-sm">
                                    <span className="text-slate-800 font-medium">{t('programs.infoCardLabel')}</span> {t('programs.infoCardText')}
                                </p>
                            </InfoCard>
                        </Section>

                        {/* 4 - Fees */}
                        <Section id="fees" number={4} title={t('sections.fees')}>
                            <p>{t('fees.intro')}</p>

                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm mt-8">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50">
                                            <th className="text-left py-4 px-5 font-medium text-slate-700">{t('fees.table.headerFee')}</th>
                                            <th className="text-left py-4 px-5 font-medium text-slate-700">{t('fees.table.headerAmount')}</th>
                                            <th className="text-left py-4 px-5 font-medium text-slate-700">{t('fees.table.headerCalculation')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        <tr><td className="py-4 px-5 text-slate-800 font-medium">{t('fees.table.rows.0.fee')}</td><td className="py-4 px-5 text-slate-600">{t('fees.table.rows.0.amount')}</td><td className="py-4 px-5 text-slate-500">{t('fees.table.rows.0.calculation')}</td></tr>
                                        <tr><td className="py-4 px-5 text-slate-800 font-medium">{t('fees.table.rows.1.fee')}</td><td className="py-4 px-5 text-slate-600">{t('fees.table.rows.1.amount')}</td><td className="py-4 px-5 text-slate-500">{t('fees.table.rows.1.calculation')}</td></tr>
                                        <tr><td className="py-4 px-5 text-slate-800 font-medium">{t('fees.table.rows.2.fee')}</td><td className="py-4 px-5 text-slate-600">{t('fees.table.rows.2.amount')}</td><td className="py-4 px-5 text-slate-500">{t('fees.table.rows.2.calculation')}</td></tr>
                                    </tbody>
                                </table>
                            </div>

                            <SubSection title={t('fees.paymentProcess.title')}>
                                <div className="grid gap-3 mt-4">
                                    {Array.from({ length: 5 }, (_, i) => (
                                        <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-200">
                                            <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-mono text-xs font-bold">{i + 1}</span>
                                            <span className="text-slate-600 pt-0.5">{t(`fees.paymentProcess.steps.${i}`)}</span>
                                        </div>
                                    ))}
                                </div>
                            </SubSection>

                            <InfoCard className="mt-8">
                                <p className="text-slate-600">
                                    <span className="text-red-600 font-semibold">{t('fees.latePaymentLabel')}</span> {t('fees.latePaymentText')}
                                </p>
                            </InfoCard>
                        </Section>

                        {/* 5 - Commission Responsibilities */}
                        <Section id="commissions" number={5} title={t('sections.commissions')}>
                            <p>{t('commissions.intro')}</p>
                            <DataList items={Array.from({ length: 5 }, (_, i) => t(`commissions.items.${i}`))} className="mt-6" />

                            <InfoCard variant="subtle" className="mt-6">
                                <p className="text-slate-600 text-sm">
                                    <span className="text-slate-800 font-medium">{t('commissions.infoCardLabel')}</span> {t('commissions.infoCardText')}
                                </p>
                            </InfoCard>
                        </Section>

                        {/* 6 - Tracking */}
                        <Section id="tracking" number={6} title={t('sections.tracking')}>
                            <p>{t('tracking.intro')}</p>
                            <DataList items={Array.from({ length: 5 }, (_, i) => t(`tracking.items.${i}`))} className="mt-6" />

                            <SubSection title={t('tracking.attributionModel.title')}>
                                <p className="text-slate-500 mb-4">{t.rich('tracking.attributionModel.description', {
                                    strong: (chunks) => <span className="text-slate-700 font-medium">{chunks}</span>
                                })}</p>
                                <DataList items={Array.from({ length: 4 }, (_, i) => t(`tracking.attributionModel.items.${i}`))} />
                            </SubSection>
                        </Section>

                        {/* 7 - Seller Management */}
                        <Section id="sellers" number={7} title={t('sections.sellers')}>
                            <p>{t('sellers.intro')}</p>
                            <DataList items={Array.from({ length: 5 }, (_, i) => t(`sellers.items.${i}`))} className="mt-6" />

                            <InfoCard className="mt-8">
                                <p className="text-slate-600">
                                    <span className="text-slate-800 font-semibold">{t('sellers.infoCardLabel')}</span> {t('sellers.infoCardText')}
                                </p>
                            </InfoCard>
                        </Section>

                        {/* 8 - Prohibited */}
                        <Section id="prohibited" number={8} title={t('sections.prohibited')}>
                            <p>{t('prohibited.intro')}</p>
                            <div className="grid md:grid-cols-2 gap-4 mt-8">
                                {Array.from({ length: 6 }, (_, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-red-50/50 border border-red-200/50">
                                        <div className="font-medium text-red-800 mb-1">{t(`prohibited.items.${i}.title`)}</div>
                                        <div className="text-sm text-red-600/70">{t(`prohibited.items.${i}.desc`)}</div>
                                    </div>
                                ))}
                            </div>
                        </Section>

                        {/* 9 - Termination */}
                        <Section id="termination" number={9} title={t('sections.termination')}>
                            <SubSection title={t('termination.voluntaryClosure.title')}>
                                <DataList items={Array.from({ length: 4 }, (_, i) => t(`termination.voluntaryClosure.items.${i}`))} />
                            </SubSection>

                            <SubSection title={t('termination.terminationByTraaaction.title')}>
                                <DataList items={Array.from({ length: 3 }, (_, i) => t(`termination.terminationByTraaaction.items.${i}`))} />
                            </SubSection>

                            <InfoCard className="mt-8">
                                <p className="text-slate-600">
                                    <span className="text-red-600 font-semibold">{t('termination.infoCardLabel')}</span> {t('termination.infoCardText')}
                                </p>
                            </InfoCard>
                        </Section>

                        {/* 10 - Liability */}
                        <Section id="liability" number={10} title={t('sections.liability')}>
                            <p>{t('liability.intro')}</p>
                            <DataList items={Array.from({ length: 5 }, (_, i) => t(`liability.items.${i}`))} className="mt-6" />

                            <SubSection title={t('liability.indemnification.title')}>
                                <p className="text-slate-500">
                                    {t('liability.indemnification.text')}
                                </p>
                            </SubSection>
                        </Section>

                        {/* 11 - Contact */}
                        <Section id="contact" number={11} title={t('sections.contact')}>
                            <p>{t('contact.intro')}</p>
                            <InfoCard className="mt-6">
                                <div className="font-semibold text-slate-800 text-lg mb-3">Traaaction</div>
                                <div className="text-slate-500 space-y-1 mb-4">
                                    <p>{t('contact.addressLine1')}</p>
                                    <p>{t('contact.addressLine2')}</p>
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
                            <p className="text-sm text-slate-400">&copy; {new Date().getFullYear()} Traaaction. {t('footer.allRightsReserved')}</p>
                            <div className="flex items-center gap-6">
                                <Link href="/seller-terms" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">{t('footer.sellerTerms')}</Link>
                                <Link href="/terms" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">{t('footer.generalTerms')}</Link>
                                <Link href="/privacy" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">{t('footer.privacy')}</Link>
                                <Link href="/" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">{t('footer.home')}</Link>
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
