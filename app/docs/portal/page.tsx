'use client'

import { Globe } from 'lucide-react'
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

export default function DocsPortalPage() {
    const t = useTranslations('docs.portal')

    return (
        <div className="flex">
            <div className="flex-1 min-w-0 px-6 lg:px-10 py-10 max-w-3xl">
                <DocsPageHeader
                    badge={t('badge')}
                    title={t('titleAccent')}
                    subtitle={t('subtitle')}
                    Icon={Globe}
                    color="amber"
                />

                <div className="divide-y divide-slate-200/60">
                    <DocsSection id="s1" number="01" title={t('s1.title')} color="amber">
                        <div className="space-y-4 text-slate-600 leading-relaxed">
                            <ul className="space-y-2 ml-1">
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" /><span>{t('s1.item1')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" /><span>{t('s1.item2')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" /><span>{t('s1.item3')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" /><span>{t('s1.item4')}</span></li>
                            </ul>
                        </div>
                    </DocsSection>

                    <DocsSection id="s2" number="02" title={t('s2.title')} color="amber">
                        <div className="space-y-4 text-slate-600 leading-relaxed">
                            <ol className="space-y-3 list-none">
                                <li className="flex items-start gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center mt-0.5">1</span><span>{t('s2.step1')}</span></li>
                                <li className="flex items-start gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center mt-0.5">2</span><span>{t('s2.step2')}</span></li>
                                <li className="flex items-start gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center mt-0.5">3</span><span>{t('s2.step3')}</span></li>
                                <li className="flex items-start gap-3"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center mt-0.5">4</span><span>{t('s2.step4')}</span></li>
                            </ol>
                        </div>
                    </DocsSection>

                    <DocsSection id="s3" number="03" title={t('s3.title')} color="amber">
                        <div className="space-y-4 text-slate-600 leading-relaxed">
                            <p>{t('s3.p1')}</p>
                            <p>{t('s3.p2')}</p>
                            <p>{t('s3.p3')}</p>
                        </div>
                    </DocsSection>

                    <DocsSection id="s4" number="04" title={t('s4.title')} color="amber">
                        <div className="space-y-4 text-slate-600 leading-relaxed">
                            <p>{t('s4.p1')}</p>
                            <p>{t('s4.p2')}</p>
                            <p>{t('s4.p3')}</p>
                        </div>
                    </DocsSection>

                    <DocsSection id="s5" number="05" title={t('s5.title')} color="amber">
                        <div className="space-y-4 text-slate-600 leading-relaxed">
                            <ul className="space-y-2 ml-1">
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" /><span>{t('s5.item1')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" /><span>{t('s5.item2')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" /><span>{t('s5.item3')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" /><span>{t('s5.item4')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" /><span>{t('s5.item5')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" /><span>{t('s5.item6')}</span></li>
                            </ul>
                        </div>
                    </DocsSection>

                    <DocsSection id="s6" number="06" title={t('s6.title')} color="amber">
                        <div className="space-y-4 text-slate-600 leading-relaxed">
                            <ul className="space-y-2 ml-1">
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" /><span>{t('s6.item1')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" /><span>{t('s6.item2')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" /><span>{t('s6.item3')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" /><span>{t('s6.item4')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" /><span>{t('s6.item5')}</span></li>
                            </ul>
                        </div>
                    </DocsSection>
                </div>

                <DocsPrevNext currentSlug="portal" />
            </div>

            <aside className="hidden xl:block w-52 flex-shrink-0">
                <div className="fixed w-52 top-[57px] pt-10 pr-6 bottom-0 overflow-y-auto">
                    <DocsTableOfContents items={TOC_ITEMS} translationNamespace="docs.portal" />
                </div>
            </aside>
        </div>
    )
}
