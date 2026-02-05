'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Shield, Database, Cookie, Scale, Globe, Clock, UserCheck, Users, Lock, Baby, RefreshCw, Mail, ChevronRight } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { useTranslations } from 'next-intl'

const sectionIds = [
    { id: 'controller', icon: Shield },
    { id: 'collection', icon: Database },
    { id: 'cookies', icon: Cookie },
    { id: 'usage', icon: Scale },
    { id: 'legal-basis', icon: Scale },
    { id: 'sharing', icon: Users },
    { id: 'transfers', icon: Globe },
    { id: 'retention', icon: Clock },
    { id: 'rights', icon: UserCheck },
    { id: 'roles', icon: Users },
    { id: 'security', icon: Lock },
    { id: 'children', icon: Baby },
    { id: 'changes', icon: RefreshCw },
    { id: 'contact', icon: Mail },
]

export default function PrivacyPolicyPage() {
    const t = useTranslations('privacyPage')
    const [activeSection, setActiveSection] = useState('controller')
    const [scrollProgress, setScrollProgress] = useState(0)
    const contentRef = useRef<HTMLDivElement>(null)

    const sections = sectionIds.map((s) => ({
        ...s,
        title: t(`sections.${s.id}`),
    }))

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
                        <span>{t('header.backToTraaaction')}</span>
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
                            {t('sidebar.tableOfContents')}
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
                                <span>{t('hero.lastUpdatedLabel')}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                <span className="text-slate-600 font-medium">{t('hero.lastUpdatedDate')}</span>
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

                        {/* Section 1 - Data Controller */}
                        <Section id="controller" number={1} title={t('sections.controller')}>
                            <p>{t('s1.description')}</p>
                            <InfoCard>
                                <div className="font-semibold text-slate-900 text-lg mb-2">Traaaction</div>
                                <div className="text-slate-500 space-y-1">
                                    <p>{t('s1.address1')}</p>
                                    <p>{t('s1.address2')}</p>
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <a href="mailto:contact@traaaction.com" className="text-violet-600 hover:text-violet-700 transition-colors">
                                        contact@traaaction.com
                                    </a>
                                </div>
                            </InfoCard>
                        </Section>

                        {/* Section 2 - Information We Collect */}
                        <Section id="collection" number={2} title={t('sections.collection')}>
                            <p>{t('s2.description')}</p>

                            <SubSection title={t('s2.startups.title')}>
                                <DataList items={[
                                    t('s2.startups.item0'),
                                    t('s2.startups.item1'),
                                    t('s2.startups.item2'),
                                    t('s2.startups.item3'),
                                ]} />
                            </SubSection>

                            <SubSection title={t('s2.sellers.title')}>
                                <DataList items={[
                                    t('s2.sellers.item0'),
                                    t('s2.sellers.item1'),
                                    t('s2.sellers.item2'),
                                    t('s2.sellers.item3'),
                                ]} />
                            </SubSection>

                            <SubSection title={t('s2.endUsers.title')}>
                                <p className="text-slate-500 mb-4">{t('s2.endUsers.description')}</p>
                                <DataList items={[
                                    t('s2.endUsers.item0'),
                                    t('s2.endUsers.item1'),
                                    t('s2.endUsers.item2'),
                                    t('s2.endUsers.item3'),
                                    t('s2.endUsers.item4'),
                                ]} />
                            </SubSection>
                        </Section>

                        {/* Section 3 - Cookies */}
                        <Section id="cookies" number={3} title={t('sections.cookies')}>
                            <p>{t('s3.description')}</p>

                            <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50">
                                            <th className="text-left py-4 px-5 font-medium text-slate-700">{t('s3.table.cookie')}</th>
                                            <th className="text-left py-4 px-5 font-medium text-slate-700">{t('s3.table.purpose')}</th>
                                            <th className="text-left py-4 px-5 font-medium text-slate-700">{t('s3.table.duration')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        <tr className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-5 font-mono text-xs text-violet-600">trac_id</td>
                                            <td className="py-4 px-5 text-slate-500">{t('s3.cookies.tracId.purpose')}</td>
                                            <td className="py-4 px-5 text-slate-500">{t('s3.cookies.tracId.duration')}</td>
                                        </tr>
                                        <tr className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-5 font-mono text-xs text-violet-600">trac_active_ws</td>
                                            <td className="py-4 px-5 text-slate-500">{t('s3.cookies.tracActiveWs.purpose')}</td>
                                            <td className="py-4 px-5 text-slate-500">{t('s3.cookies.tracActiveWs.duration')}</td>
                                        </tr>
                                        <tr className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-5 font-mono text-xs text-violet-600">sb-*</td>
                                            <td className="py-4 px-5 text-slate-500">{t('s3.cookies.sb.purpose')}</td>
                                            <td className="py-4 px-5 text-slate-500">{t('s3.cookies.sb.duration')}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <InfoCard variant="subtle" className="mt-6">
                                <p className="text-slate-500 text-sm">
                                    <span className="text-slate-700 font-medium">{t('s3.noAdCookies.title')}</span> {t('s3.noAdCookies.description')}
                                </p>
                            </InfoCard>
                        </Section>

                        {/* Section 4 - How We Use Your Data */}
                        <Section id="usage" number={4} title={t('sections.usage')}>
                            <p>{t('s4.description')}</p>
                            <div className="grid md:grid-cols-2 gap-4 mt-8">
                                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                                    <div key={i} className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all">
                                        <div className="font-medium text-slate-800 mb-1">{t(`s4.items.item${i}.title`)}</div>
                                        <div className="text-sm text-slate-500">{t(`s4.items.item${i}.desc`)}</div>
                                    </div>
                                ))}
                            </div>
                        </Section>

                        {/* Section 5 - Legal Basis */}
                        <Section id="legal-basis" number={5} title={t('sections.legal-basis')}>
                            <p>{t('s5.description')}</p>
                            <div className="space-y-4 mt-8">
                                {[0, 1, 2, 3].map((i) => (
                                    <div key={i} className="flex gap-4 p-5 rounded-xl bg-white border-l-4 border-violet-500 shadow-sm">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600 font-mono text-sm font-bold">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-800 mb-1">{t(`s5.items.item${i}.basis`)}</div>
                                            <div className="text-sm text-slate-500">{t(`s5.items.item${i}.desc`)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Section>

                        {/* Section 6 - Data Sharing */}
                        <Section id="sharing" number={6} title={t('sections.sharing')}>
                            <p>{t('s6.description')}</p>

                            <SubSection title={t('s6.providers.title')}>
                                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm mt-4">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-50">
                                                <th className="text-left py-4 px-5 font-medium text-slate-700">{t('s6.providers.table.provider')}</th>
                                                <th className="text-left py-4 px-5 font-medium text-slate-700">{t('s6.providers.table.purpose')}</th>
                                                <th className="text-left py-4 px-5 font-medium text-slate-700">{t('s6.providers.table.location')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {[0, 1, 2, 3, 4].map((i) => (
                                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="py-4 px-5 text-slate-800 font-medium">{t(`s6.providers.items.item${i}.name`)}</td>
                                                    <td className="py-4 px-5 text-slate-500">{t(`s6.providers.items.item${i}.purpose`)}</td>
                                                    <td className="py-4 px-5 text-slate-500">{t(`s6.providers.items.item${i}.location`)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </SubSection>

                            <SubSection title={t('s6.otherDisclosures.title')}>
                                <DataList items={[
                                    t('s6.otherDisclosures.item0'),
                                    t('s6.otherDisclosures.item1'),
                                    t('s6.otherDisclosures.item2'),
                                    t('s6.otherDisclosures.item3'),
                                ]} />
                            </SubSection>
                        </Section>

                        {/* Section 7 - International Transfers */}
                        <Section id="transfers" number={7} title={t('sections.transfers')}>
                            <p>{t('s7.description')}</p>
                            <DataList items={[
                                t('s7.item0'),
                                t('s7.item1'),
                                t('s7.item2'),
                            ]} className="mt-6" />
                        </Section>

                        {/* Section 8 - Data Retention */}
                        <Section id="retention" number={8} title={t('sections.retention')}>
                            <p>{t('s8.description')}</p>
                            <div className="grid gap-3 mt-8">
                                {[0, 1, 2, 3, 4].map((i) => (
                                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200">
                                        <span className="text-slate-600">{t(`s8.items.item${i}.type`)}</span>
                                        <span className="text-sm font-mono text-violet-600 bg-violet-50 px-3 py-1 rounded-full">{t(`s8.items.item${i}.period`)}</span>
                                    </div>
                                ))}
                            </div>
                        </Section>

                        {/* Section 9 - Your Rights */}
                        <Section id="rights" number={9} title={t('sections.rights')}>
                            <p>{t('s9.description')}</p>
                            <div className="grid md:grid-cols-2 gap-4 mt-8">
                                {[0, 1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="p-5 rounded-xl bg-gradient-to-br from-violet-50 to-white border border-violet-100">
                                        <div className="text-lg font-medium text-slate-800 mb-2">{t(`s9.items.item${i}.right`)}</div>
                                        <div className="text-sm text-slate-500">{t(`s9.items.item${i}.desc`)}</div>
                                    </div>
                                ))}
                            </div>
                            <InfoCard className="mt-8">
                                <p className="text-slate-500">
                                    {t('s9.contactText')}{' '}
                                    <a href="mailto:contact@traaaction.com" className="text-violet-600 hover:text-violet-700">
                                        contact@traaaction.com
                                    </a>
                                    {t('s9.contactTextEnd')}
                                </p>
                            </InfoCard>
                        </Section>

                        {/* Section 10 - Controller vs Processor */}
                        <Section id="roles" number={10} title={t('sections.roles')}>
                            <p>{t('s10.description')}</p>
                            <div className="grid md:grid-cols-2 gap-6 mt-8">
                                <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-white border border-blue-200">
                                    <div className="text-xs uppercase tracking-widest text-blue-600 mb-3 font-medium">{t('s10.controller.label')}</div>
                                    <div className="text-xl font-bold text-slate-800 mb-2">{t('s10.controller.title')}</div>
                                    <p className="text-sm text-slate-500">
                                        {t('s10.controller.description')}
                                    </p>
                                </div>
                                <div className="p-6 rounded-xl bg-gradient-to-br from-violet-50 to-white border border-violet-200">
                                    <div className="text-xs uppercase tracking-widest text-violet-600 mb-3 font-medium">Traaaction</div>
                                    <div className="text-xl font-bold text-slate-800 mb-2">{t('s10.processor.title')}</div>
                                    <p className="text-sm text-slate-500">
                                        {t('s10.processor.description')}
                                    </p>
                                </div>
                            </div>
                        </Section>

                        {/* Section 11 - Security */}
                        <Section id="security" number={11} title={t('sections.security')}>
                            <p>{t('s11.description')}</p>
                            <div className="grid md:grid-cols-3 gap-4 mt-8">
                                {[0, 1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-200">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span className="text-sm text-slate-600">{t(`s11.items.item${i}`)}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-slate-400 text-sm mt-6">
                                {t('s11.disclaimer')}
                            </p>
                        </Section>

                        {/* Section 12 - Children */}
                        <Section id="children" number={12} title={t('sections.children')}>
                            <p>
                                {t('s12.description')}
                            </p>
                        </Section>

                        {/* Section 13 - Changes */}
                        <Section id="changes" number={13} title={t('sections.changes')}>
                            <p>{t('s13.description')}</p>
                            <DataList items={[
                                t('s13.item0'),
                                t('s13.item1'),
                            ]} className="mt-6" />
                            <p className="text-slate-400 mt-4">
                                {t('s13.disclaimer')}
                            </p>
                        </Section>

                        {/* Section 14 - Contact */}
                        <Section id="contact" number={14} title={t('sections.contact')}>
                            <p>{t('s14.description')}</p>
                            <InfoCard className="mt-6">
                                <div className="font-semibold text-slate-800 text-lg mb-3">Traaaction</div>
                                <div className="text-slate-500 space-y-1 mb-4">
                                    <p>{t('s14.address1')}</p>
                                    <p>{t('s14.address2')}</p>
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
                                {t('footer.copyright', { year: new Date().getFullYear() })}
                            </p>
                            <div className="flex items-center gap-6">
                                <Link href="/terms" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
                                    {t('footer.terms')}
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
