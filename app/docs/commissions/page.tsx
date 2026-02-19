'use client'

import { Coins } from 'lucide-react'
import { useTranslations } from 'next-intl'
import DocsPageHeader from '@/components/docs/DocsPageHeader'
import DocsSection from '@/components/docs/DocsSection'
import DocsPrevNext from '@/components/docs/DocsPrevNext'
import DocsTableOfContents, { type TocItem } from '@/components/docs/DocsTableOfContents'

const TOC_ITEMS: TocItem[] = [
    { id: 's1', titleKey: 's1.title' },
    { id: 's2', titleKey: 's2.title' },
    { id: 's3', titleKey: 's3.title' },
    { id: 's4', titleKey: 's4.title' },
    { id: 's5', titleKey: 's5.title' },
    { id: 's6', titleKey: 's6.title' },
]

export default function DocsCommissionsPage() {
    const t = useTranslations('docs.commissions')

    return (
        <div className="flex">
            <div className="flex-1 min-w-0 px-6 lg:px-10 py-10 max-w-3xl">
                <DocsPageHeader
                    badge={t('badge')}
                    title={t('titleAccent')}
                    subtitle={t('subtitle')}
                    Icon={Coins}
                    color="violet"
                />

                <div className="divide-y divide-slate-200/60">
                    <DocsSection id="s1" number="01" title={t('s1.title')} color="violet">
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
                    </DocsSection>

                    <DocsSection id="s2" number="02" title={t('s2.title')} color="violet">
                        <div className="space-y-6">
                            <div className="p-5 rounded-xl bg-slate-900 text-slate-300 font-mono text-sm leading-relaxed space-y-1">
                                <div className="flex justify-between"><span>{t('s2.priceTTC')}</span><span className="text-white">100,00&euro;</span></div>
                                <div className="flex justify-between"><span>- {t('s2.vat')} (20%)</span><span className="text-red-400">-16,67&euro;</span></div>
                                <div className="flex justify-between border-t border-slate-700 pt-1"><span>= {t('s2.amountHT')}</span><span className="text-white">83,33&euro;</span></div>
                                <div className="flex justify-between"><span>- {t('s2.paymentFees')}</span><span className="text-red-400">-2,50&euro;</span></div>
                                <div className="flex justify-between border-t border-slate-700 pt-1"><span>= {t('s2.netAmount')}</span><span className="text-white">80,83&euro;</span></div>
                                <div className="h-2" />
                                <div className="flex justify-between"><span>{t('s2.sellerCommission')} (10%)</span><span className="text-emerald-400">8,33&euro;</span></div>
                                <div className="flex justify-between"><span>{t('s2.platformFee')} (15%)</span><span className="text-violet-400">12,50&euro;</span></div>
                                <div className="flex justify-between border-t border-slate-700 pt-1"><span>{t('s2.startupReceives')}</span><span className="text-amber-400">60,00&euro;</span></div>
                            </div>
                            <div className="space-y-2 text-slate-600 text-sm leading-relaxed">
                                <p>{t('s2.note1')}</p>
                                <p>{t('s2.note2')}</p>
                                <p>{t('s2.note3')}</p>
                            </div>
                        </div>
                    </DocsSection>

                    <DocsSection id="s3" number="03" title={t('s3.title')} color="violet">
                        <div className="space-y-6">
                            <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
                                <span className="px-4 py-2 rounded-lg bg-amber-100 text-amber-800">PENDING</span>
                                <span className="text-slate-400">&rarr;</span>
                                <span className="text-xs text-slate-500 italic">{t('s3.holdPeriod')}</span>
                                <span className="text-slate-400">&rarr;</span>
                                <span className="px-4 py-2 rounded-lg bg-blue-100 text-blue-800">PROCEED</span>
                                <span className="text-slate-400">&rarr;</span>
                                <span className="text-xs text-slate-500 italic">{t('s3.startupPays')}</span>
                                <span className="text-slate-400">&rarr;</span>
                                <span className="px-4 py-2 rounded-lg bg-emerald-100 text-emerald-800">COMPLETE</span>
                            </div>
                            <div className="space-y-2 text-slate-600 leading-relaxed">
                                <p><strong className="text-slate-800">PENDING</strong> — {t('s3.pendingDesc')}</p>
                                <p><strong className="text-slate-800">PROCEED</strong> — {t('s3.proceedDesc')}</p>
                                <p><strong className="text-slate-800">COMPLETE</strong> — {t('s3.completeDesc')}</p>
                            </div>
                            <div>
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
                    </DocsSection>

                    <DocsSection id="s4" number="04" title={t('s4.title')} color="violet">
                        <div className="space-y-4 text-slate-600 leading-relaxed">
                            <ul className="space-y-2 ml-1">
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" /><span>{t('s4.item1')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" /><span>{t('s4.item2')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" /><span>{t('s4.item3')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" /><span>{t('s4.item4')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" /><span>{t('s4.item5')}</span></li>
                            </ul>
                        </div>
                    </DocsSection>

                    <DocsSection id="s5" number="05" title={t('s5.title')} color="violet">
                        <div className="space-y-4 text-slate-600 leading-relaxed">
                            <ul className="space-y-2 ml-1">
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" /><span>{t('s5.item1')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" /><span>{t('s5.item2')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" /><span>{t('s5.item3')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" /><span>{t('s5.item4')}</span></li>
                            </ul>
                        </div>
                    </DocsSection>

                    <DocsSection id="s6" number="06" title={t('s6.title')} color="violet">
                        <div className="space-y-4 text-slate-600 leading-relaxed">
                            <ul className="space-y-2 ml-1">
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" /><span>{t('s6.item1')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" /><span>{t('s6.item2')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" /><span>{t('s6.item3')}</span></li>
                            </ul>
                        </div>
                    </DocsSection>
                </div>

                <DocsPrevNext currentSlug="commissions" />
            </div>

            <aside className="hidden xl:block w-52 flex-shrink-0">
                <div className="fixed w-52 top-[57px] pt-10 pr-6 bottom-0 overflow-y-auto">
                    <DocsTableOfContents items={TOC_ITEMS} translationNamespace="docs.commissions" />
                </div>
            </aside>
        </div>
    )
}
