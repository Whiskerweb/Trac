'use client'

import { Link2 } from 'lucide-react'
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

export default function DocsAttributionPage() {
    const t = useTranslations('docs.attribution')

    return (
        <div className="flex">
            <div className="flex-1 min-w-0 px-6 lg:px-10 py-10 max-w-3xl">
                <DocsPageHeader
                    badge={t('badge')}
                    title={t('titleAccent')}
                    subtitle={t('subtitle')}
                    Icon={Link2}
                    color="emerald"
                />

                <div className="divide-y divide-slate-200/60">
                    <DocsSection id="s1" number="01" title={t('s1.title')} color="emerald">
                        <div className="space-y-4 text-slate-600 leading-relaxed">
                            <p>{t('s1.p1')}</p>
                            <p>{t('s1.p2')}</p>
                            <p>{t('s1.p3')}</p>
                        </div>
                    </DocsSection>

                    <DocsSection id="s2" number="02" title={t('s2.title')} color="emerald">
                        <div className="space-y-4 text-slate-600 leading-relaxed">
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
                    </DocsSection>

                    <DocsSection id="s3" number="03" title={t('s3.title')} color="emerald">
                        <div className="space-y-4 text-slate-600 leading-relaxed">
                            <ul className="space-y-2 ml-1">
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" /><span><strong className="text-slate-800">Click ID</strong> — {t('s3.item1')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" /><span><strong className="text-slate-800">{t('s3.item2Label')}</strong> — {t('s3.item2')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" /><span><strong className="text-slate-800">Seller</strong> — {t('s3.item3')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" /><span><strong className="text-slate-800">{t('s3.item4Label')}</strong> — {t('s3.item4')}</span></li>
                            </ul>
                            <p className="text-sm text-slate-500 italic">{t('s3.locked')}</p>
                        </div>
                    </DocsSection>

                    <DocsSection id="s4" number="04" title={t('s4.title')} color="emerald">
                        <div className="space-y-4 text-slate-600 leading-relaxed">
                            <p>{t('s4.p1')}</p>
                            <ul className="space-y-2 ml-1">
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" /><span>{t('s4.item1')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" /><span>{t('s4.item2')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" /><span>{t('s4.item3')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" /><span>{t('s4.item4')}</span></li>
                            </ul>
                        </div>
                    </DocsSection>

                    <DocsSection id="s5" number="05" title={t('s5.title')} color="emerald">
                        <div className="space-y-4">
                            {(['scenario1', 'scenario2', 'scenario3', 'scenario4'] as const).map((key) => (
                                <div key={key} className="p-4 rounded-xl border border-slate-200 bg-white">
                                    <p className="text-sm text-slate-600">{t(`s5.${key}.situation`)}</p>
                                    <p className="text-sm font-medium text-emerald-700 mt-1">{t(`s5.${key}.result`)}</p>
                                </div>
                            ))}
                        </div>
                    </DocsSection>

                    <DocsSection id="s6" number="06" title={t('s6.title')} color="emerald">
                        <div className="space-y-4 text-slate-600 leading-relaxed">
                            <p>{t('s6.p1')}</p>
                            <p>{t('s6.p2')}</p>
                            <p>{t('s6.p3')}</p>
                        </div>
                    </DocsSection>
                </div>

                <DocsPrevNext currentSlug="attribution" />
            </div>

            <aside className="hidden xl:block w-52 flex-shrink-0">
                <div className="fixed w-52 top-[57px] pt-10 pr-6 bottom-0 overflow-y-auto">
                    <DocsTableOfContents items={TOC_ITEMS} translationNamespace="docs.attribution" />
                </div>
            </aside>
        </div>
    )
}
