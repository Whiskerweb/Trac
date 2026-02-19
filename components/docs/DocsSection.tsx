'use client'

import { Link2 } from 'lucide-react'
import { COLOR_MAP, type DocsColor } from '@/lib/docs-config'

interface DocsSectionProps {
    id: string
    number: string
    title: string
    color: DocsColor
    children: React.ReactNode
}

export default function DocsSection({ id, number, title, color, children }: DocsSectionProps) {
    const cm = COLOR_MAP[color]

    return (
        <section id={id} className="scroll-mt-20 py-10 first:pt-0">
            <div className="flex items-center gap-3 mb-6 group">
                <span className={`flex-shrink-0 w-8 h-8 rounded-lg ${cm.number} shadow-md ${cm.numberShadow} flex items-center justify-center text-white font-mono text-xs font-bold`}>
                    {number}
                </span>
                <h2 className="text-xl md:text-2xl font-bold text-slate-800">{title}</h2>
                <a
                    href={`#${id}`}
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                    aria-label={`Link to ${title}`}
                >
                    <Link2 className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                </a>
            </div>
            <div className="max-w-3xl">
                {children}
            </div>
        </section>
    )
}
