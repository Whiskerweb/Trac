'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

export interface TocItem {
    id: string
    titleKey: string
}

export default function DocsTableOfContents({ items, translationNamespace }: { items: TocItem[]; translationNamespace: string }) {
    const [activeId, setActiveId] = useState<string>('')
    const t = useTranslations(translationNamespace)
    const c = useTranslations('docs.common')

    useEffect(() => {
        const headings = items.map(({ id }) => document.getElementById(id)).filter(Boolean) as HTMLElement[]
        if (headings.length === 0) return

        const observer = new IntersectionObserver(
            (entries) => {
                // Find the first visible entry
                const visible = entries.filter((e) => e.isIntersecting)
                if (visible.length > 0) {
                    setActiveId(visible[0].target.id)
                }
            },
            { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
        )

        headings.forEach((el) => observer.observe(el))
        return () => observer.disconnect()
    }, [items])

    if (items.length === 0) return null

    return (
        <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {c('onThisPage')}
            </p>
            <ul className="space-y-1">
                {items.map(({ id, titleKey }) => (
                    <li key={id}>
                        <a
                            href={`#${id}`}
                            className={`block text-[13px] leading-snug py-1 border-l-2 pl-3 transition-colors ${
                                activeId === id
                                    ? 'border-slate-900 text-slate-900 font-medium'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                        >
                            {t(titleKey)}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    )
}
