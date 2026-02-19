'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, ArrowRight, Coins, Link2, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'

const crossLinks = [
    { key: 'attribution', href: '/docs/attribution', Icon: Link2, iconBgCls: 'bg-emerald-50 group-hover:bg-emerald-600', iconCls: 'text-emerald-600 group-hover:text-white' },
    { key: 'organizations', href: '/docs/organizations', Icon: Users, iconBgCls: 'bg-sky-50 group-hover:bg-sky-600', iconCls: 'text-sky-600 group-hover:text-white' },
]

export default function DocsCommissionsPage() {
    const t = useTranslations('docs.commissions')
    const c = useTranslations('docs.common')
    const idx = useTranslations('docs.index')

    return (
        <div className="min-h-screen bg-[#FAFAFA] text-slate-900 selection:bg-violet-500/20">
            <div className="fixed inset-0 pointer-events-none opacity-30">
                <div className="absolute top-0 right-0 w-[900px] h-[900px] bg-gradient-to-bl from-violet-100/40 to-transparent rounded-full blur-3xl" />
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
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-xs font-medium mb-8">
                            <Coins className="w-3 h-3" />
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

                {/* S1 — Les 3 modes */}
                <section className="px-6 lg:px-16 py-24">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-4 mb-10">
                            <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 shadow-lg shadow-violet-900/25 flex items-center justify-center text-white font-mono text-sm font-bold">01</span>
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{t('s1.title')}</h2>
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50">
                                        <th className="text-left py-3 px-4 font-semibold text-slate-700">{t('s1.colMode')}</th>
                                        <th className="text-left py-3 px-4 font-semibold text-slate-700">{t('s1.colTrigger')}</th>
                                        <th className="text-left py-3 px-4 font-semibold text-slate-700">{t('s1.colConfig')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-slate-100">
                                        <td className="py-3 px-4 font-medium text-violet-700">SALE</td>
                                        <td className="py-3 px-4 text-slate-600">{t('s1.saleTrigger')}</td>
                                        <td className="py-3 px-4 text-slate-600">{t('s1.saleConfig')}</td>
                                    </tr>
                                    <tr className="border-b border-slate-100">
                                        <td className="py-3 px-4 font-medium text-violet-700">LEAD</td>
                                        <td className="py-3 px-4 text-slate-600">{t('s1.leadTrigger')}</td>
                                        <td className="py-3 px-4 text-slate-600">{t('s1.leadConfig')}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-3 px-4 font-medium text-violet-700">RECURRING</td>
                                        <td className="py-3 px-4 text-slate-600">{t('s1.recurringTrigger')}</td>
                                        <td className="py-3 px-4 text-slate-600">{t('s1.recurringConfig')}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* S2 — Le calcul détaillé */}
                <section className="px-6 lg:px-16 py-24 bg-white border-y border-slate-200/50">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-4 mb-10">
                            <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 shadow-lg shadow-violet-900/25 flex items-center justify-center text-white font-mono text-sm font-bold">02</span>
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{t('s2.title')}</h2>
                        </div>
                        <div className="space-y-6 max-w-3xl">
                            <div className="p-5 rounded-xl bg-slate-900 text-slate-300 font-mono text-sm leading-relaxed space-y-1">
                                <div className="flex justify-between"><span>{t('s2.priceTTC')}</span><span className="text-white">100,00€</span></div>
                                <div className="flex justify-between"><span>- {t('s2.vat')} (20%)</span><span className="text-red-400">-16,67€</span></div>
                                <div className="flex justify-between border-t border-slate-700 pt-1"><span>= {t('s2.amountHT')}</span><span className="text-white">83,33€</span></div>
                                <div className="flex justify-between"><span>- {t('s2.paymentFees')}</span><span className="text-red-400">-2,50€</span></div>
                                <div className="flex justify-between border-t border-slate-700 pt-1"><span>= {t('s2.netAmount')}</span><span className="text-white">80,83€</span></div>
                                <div className="h-2" />
                                <div className="flex justify-between"><span>{t('s2.sellerCommission')} (10%)</span><span className="text-emerald-400">8,33€</span></div>
                                <div className="flex justify-between"><span>{t('s2.platformFee')} (15%)</span><span className="text-violet-400">12,50€</span></div>
                                <div className="flex justify-between border-t border-slate-700 pt-1"><span>{t('s2.startupReceives')}</span><span className="text-amber-400">60,00€</span></div>
                            </div>
                            <div className="space-y-2 text-slate-600 text-sm leading-relaxed">
                                <p>{t('s2.note1')}</p>
                                <p>{t('s2.note2')}</p>
                                <p>{t('s2.note3')}</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* S3 — Le cycle de vie */}
                <section className="px-6 lg:px-16 py-24">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-4 mb-10">
                            <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 shadow-lg shadow-violet-900/25 flex items-center justify-center text-white font-mono text-sm font-bold">03</span>
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{t('s3.title')}</h2>
                        </div>
                        <div className="space-y-6 max-w-3xl">
                            {/* Lifecycle diagram */}
                            <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
                                <span className="px-4 py-2 rounded-lg bg-amber-100 text-amber-800">PENDING</span>
                                <span className="text-slate-400">→</span>
                                <span className="text-xs text-slate-500 italic">{t('s3.holdPeriod')}</span>
                                <span className="text-slate-400">→</span>
                                <span className="px-4 py-2 rounded-lg bg-blue-100 text-blue-800">PROCEED</span>
                                <span className="text-slate-400">→</span>
                                <span className="text-xs text-slate-500 italic">{t('s3.startupPays')}</span>
                                <span className="text-slate-400">→</span>
                                <span className="px-4 py-2 rounded-lg bg-emerald-100 text-emerald-800">COMPLETE</span>
                            </div>
                            <div className="space-y-2 text-slate-600 leading-relaxed">
                                <p><strong className="text-slate-800">PENDING</strong> — {t('s3.pendingDesc')}</p>
                                <p><strong className="text-slate-800">PROCEED</strong> — {t('s3.proceedDesc')}</p>
                                <p><strong className="text-slate-800">COMPLETE</strong> — {t('s3.completeDesc')}</p>
                            </div>
                            <div className="mt-6">
                                <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('s3.holdTitle')}</h3>
                                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50">
                                                <th className="text-left py-3 px-4 font-semibold text-slate-700">{t('s3.colType')}</th>
                                                <th className="text-left py-3 px-4 font-semibold text-slate-700">{t('s3.colHold')}</th>
                                                <th className="text-left py-3 px-4 font-semibold text-slate-700">{t('s3.colReason')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="border-b border-slate-100">
                                                <td className="py-3 px-4 font-medium text-slate-800">LEAD</td>
                                                <td className="py-3 px-4 text-slate-600">{t('s3.leadHold')}</td>
                                                <td className="py-3 px-4 text-slate-600">{t('s3.leadReason')}</td>
                                            </tr>
                                            <tr className="border-b border-slate-100">
                                                <td className="py-3 px-4 font-medium text-slate-800">SALE</td>
                                                <td className="py-3 px-4 text-slate-600">{t('s3.saleHold')}</td>
                                                <td className="py-3 px-4 text-slate-600">{t('s3.saleReason')}</td>
                                            </tr>
                                            <tr>
                                                <td className="py-3 px-4 font-medium text-slate-800">RECURRING</td>
                                                <td className="py-3 px-4 text-slate-600">{t('s3.recurringHold')}</td>
                                                <td className="py-3 px-4 text-slate-600">{t('s3.recurringReason')}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* S4 — Les abonnements (RECURRING) */}
                <section className="px-6 lg:px-16 py-24 bg-white border-y border-slate-200/50">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-4 mb-10">
                            <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 shadow-lg shadow-violet-900/25 flex items-center justify-center text-white font-mono text-sm font-bold">04</span>
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{t('s4.title')}</h2>
                        </div>
                        <div className="space-y-4 text-slate-600 leading-relaxed max-w-3xl">
                            <ul className="space-y-2 ml-1">
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" /><span>{t('s4.item1')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" /><span>{t('s4.item2')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" /><span>{t('s4.item3')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" /><span>{t('s4.item4')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" /><span>{t('s4.item5')}</span></li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* S5 — Les remboursements */}
                <section className="px-6 lg:px-16 py-24">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-4 mb-10">
                            <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 shadow-lg shadow-violet-900/25 flex items-center justify-center text-white font-mono text-sm font-bold">05</span>
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{t('s5.title')}</h2>
                        </div>
                        <div className="space-y-4 text-slate-600 leading-relaxed max-w-3xl">
                            <ul className="space-y-2 ml-1">
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" /><span>{t('s5.item1')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" /><span>{t('s5.item2')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" /><span>{t('s5.item3')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" /><span>{t('s5.item4')}</span></li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* S6 — Transparence des frais */}
                <section className="px-6 lg:px-16 py-24 bg-white border-y border-slate-200/50">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-4 mb-10">
                            <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 shadow-lg shadow-violet-900/25 flex items-center justify-center text-white font-mono text-sm font-bold">06</span>
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{t('s6.title')}</h2>
                        </div>
                        <div className="space-y-4 text-slate-600 leading-relaxed max-w-3xl">
                            <ul className="space-y-2 ml-1">
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" /><span>{t('s6.item1')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" /><span>{t('s6.item2')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" /><span>{t('s6.item3')}</span></li>
                            </ul>
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
