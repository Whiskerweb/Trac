'use client'

import { Users } from 'lucide-react'
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

export default function DocsOrganizationsPage() {
    const t = useTranslations('docs.organizations')

    return (
        <div className="flex">
            <div className="flex-1 min-w-0 px-6 lg:px-10 py-10 max-w-3xl">
                <DocsPageHeader
                    badge={t('badge')}
                    title={t('titleAccent')}
                    subtitle={t('subtitle')}
                    Icon={Users}
                    color="sky"
                />

                <div className="divide-y divide-slate-200/60">
                    <DocsSection id="s1" number="01" title={t('s1.title')} color="sky">
                        <div className="space-y-4 text-slate-600 leading-relaxed">
                            <p>{t('s1.p1')}</p>
                            <ul className="space-y-2 ml-1">
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" /><span>{t('s1.item1')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" /><span>{t('s1.item2')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" /><span>{t('s1.item3')}</span></li>
                            </ul>
                        </div>
                    </DocsSection>

                    <DocsSection id="s2" number="02" title={t('s2.title')} color="sky">
                        <div className="space-y-4 text-slate-600 leading-relaxed">
                            <ol className="space-y-3 list-none">
                                <li className="flex items-start gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center mt-0.5">1</span><span>{t('s2.step1')}</span></li>
                                <li className="flex items-start gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center mt-0.5">2</span><span>{t('s2.step2')}</span></li>
                                <li className="flex items-start gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center mt-0.5">3</span><span>{t('s2.step3')}</span></li>
                                <li className="flex items-start gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center mt-0.5">4</span><span>{t('s2.step4')}</span></li>
                                <li className="flex items-start gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center mt-0.5">5</span><span>{t('s2.step5')}</span></li>
                            </ol>
                        </div>
                    </DocsSection>

                    <DocsSection id="s3" number="03" title={t('s3.title')} color="sky">
                        <div className="space-y-4 text-slate-600 leading-relaxed">
                            <p>{t('s3.p1')}</p>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl border border-sky-200 bg-sky-50">
                                    <h4 className="font-semibold text-sky-900 mb-2">{t('s3.memberTitle')}</h4>
                                    <p className="text-sm text-sky-800">{t('s3.memberDesc')}</p>
                                </div>
                                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50">
                                    <h4 className="font-semibold text-amber-900 mb-2">{t('s3.leaderTitle')}</h4>
                                    <p className="text-sm text-amber-800">{t('s3.leaderDesc')}</p>
                                </div>
                            </div>
                            <p className="text-sm text-slate-500 italic">{t('s3.refundNote')}</p>
                        </div>
                    </DocsSection>

                    <DocsSection id="s4" number="04" title={t('s4.title')} color="sky">
                        <div className="space-y-4 text-slate-600 leading-relaxed">
                            <p>{t('s4.p1')}</p>
                            <ul className="space-y-2 ml-1">
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" /><span>{t('s4.item1')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" /><span>{t('s4.item2')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" /><span>{t('s4.item3')}</span></li>
                            </ul>
                        </div>
                    </DocsSection>

                    <DocsSection id="s5" number="05" title={t('s5.title')} color="sky">
                        <div className="space-y-4 text-slate-600 leading-relaxed">
                            <ul className="space-y-2 ml-1">
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" /><span>{t('s5.item1')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" /><span>{t('s5.item2')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" /><span>{t('s5.item3')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" /><span>{t('s5.item4')}</span></li>
                            </ul>
                        </div>
                    </DocsSection>

                    <DocsSection id="s6" number="06" title={t('s6.title')} color="sky">
                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50">
                                        <th className="text-left py-3 px-4 font-semibold text-slate-700"></th>
                                        <th className="text-left py-3 px-4 font-semibold text-slate-700">{t('s6.colOrg')}</th>
                                        <th className="text-left py-3 px-4 font-semibold text-slate-700">{t('s6.colGroup')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(['approval', 'size', 'commission', 'negotiation', 'multi', 'useCase'] as const).map((row, i) => (
                                        <tr key={row} className={i < 5 ? 'border-b border-slate-100' : ''}>
                                            <td className="py-3 px-4 font-medium text-slate-800">{t(`s6.${row}.label`)}</td>
                                            <td className="py-3 px-4 text-slate-600">{t(`s6.${row}.org`)}</td>
                                            <td className="py-3 px-4 text-slate-600">{t(`s6.${row}.group`)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </DocsSection>
                </div>

                <DocsPrevNext currentSlug="organizations" />
            </div>

            <aside className="hidden xl:block w-52 flex-shrink-0">
                <div className="fixed w-52 top-[57px] pt-10 pr-6 bottom-0 overflow-y-auto">
                    <DocsTableOfContents items={TOC_ITEMS} translationNamespace="docs.organizations" />
                </div>
            </aside>
        </div>
    )
}
