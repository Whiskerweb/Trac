import { MousePointerClick, Link2, Coins, Users, Globe, ShieldCheck, Code2, type LucideIcon } from 'lucide-react'

export interface DocsTopic {
    slug: string
    titleKey: string       // key under docs.index.cards.{slug}.title
    descriptionKey: string // key under docs.index.cards.{slug}.description
    Icon: LucideIcon
    color: 'blue' | 'emerald' | 'violet' | 'sky' | 'amber' | 'red' | 'orange'
}

export const DOCS_TOPICS: DocsTopic[] = [
    { slug: 'tracking', titleKey: 'tracking', descriptionKey: 'tracking', Icon: MousePointerClick, color: 'blue' },
    { slug: 'attribution', titleKey: 'attribution', descriptionKey: 'attribution', Icon: Link2, color: 'emerald' },
    { slug: 'commissions', titleKey: 'commissions', descriptionKey: 'commissions', Icon: Coins, color: 'violet' },
    { slug: 'organizations', titleKey: 'organizations', descriptionKey: 'organizations', Icon: Users, color: 'sky' },
    { slug: 'portal', titleKey: 'portal', descriptionKey: 'portal', Icon: Globe, color: 'amber' },
    { slug: 'security', titleKey: 'security', descriptionKey: 'security', Icon: ShieldCheck, color: 'red' },
    { slug: 'integration', titleKey: 'integration', descriptionKey: 'integration', Icon: Code2, color: 'orange' },
]

export function getPrevNext(currentSlug: string): { prev: DocsTopic | null; next: DocsTopic | null } {
    const idx = DOCS_TOPICS.findIndex((t) => t.slug === currentSlug)
    if (idx === -1) return { prev: null, next: null }
    return {
        prev: idx > 0 ? DOCS_TOPICS[idx - 1] : null,
        next: idx < DOCS_TOPICS.length - 1 ? DOCS_TOPICS[idx + 1] : null,
    }
}

// Explicit Tailwind color maps (JIT-safe — no dynamic class construction)
export const COLOR_MAP = {
    blue:    { badge: 'bg-blue-50 border-blue-200 text-blue-700', badgeDot: 'bg-blue-500', number: 'bg-blue-600', numberShadow: 'shadow-blue-900/20', bullet: 'bg-blue-400', remember: 'bg-blue-50 border-blue-200 text-blue-800', rememberTitle: 'text-blue-900' },
    emerald: { badge: 'bg-emerald-50 border-emerald-200 text-emerald-700', badgeDot: 'bg-emerald-500', number: 'bg-emerald-600', numberShadow: 'shadow-emerald-900/20', bullet: 'bg-emerald-400', remember: 'bg-emerald-50 border-emerald-200 text-emerald-800', rememberTitle: 'text-emerald-900' },
    violet:  { badge: 'bg-violet-50 border-violet-200 text-violet-700', badgeDot: 'bg-violet-500', number: 'bg-violet-600', numberShadow: 'shadow-violet-900/20', bullet: 'bg-violet-400', remember: 'bg-violet-50 border-violet-200 text-violet-800', rememberTitle: 'text-violet-900' },
    sky:     { badge: 'bg-sky-50 border-sky-200 text-sky-700', badgeDot: 'bg-sky-500', number: 'bg-sky-600', numberShadow: 'shadow-sky-900/20', bullet: 'bg-sky-400', remember: 'bg-sky-50 border-sky-200 text-sky-800', rememberTitle: 'text-sky-900' },
    amber:   { badge: 'bg-amber-50 border-amber-200 text-amber-700', badgeDot: 'bg-amber-500', number: 'bg-amber-600', numberShadow: 'shadow-amber-900/20', bullet: 'bg-amber-400', remember: 'bg-amber-50 border-amber-200 text-amber-800', rememberTitle: 'text-amber-900' },
    red:     { badge: 'bg-red-50 border-red-200 text-red-700', badgeDot: 'bg-red-500', number: 'bg-red-600', numberShadow: 'shadow-red-900/20', bullet: 'bg-red-400', remember: 'bg-red-50 border-red-200 text-red-800', rememberTitle: 'text-red-900' },
    orange:  { badge: 'bg-orange-50 border-orange-200 text-orange-700', badgeDot: 'bg-orange-500', number: 'bg-orange-600', numberShadow: 'shadow-orange-900/20', bullet: 'bg-orange-400', remember: 'bg-orange-50 border-orange-200 text-orange-800', rememberTitle: 'text-orange-900' },
} as const

export type DocsColor = keyof typeof COLOR_MAP
