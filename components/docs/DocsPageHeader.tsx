'use client'

import type { LucideIcon } from 'lucide-react'
import { COLOR_MAP, type DocsColor } from '@/lib/docs-config'

interface DocsPageHeaderProps {
    badge: string
    title: string
    subtitle: string
    Icon: LucideIcon
    color: DocsColor
}

export default function DocsPageHeader({ badge, title, subtitle, Icon, color }: DocsPageHeaderProps) {
    const cm = COLOR_MAP[color]

    return (
        <div className="mb-10">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium mb-4 ${cm.badge}`}>
                <Icon className="w-3 h-3" />
                {badge}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-3">
                {title}
            </h1>
            <p className="text-base text-slate-500 leading-relaxed max-w-2xl">
                {subtitle}
            </p>
        </div>
    )
}
