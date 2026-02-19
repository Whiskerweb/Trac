'use client'

import { Code2 } from 'lucide-react'
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

export default function DocsIntegrationPage() {
    const t = useTranslations('docs.integration')

    return (
        <div className="flex">
            <div className="flex-1 min-w-0 px-6 lg:px-10 py-10 max-w-3xl">
                <DocsPageHeader
                    badge={t('badge')}
                    title={t('titleAccent')}
                    subtitle={t('subtitle')}
                    Icon={Code2}
                    color="orange"
                />

                <div className="divide-y divide-slate-200/60">
                    <DocsSection id="s1" number="01" title={t('s1.title')} color="orange">
                        <div className="space-y-4 text-slate-600 leading-relaxed">
                            <p>{t('s1.p1')}</p>
                            <ol className="space-y-3 list-none">
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center mt-0.5">1</span>
                                    <span>{t('s1.step1')}</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center mt-0.5">2</span>
                                    <span>{t('s1.step2')}</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center mt-0.5">3</span>
                                    <span>{t('s1.step3')}</span>
                                </li>
                            </ol>
                            <p>{t('s1.p2')}</p>
                        </div>
                    </DocsSection>

                    <DocsSection id="s2" number="02" title={t('s2.title')} color="orange">
                        <div className="space-y-6">
                            <p className="text-slate-600 leading-relaxed">{t('s2.p1')}</p>
                            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50">
                                            <th className="text-left py-3 px-4 font-semibold text-slate-700">{t('s2.colEvent')}</th>
                                            <th className="text-left py-3 px-4 font-semibold text-slate-700">{t('s2.colRole')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(['checkout', 'invoice', 'refund', 'subscription'] as const).map((row, i) => (
                                            <tr key={row} className={i < 3 ? 'border-b border-slate-100' : ''}>
                                                <td className="py-3 px-4 font-mono text-xs text-orange-700">{t(`s2.${row}.event`)}</td>
                                                <td className="py-3 px-4 text-slate-600">{t(`s2.${row}.role`)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-slate-600 leading-relaxed">{t('s2.p2')}</p>
                        </div>
                    </DocsSection>

                    <DocsSection id="s3" number="03" title={t('s3.title')} color="orange">
                        <div className="space-y-6">
                            <p className="text-slate-600 leading-relaxed">{t('s3.p1')}</p>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl border border-orange-200 bg-orange-50">
                                    <h4 className="font-semibold text-orange-900 mb-2">{t('s3.paymentTitle')}</h4>
                                    <p className="text-sm text-orange-800">{t('s3.paymentDesc')}</p>
                                </div>
                                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50">
                                    <h4 className="font-semibold text-blue-900 mb-2">{t('s3.subscriptionTitle')}</h4>
                                    <p className="text-sm text-blue-800">{t('s3.subscriptionDesc')}</p>
                                </div>
                            </div>
                            <div className="p-5 rounded-xl bg-slate-900 text-slate-300 font-mono text-xs md:text-sm leading-relaxed space-y-1">
                                <div className="text-slate-500">{'// Stripe Checkout — payment mode'}</div>
                                <div>{'const session = await stripe.checkout.sessions.create({'}</div>
                                <div className="pl-4">{'mode: \'payment\','}</div>
                                <div className="pl-4 text-orange-400">{'client_reference_id: clickId,'}</div>
                                <div className="pl-4">{'metadata: {'}</div>
                                <div className="pl-8 text-orange-400">{'tracClickId: clickId,'}</div>
                                <div className="pl-8 text-orange-400">{'tracCustomerExternalId: userId,'}</div>
                                <div className="pl-4">{'},'}</div>
                                <div>{'});'}</div>
                            </div>
                            <p className="text-slate-600 leading-relaxed">{t('s3.p2')}</p>
                        </div>
                    </DocsSection>

                    <DocsSection id="s4" number="04" title={t('s4.title')} color="orange">
                        <div className="space-y-6">
                            <p className="text-slate-600 leading-relaxed">{t('s4.p1')}</p>
                            <div className="p-5 rounded-xl bg-slate-900 text-slate-300 font-mono text-xs md:text-sm leading-relaxed space-y-1">
                                <div className="text-slate-500">{'<!-- Add to your website\'s <head> -->'}</div>
                                <div>{'<script'}</div>
                                <div className="pl-4 text-orange-400">{'src="https://traaaction.com/trac.js"'}</div>
                                <div className="pl-4">{'defer'}</div>
                                <div>{'></script>'}</div>
                            </div>
                            <ul className="space-y-2 ml-1 text-slate-600 leading-relaxed">
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" /><span>{t('s4.item1')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" /><span>{t('s4.item2')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" /><span>{t('s4.item3')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" /><span>{t('s4.item4')}</span></li>
                            </ul>
                            <p className="text-slate-600 leading-relaxed">{t('s4.p2')}</p>
                        </div>
                    </DocsSection>

                    <DocsSection id="s5" number="05" title={t('s5.title')} color="orange">
                        <div className="space-y-6">
                            <p className="text-slate-600 leading-relaxed">{t('s5.p1')}</p>
                            <div className="p-5 rounded-xl bg-slate-900 text-slate-300 font-mono text-xs md:text-sm leading-relaxed space-y-1">
                                <div className="text-slate-500">{'// POST /api/track/lead'}</div>
                                <div>{'fetch(\'https://traaaction.com/api/track/lead\', {'}</div>
                                <div className="pl-4">{'method: \'POST\','}</div>
                                <div className="pl-4">{'headers: {'}</div>
                                <div className="pl-8">{'\'Content-Type\': \'application/json\','}</div>
                                <div className="pl-8 text-orange-400">{'\'x-workspace-id\': \'your-workspace-id\','}</div>
                                <div className="pl-4">{'},'}</div>
                                <div className="pl-4">{'body: JSON.stringify({'}</div>
                                <div className="pl-8 text-orange-400">{'eventName: \'signup\','}</div>
                                <div className="pl-8 text-orange-400">{'customerExternalId: userId,'}</div>
                                <div className="pl-8">{'clickId: tracClickId,'}</div>
                                <div className="pl-8">{'customerEmail: email,'}</div>
                                <div className="pl-4">{'})'}</div>
                                <div>{'});'}</div>
                            </div>
                            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50">
                                            <th className="text-left py-3 px-4 font-semibold text-slate-700">{t('s5.colField')}</th>
                                            <th className="text-left py-3 px-4 font-semibold text-slate-700">{t('s5.colRequired')}</th>
                                            <th className="text-left py-3 px-4 font-semibold text-slate-700">{t('s5.colDesc')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(['eventName', 'customerExternalId', 'clickId', 'customerEmail', 'metadata'] as const).map((row, i) => (
                                            <tr key={row} className={i < 4 ? 'border-b border-slate-100' : ''}>
                                                <td className="py-3 px-4 font-mono text-xs text-orange-700">{row}</td>
                                                <td className="py-3 px-4 text-slate-600">{t(`s5.${row}.required`)}</td>
                                                <td className="py-3 px-4 text-slate-600">{t(`s5.${row}.desc`)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </DocsSection>

                    <DocsSection id="s6" number="06" title={t('s6.title')} color="orange">
                        <div className="space-y-4 text-slate-600 leading-relaxed">
                            <ul className="space-y-2 ml-1">
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" /><span>{t('s6.item1')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" /><span>{t('s6.item2')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" /><span>{t('s6.item3')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" /><span>{t('s6.item4')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" /><span>{t('s6.item5')}</span></li>
                            </ul>
                        </div>
                    </DocsSection>
                </div>

                <DocsPrevNext currentSlug="integration" />
            </div>

            <aside className="hidden xl:block w-52 flex-shrink-0">
                <div className="fixed w-52 top-[57px] pt-10 pr-6 bottom-0 overflow-y-auto">
                    <DocsTableOfContents items={TOC_ITEMS} translationNamespace="docs.integration" />
                </div>
            </aside>
        </div>
    )
}
