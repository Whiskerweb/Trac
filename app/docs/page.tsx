'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { DOCS_TOPICS } from '@/lib/docs-config'

export default function DocsIndexPage() {
    const t = useTranslations('docs.index')

    return (
        <div className="px-6 lg:px-10 py-10 max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-3">
                {t('title')}
            </h1>
            <p className="text-base text-slate-500 leading-relaxed max-w-2xl mb-10">
                {t('subtitle')}
            </p>

            <div className="grid gap-3">
                {DOCS_TOPICS.map(({ slug, Icon }) => (
                    <Link key={slug} href={`/docs/${slug}`} className="group">
                        <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all">
                            <div className="w-9 h-9 rounded-lg bg-slate-50 group-hover:bg-slate-100 flex items-center justify-center transition-colors flex-shrink-0">
                                <Icon className="w-4.5 h-4.5 text-slate-500 group-hover:text-slate-700 transition-colors" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-slate-800 mb-0.5">{t(`cards.${slug}.title`)}</h3>
                                <p className="text-xs text-slate-500 leading-relaxed">{t(`cards.${slug}.description`)}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                        </div>
                    </Link>
                ))}
            </div>

            <footer className="mt-16 pt-8 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} Traaaction</p>
                    <div className="flex items-center gap-4">
                        <Link href="/terms" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Terms</Link>
                        <Link href="/privacy" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Privacy</Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
