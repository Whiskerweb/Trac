'use client'

import { MousePointerClick } from 'lucide-react'
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

export default function DocsTrackingPage() {
    const t = useTranslations('docs.tracking')
    const c = useTranslations('docs.common')

    return (
        <div className="flex">
            <div className="flex-1 min-w-0 px-6 lg:px-10 py-10 max-w-3xl">
                <DocsPageHeader
                    badge={t('badge')}
                    title={t('titleAccent')}
                    subtitle={t('subtitle')}
                    Icon={MousePointerClick}
                    color="blue"
                />

                <div className="divide-y divide-slate-200/60">
                    <DocsSection id="s1" number="01" title={t('s1.title')} color="blue">
                        <div className="space-y-4 text-slate-600 leading-relaxed">
                            <p>{t('s1.p1')}</p>
                            <div className="p-4 rounded-xl bg-slate-900 text-slate-300 font-mono text-sm">
                                traaaction.com/s/mission-slug/a7k2m9x5
                            </div>
                            <p>{t('s1.p2')}</p>
                            <p>{t('s1.p3')}</p>
                        </div>
                    </DocsSection>

                    <DocsSection id="s2" number="02" title={t('s2.title')} color="blue">
                        <div className="space-y-4 text-slate-600 leading-relaxed">
                            <p>{t('s2.p1')}</p>
                            <div className="p-4 rounded-xl bg-slate-900 text-blue-400 font-mono text-sm">
                                clk_a7k2m9x5p3q1
                            </div>
                            <p>{t('s2.p2')}</p>
                            <p>{t('s2.p3')}</p>
                        </div>
                    </DocsSection>

                    <DocsSection id="s3" number="03" title={t('s3.title')} color="blue">
                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50">
                                        <th className="text-left py-3 px-4 font-semibold text-slate-700">{t('s3.colLocation')}</th>
                                        <th className="text-left py-3 px-4 font-semibold text-slate-700">{t('s3.colDuration')}</th>
                                        <th className="text-left py-3 px-4 font-semibold text-slate-700">{t('s3.colRole')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-slate-100">
                                        <td className="py-3 px-4 text-slate-800 font-medium">{t('s3.row1.location')}</td>
                                        <td className="py-3 px-4 text-slate-600">{t('s3.row1.duration')}</td>
                                        <td className="py-3 px-4 text-slate-600">{t('s3.row1.role')}</td>
                                    </tr>
                                    <tr className="border-b border-slate-100">
                                        <td className="py-3 px-4 text-slate-800 font-medium">{t('s3.row2.location')}</td>
                                        <td className="py-3 px-4 text-slate-600">{t('s3.row2.duration')}</td>
                                        <td className="py-3 px-4 text-slate-600">{t('s3.row2.role')}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-3 px-4 text-slate-800 font-medium">{t('s3.row3.location')}</td>
                                        <td className="py-3 px-4 text-slate-600">{t('s3.row3.duration')}</td>
                                        <td className="py-3 px-4 text-slate-600">{t('s3.row3.role')}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </DocsSection>

                    <DocsSection id="s4" number="04" title={t('s4.title')} color="blue">
                        <div className="space-y-4 text-slate-600 leading-relaxed">
                            <p>{t('s4.p1')}</p>
                            <div className="p-4 rounded-xl bg-slate-900 text-slate-300 font-mono text-xs md:text-sm break-all">
                                startup.com/pricing?trac_id=clk_a7k2m9x5&client_reference_id=clk_a7k2m9x5
                            </div>
                            <p>{t('s4.p2')}</p>
                        </div>
                    </DocsSection>

                    <DocsSection id="s5" number="05" title={t('s5.title')} color="blue">
                        <div className="space-y-4 text-slate-600 leading-relaxed">
                            <p>{t('s5.p1')}</p>
                            <p>{t('s5.p2')}</p>
                            <ul className="space-y-2 ml-1">
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" /><span>{t('s5.item1')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" /><span>{t('s5.item2')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" /><span>{t('s5.item3')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" /><span>{t('s5.item4')}</span></li>
                            </ul>
                            <p>{t('s5.p3')}</p>
                        </div>
                    </DocsSection>

                    <DocsSection id="s6" number="06" title={t('s6.title')} color="blue">
                        <div className="space-y-4 text-slate-600 leading-relaxed">
                            <ul className="space-y-2 ml-1">
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" /><span>{t('s6.item1')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" /><span>{t('s6.item2')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" /><span>{t('s6.item3')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" /><span>{t('s6.item4')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" /><span>{t('s6.item5')}</span></li>
                            </ul>
                            <p>{t('s6.p1')}</p>
                        </div>
                    </DocsSection>
                </div>

                {/* Remember box */}
                <div className="mt-10 p-5 rounded-xl bg-blue-50 border border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-3">{c('remember')}</h3>
                    <ul className="space-y-2">
                        <li className="flex items-start gap-2 text-sm text-blue-800"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />{t('remember.p1')}</li>
                        <li className="flex items-start gap-2 text-sm text-blue-800"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />{t('remember.p2')}</li>
                        <li className="flex items-start gap-2 text-sm text-blue-800"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />{t('remember.p3')}</li>
                        <li className="flex items-start gap-2 text-sm text-blue-800"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />{t('remember.p4')}</li>
                    </ul>
                </div>

                <DocsPrevNext currentSlug="tracking" />
            </div>

            {/* TOC — visible xl+ */}
            <aside className="hidden xl:block w-52 flex-shrink-0">
                <div className="fixed w-52 top-[57px] pt-10 pr-6 bottom-0 overflow-y-auto">
                    <DocsTableOfContents items={TOC_ITEMS} translationNamespace="docs.tracking" />
                </div>
            </aside>
        </div>
    )
}
