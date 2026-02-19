'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, ArrowRight, Link2, MousePointerClick, Coins } from 'lucide-react'
import { useTranslations } from 'next-intl'

const crossLinks = [
    { key: 'tracking', href: '/docs/tracking', Icon: MousePointerClick, iconBgCls: 'bg-blue-50 group-hover:bg-blue-600', iconCls: 'text-blue-600 group-hover:text-white' },
    { key: 'commissions', href: '/docs/commissions', Icon: Coins, iconBgCls: 'bg-violet-50 group-hover:bg-violet-600', iconCls: 'text-violet-600 group-hover:text-white' },
]

export default function DocsAttributionPage() {
    const t = useTranslations('docs.attribution')
    const c = useTranslations('docs.common')
    const idx = useTranslations('docs.index')

    return (
        <div className="min-h-screen bg-[#FAFAFA] text-slate-900 selection:bg-emerald-500/20">
            <div className="fixed inset-0 pointer-events-none opacity-30">
                <div className="absolute top-0 right-0 w-[900px] h-[900px] bg-gradient-to-bl from-emerald-100/40 to-transparent rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-[700px] h-[700px] bg-gradient-to-tr from-slate-100/50 to-transparent rounded-full blur-3xl" />
            </div>

            <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/docs" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span>{c('backToDocs')}</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <Image src="/Logotrac/Logo5.png" alt="Traaaction" width={24} height={24} className="rounded-md" />
                        <span className="text-sm font-medium text-slate-500">{c('headerLabel')}</span>
                    </div>
                </div>
            </header>

            <main className="pt-20">
                {/* Hero */}
                <section className="px-6 lg:px-16 pt-20 pb-24 bg-white border-b border-slate-200/50">
                    <div className="max-w-4xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium mb-8">
                            <Link2 className="w-3 h-3" />
                            {t('badge')}
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
                            {t('title')}
                            <span className="block text-slate-300">{t('titleAccent')}</span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-2xl">
                            {t('subtitle')}
                        </p>
                    </div>
                </section>

                {/* S1 — Le principe : first-click attribution */}
                <section className="px-6 lg:px-16 py-24">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-4 mb-10">
                            <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-900/25 flex items-center justify-center text-white font-mono text-sm font-bold">01</span>
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{t('s1.title')}</h2>
                        </div>
                        <div className="space-y-4 text-slate-600 leading-relaxed max-w-3xl">
                            <p>{t('s1.p1')}</p>
                            <p>{t('s1.p2')}</p>
                            <p>{t('s1.p3')}</p>
                        </div>
                    </div>
                </section>

                {/* S2 — Comment le lien se crée */}
                <section className="px-6 lg:px-16 py-24 bg-white border-y border-slate-200/50">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-4 mb-10">
                            <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-900/25 flex items-center justify-center text-white font-mono text-sm font-bold">02</span>
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{t('s2.title')}</h2>
                        </div>
                        <div className="space-y-4 text-slate-600 leading-relaxed max-w-3xl">
                            <ol className="space-y-3 list-none">
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center mt-0.5">1</span>
                                    <span>{t('s2.step1')}</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center mt-0.5">2</span>
                                    <span>{t('s2.step2')}</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center mt-0.5">3</span>
                                    <span>{t('s2.step3')}</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center mt-0.5">4</span>
                                    <span>{t('s2.step4')}</span>
                                </li>
                            </ol>
                        </div>
                    </div>
                </section>

                {/* S3 — Les données de liaison */}
                <section className="px-6 lg:px-16 py-24">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-4 mb-10">
                            <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-900/25 flex items-center justify-center text-white font-mono text-sm font-bold">03</span>
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{t('s3.title')}</h2>
                        </div>
                        <div className="space-y-4 text-slate-600 leading-relaxed max-w-3xl">
                            <ul className="space-y-2 ml-1">
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" /><span><strong className="text-slate-800">Click ID</strong> — {t('s3.item1')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" /><span><strong className="text-slate-800">{t('s3.item2Label')}</strong> — {t('s3.item2')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" /><span><strong className="text-slate-800">Seller</strong> — {t('s3.item3')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" /><span><strong className="text-slate-800">{t('s3.item4Label')}</strong> — {t('s3.item4')}</span></li>
                            </ul>
                            <p className="text-sm text-slate-500 italic">{t('s3.locked')}</p>
                        </div>
                    </div>
                </section>

                {/* S4 — Attribution à vie */}
                <section className="px-6 lg:px-16 py-24 bg-white border-y border-slate-200/50">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-4 mb-10">
                            <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-900/25 flex items-center justify-center text-white font-mono text-sm font-bold">04</span>
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{t('s4.title')}</h2>
                        </div>
                        <div className="space-y-4 text-slate-600 leading-relaxed max-w-3xl">
                            <p>{t('s4.p1')}</p>
                            <ul className="space-y-2 ml-1">
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" /><span>{t('s4.item1')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" /><span>{t('s4.item2')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" /><span>{t('s4.item3')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" /><span>{t('s4.item4')}</span></li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* S5 — Scénarios concrets */}
                <section className="px-6 lg:px-16 py-24">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-4 mb-10">
                            <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-900/25 flex items-center justify-center text-white font-mono text-sm font-bold">05</span>
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{t('s5.title')}</h2>
                        </div>
                        <div className="space-y-4 max-w-3xl">
                            {(['scenario1', 'scenario2', 'scenario3', 'scenario4'] as const).map((key) => (
                                <div key={key} className="p-4 rounded-xl border border-slate-200 bg-white">
                                    <p className="text-sm text-slate-600">{t(`s5.${key}.situation`)}</p>
                                    <p className="text-sm font-medium text-emerald-700 mt-1">{t(`s5.${key}.result`)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* S6 — Pour les abonnements */}
                <section className="px-6 lg:px-16 py-24 bg-white border-y border-slate-200/50">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-4 mb-10">
                            <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-900/25 flex items-center justify-center text-white font-mono text-sm font-bold">06</span>
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{t('s6.title')}</h2>
                        </div>
                        <div className="space-y-4 text-slate-600 leading-relaxed max-w-3xl">
                            <p>{t('s6.p1')}</p>
                            <p>{t('s6.p2')}</p>
                            <p>{t('s6.p3')}</p>
                        </div>
                    </div>
                </section>

                {/* Cross-links */}
                <section className="px-6 lg:px-16 py-24">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-xl font-bold text-slate-800 mb-8">{c('continueReading')}</h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            {crossLinks.map(({ key, href, Icon, iconBgCls, iconCls }) => (
                                <Link key={key} href={href} className="group">
                                    <div className="p-6 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className={`w-10 h-10 rounded-xl ${iconBgCls} flex items-center justify-center transition-colors`}>
                                                <Icon className={`w-5 h-5 ${iconCls} transition-colors`} />
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-slate-800 mb-2">{idx(`cards.${key}.title`)}</h3>
                                        <p className="text-sm text-slate-500 leading-relaxed">{idx(`cards.${key}.description`)}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-slate-200 bg-white px-6 lg:px-16 py-12">
                <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-slate-400">&copy; {new Date().getFullYear()} Traaaction. {c('allRightsReserved')}</p>
                    <div className="flex items-center gap-6">
                        <Link href="/terms" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">{c('terms')}</Link>
                        <Link href="/privacy" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">{c('privacy')}</Link>
                        <Link href="/" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">{c('home')}</Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
