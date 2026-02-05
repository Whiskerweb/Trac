'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, UserCheck, Shield, CreditCard, Ban, AlertTriangle, Scale, Gavel, Clock, Mail, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

export default function SellerTermsPage() {
    const t = useTranslations('sellerTermsPage')
    const [activeSection, setActiveSection] = useState('eligibility')
    const [scrollProgress, setScrollProgress] = useState(0)

    const sections = [
        { id: 'eligibility', title: t('sidebar.eligibility'), icon: UserCheck },
        { id: 'obligations', title: t('sidebar.obligations'), icon: Shield },
        { id: 'commissions', title: t('sidebar.commissions'), icon: CreditCard },
        { id: 'hold-periods', title: t('sidebar.holdPeriods'), icon: Clock },
        { id: 'prohibited', title: t('sidebar.prohibited'), icon: Ban },
        { id: 'fraud', title: t('sidebar.fraud'), icon: AlertTriangle },
        { id: 'termination', title: t('sidebar.termination'), icon: Gavel },
        { id: 'liability', title: t('sidebar.liability'), icon: Scale },
        { id: 'contact', title: t('sidebar.contact'), icon: Mail },
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

                    <div className="px-6 lg:px-16 py-16 space-y-24">
                        <div className="max-w-3xl">
                            <p className="text-lg text-slate-600 leading-relaxed">
                                {t.rich('intro.text', {
                                    termsLink: (chunks) => <Link href="/terms" className="text-emerald-600 hover:text-emerald-700">{chunks}</Link>
                                })}
                            </p>
                        </div>

                        {/* 1 - Eligibility */}
                        <Section id="eligibility" number={1} title={t('section1.title')}>
                            <p>{t('section1.intro')}</p>
                            <DataList items={Array.from({ length: Number(t('section1.itemCount')) }, (_, i) => t(`section1.items.${i}`))} className="mt-6" />
                            <InfoCard className="mt-8">
                                <p className="text-slate-600">
                                    <span className="text-slate-800 font-semibold">{t('section1.infoCard.title')}</span> {t('section1.infoCard.text')}
                                </p>
                            </InfoCard>
                        </Section>

                        {/* 2 - Obligations */}
                        <Section id="obligations" number={2} title={t('section2.title')}>
                            <p>{t('section2.intro')}</p>

                            <SubSection title={t('section2.sub1.title')}>
                                <DataList items={Array.from({ length: Number(t('section2.sub1.itemCount')) }, (_, i) => t(`section2.sub1.items.${i}`))} />
                            </SubSection>

                            <SubSection title={t('section2.sub2.title')}>
                                <DataList items={Array.from({ length: Number(t('section2.sub2.itemCount')) }, (_, i) => t(`section2.sub2.items.${i}`))} />
                            </SubSection>

                            <SubSection title={t('section2.sub3.title')}>
                                <DataList items={Array.from({ length: Number(t('section2.sub3.itemCount')) }, (_, i) => t(`section2.sub3.items.${i}`))} />
                            </SubSection>
                        </Section>

                        {/* 3 - Commissions */}
                        <Section id="commissions" number={3} title={t('section3.title')}>
                            <p>{t('section3.intro')}</p>

                            <div className="grid gap-4 mt-8">
                                {Array.from({ length: Number(t('section3.typesCount')) }, (_, i) => (
                                    <div key={i} className="flex gap-4 p-5 rounded-xl bg-white border-l-4 border-emerald-500 shadow-sm">
                                        <div>
                                            <div className="font-medium text-slate-800 mb-1">{t(`section3.types.${i}.type`)}</div>
                                            <div className="text-sm text-slate-500">{t(`section3.types.${i}.desc`)}</div>
                                            <div className="text-xs text-slate-400 mt-1">{t(`section3.types.${i}.example`)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <SubSection title={t('section3.payoutMethods.title')}>
                                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm mt-4">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-50">
                                                <th className="text-left py-4 px-5 font-medium text-slate-700">{t('section3.payoutMethods.headerMethod')}</th>
                                                <th className="text-left py-4 px-5 font-medium text-slate-700">{t('section3.payoutMethods.headerMinimum')}</th>
                                                <th className="text-left py-4 px-5 font-medium text-slate-700">{t('section3.payoutMethods.headerFrequency')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {Array.from({ length: Number(t('section3.payoutMethods.rowCount')) }, (_, i) => (
                                                <tr key={i}>
                                                    <td className="py-4 px-5 text-slate-800 font-medium">{t(`section3.payoutMethods.rows.${i}.method`)}</td>
                                                    <td className="py-4 px-5 text-slate-600">{t(`section3.payoutMethods.rows.${i}.minimum`)}</td>
                                                    <td className="py-4 px-5 text-slate-500">{t(`section3.payoutMethods.rows.${i}.frequency`)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </SubSection>

                            <InfoCard variant="subtle" className="mt-6">
                                <p className="text-slate-600 text-sm">
                                    <span className="text-slate-800 font-medium">{t('section3.walletInfo.title')}</span> {t('section3.walletInfo.text')}
                                </p>
                            </InfoCard>
                        </Section>

                        {/* 4 - Hold Periods */}
                        <Section id="hold-periods" number={4} title={t('section4.title')}>
                            <p>{t('section4.intro')}</p>

                            <div className="grid gap-3 mt-8">
                                {Array.from({ length: Number(t('section4.periodsCount')) }, (_, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200">
                                        <div>
                                            <span className="font-medium text-slate-700">{t(`section4.periods.${i}.type`)}</span>
                                            <span className="text-sm text-slate-400 ml-2">&mdash; {t(`section4.periods.${i}.reason`)}</span>
                                        </div>
                                        <span className="text-sm font-mono text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">{t(`section4.periods.${i}.period`)}</span>
                                    </div>
                                ))}
                            </div>

                            <SubSection title={t('section4.clawback.title')}>
                                <p className="text-slate-500 mb-4">{t('section4.clawback.intro')}</p>
                                <DataList items={Array.from({ length: Number(t('section4.clawback.itemCount')) }, (_, i) => t(`section4.clawback.items.${i}`))} />
                            </SubSection>

                            <InfoCard className="mt-8">
                                <p className="text-slate-600">
                                    <span className="text-slate-800 font-semibold">{t('section4.infoCard.title')}</span> {t('section4.infoCard.text')}
                                </p>
                            </InfoCard>
                        </Section>

                        {/* 5 - Prohibited */}
                        <Section id="prohibited" number={5} title={t('section5.title')}>
                            <p>{t('section5.intro')}</p>
                            <div className="grid md:grid-cols-2 gap-4 mt-8">
                                {Array.from({ length: Number(t('section5.itemCount')) }, (_, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-red-50/50 border border-red-200/50">
                                        <div className="font-medium text-red-800 mb-1">{t(`section5.items.${i}.title`)}</div>
                                        <div className="text-sm text-red-600/70">{t(`section5.items.${i}.desc`)}</div>
                                    </div>
                                ))}
                            </div>
                        </Section>

                        {/* 6 - Fraud */}
                        <Section id="fraud" number={6} title={t('section6.title')}>
                            <p>{t('section6.intro')}</p>
                            <DataList items={Array.from({ length: Number(t('section6.itemCount')) }, (_, i) => t(`section6.items.${i}`))} className="mt-6" />

                            <InfoCard variant="subtle" className="mt-6">
                                <p className="text-slate-600 text-sm">
                                    <span className="text-slate-800 font-medium">{t('section6.infoCard.title')}</span> {t.rich('section6.infoCard.text', {
                                        email: (chunks) => <a href="mailto:contact@traaaction.com" className="text-emerald-600 hover:text-emerald-700">{chunks}</a>
                                    })}
                                </p>
                            </InfoCard>
                        </Section>

                        {/* 7 - Termination */}
                        <Section id="termination" number={7} title={t('section7.title')}>
                            <SubSection title={t('section7.sub1.title')}>
                                <DataList items={Array.from({ length: Number(t('section7.sub1.itemCount')) }, (_, i) => t(`section7.sub1.items.${i}`))} />
                            </SubSection>

                            <SubSection title={t('section7.sub2.title')}>
                                <DataList items={Array.from({ length: Number(t('section7.sub2.itemCount')) }, (_, i) => t(`section7.sub2.items.${i}`))} />
                            </SubSection>

                            <SubSection title={t('section7.sub3.title')}>
                                <DataList items={Array.from({ length: Number(t('section7.sub3.itemCount')) }, (_, i) => t(`section7.sub3.items.${i}`))} />
                            </SubSection>
                        </Section>

                        {/* 8 - Liability */}
                        <Section id="liability" number={8} title={t('section8.title')}>
                            <p>{t('section8.intro')}</p>
                            <DataList items={Array.from({ length: Number(t('section8.itemCount')) }, (_, i) => t(`section8.items.${i}`))} className="mt-6" />

                            <InfoCard className="mt-8">
                                <p className="text-slate-600">
                                    <span className="text-slate-800 font-semibold">{t('section8.infoCard.title')}</span> {t('section8.infoCard.text')}
                                </p>
                            </InfoCard>
                        </Section>

                        {/* 9 - Contact */}
                        <Section id="contact" number={9} title={t('section9.title')}>
                            <p>{t('section9.intro')}</p>
                            <InfoCard className="mt-6">
                                <div className="font-semibold text-slate-800 text-lg mb-3">Traaaction</div>
                                <div className="text-slate-500 space-y-1 mb-4">
                                    <p>{t('section9.address.line1')}</p>
                                    <p>{t('section9.address.line2')}</p>
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
                            <p className="text-sm text-slate-400">{t('footer.copyright', { year: new Date().getFullYear() })}</p>
                            <div className="flex items-center gap-6">
                                <Link href="/startup-terms" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">{t('footer.startupTerms')}</Link>
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
