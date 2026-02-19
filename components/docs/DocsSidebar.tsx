'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { BookOpen } from 'lucide-react'
import { DOCS_TOPICS } from '@/lib/docs-config'

export default function DocsSidebar({ onNavigate }: { onNavigate?: () => void }) {
    const pathname = usePathname()
    const t = useTranslations('docs.index')
    const c = useTranslations('docs.common')

    const isOverview = pathname === '/docs'

    return (
        <nav className="flex flex-col gap-1 py-4">
            <Link
                href="/docs"
                onClick={onNavigate}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isOverview
                        ? 'bg-slate-100 text-slate-900 font-medium'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
            >
                <BookOpen className="w-4 h-4 flex-shrink-0" />
                {c('overview')}
            </Link>

            <div className="h-px bg-slate-200/60 my-2 mx-3" />

            {DOCS_TOPICS.map(({ slug, Icon }) => {
                const isActive = pathname === `/docs/${slug}`
                return (
                    <Link
                        key={slug}
                        href={`/docs/${slug}`}
                        onClick={onNavigate}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive
                                ? 'bg-slate-100 text-slate-900 font-medium'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                    >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        {t(`cards.${slug}.title`)}
                    </Link>
                )
            })}
        </nav>
    )
}
