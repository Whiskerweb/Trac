'use client'

import { ShieldCheck } from 'lucide-react'
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

export default function DocsSecurityPage() {
    const t = useTranslations('docs.security')

    return (
        <div className="flex">
            <div className="flex-1 min-w-0 px-6 lg:px-10 py-10 max-w-3xl">
                <DocsPageHeader
                    badge={t('badge')}
                    title={t('titleAccent')}
                    subtitle={t('subtitle')}
                    Icon={ShieldCheck}
                    color="red"
                />

                <div className="divide-y divide-slate-200/60">
                    <DocsSection id="s1" number="01" title={t('s1.title')} color="red">
                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50">
                                        <th className="text-left py-3 px-4 font-semibold text-slate-700">{t('s1.colData')}</th>
                                        <th className="text-left py-3 px-4 font-semibold text-slate-700">{t('s1.colRetention')}</th>
                                        <th className="text-left py-3 px-4 font-semibold text-slate-700">{t('s1.colPurpose')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(['clickId', 'country', 'device', 'referrer', 'timestamp', 'ip'] as const).map((row, i) => (
                                        <tr key={row} className={i < 5 ? 'border-b border-slate-100' : ''}>
                                            <td className="py-3 px-4 font-medium text-slate-800">{t(`s1.${row}.data`)}</td>
                                            <td className="py-3 px-4 text-slate-600">{t(`s1.${row}.retention`)}</td>
                                            <td className="py-3 px-4 text-slate-600">{t(`s1.${row}.purpose`)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </DocsSection>

                    <DocsSection id="s2" number="02" title={t('s2.title')} color="red">
                        <div className="space-y-4 text-slate-600 leading-relaxed">
                            <ul className="space-y-2 ml-1">
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" /><span><strong className="text-slate-800">{t('s2.nameLabel')}</strong> clk_id</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" /><span><strong className="text-slate-800">{t('s2.contentLabel')}</strong> {t('s2.content')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" /><span><strong className="text-slate-800">{t('s2.durationLabel')}</strong> {t('s2.duration')}</span></li>
                            </ul>
                            <p>{t('s2.p1')}</p>
                        </div>
                    </DocsSection>

                    <DocsSection id="s3" number="03" title={t('s3.title')} color="red">
                        <div className="space-y-4 text-slate-600 leading-relaxed">
                            <ul className="space-y-2 ml-1">
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" /><span>{t('s3.item1')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" /><span>{t('s3.item2')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" /><span>{t('s3.item3')}</span></li>
                            </ul>
                        </div>
                    </DocsSection>

                    <DocsSection id="s4" number="04" title={t('s4.title')} color="red">
                        <div className="space-y-4 text-slate-600 leading-relaxed">
                            <ul className="space-y-2 ml-1">
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" /><span>{t('s4.item1')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" /><span>{t('s4.item2')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" /><span>{t('s4.item3')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" /><span>{t('s4.item4')}</span></li>
                            </ul>
                        </div>
                    </DocsSection>

                    <DocsSection id="s5" number="05" title={t('s5.title')} color="red">
                        <div className="space-y-4 text-slate-600 leading-relaxed">
                            <ul className="space-y-2 ml-1">
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" /><span>{t('s5.item1')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" /><span>{t('s5.item2')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" /><span>{t('s5.item3')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" /><span>{t('s5.item4')}</span></li>
                            </ul>
                        </div>
                    </DocsSection>

                    <DocsSection id="s6" number="06" title={t('s6.title')} color="red">
                        <div className="space-y-4 text-slate-600 leading-relaxed">
                            <ul className="space-y-2 ml-1">
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" /><span>{t('s6.item1')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" /><span>{t('s6.item2')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" /><span>{t('s6.item3')}</span></li>
                                <li className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" /><span>{t('s6.item4')}</span></li>
                            </ul>
                        </div>
                    </DocsSection>
                </div>

                <DocsPrevNext currentSlug="security" />
            </div>

            <aside className="hidden xl:block w-52 flex-shrink-0">
                <div className="fixed w-52 top-[57px] pt-10 pr-6 bottom-0 overflow-y-auto">
                    <DocsTableOfContents items={TOC_ITEMS} translationNamespace="docs.security" />
                </div>
            </aside>
        </div>
    )
}
