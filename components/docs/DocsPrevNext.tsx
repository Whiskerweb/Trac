'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getPrevNext } from '@/lib/docs-config'

export default function DocsPrevNext({ currentSlug }: { currentSlug: string }) {
    const { prev, next } = getPrevNext(currentSlug)
    const t = useTranslations('docs.index')
    const c = useTranslations('docs.common')

    if (!prev && !next) return null

    return (
        <div className="grid grid-cols-2 gap-4 pt-10 mt-10 border-t border-slate-200">
            {prev ? (
                <Link href={`/docs/${prev.slug}`} className="group p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                        <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                        {c('previous')}
                    </div>
                    <p className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                        {t(`cards.${prev.slug}.title`)}
                    </p>
                </Link>
            ) : <div />}
            {next ? (
                <Link href={`/docs/${next.slug}`} className="group p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-right">
                    <div className="flex items-center justify-end gap-1.5 text-xs text-slate-400 mb-1">
                        {c('next')}
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                        {t(`cards.${next.slug}.title`)}
                    </p>
                </Link>
            ) : <div />}
        </div>
    )
}
