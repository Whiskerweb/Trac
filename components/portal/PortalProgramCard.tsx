'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ChevronDown, Copy, Check, MousePointerClick,
    DollarSign, Users, RefreshCw, FileText, ExternalLink, UserPlus
} from 'lucide-react'

interface EnrollmentStats {
    clicks: number
    leads: number
    sales: number
    revenue: number
}

interface Content {
    id: string
    type: string
    url: string | null
    title: string
    description: string | null
}

interface PortalProgramCardProps {
    missionTitle: string
    missionDescription: string
    linkUrl: string | null
    stats: EnrollmentStats
    sale_enabled: boolean
    sale_reward_amount: number | null
    sale_reward_structure: string | null
    lead_enabled: boolean
    lead_reward_amount: number | null
    recurring_enabled: boolean
    recurring_reward_amount: number | null
    recurring_reward_structure: string | null
    recurring_duration_months: number | null
    referral_enabled: boolean
    referral_gen1_rate: number | null
    referral_gen2_rate: number | null
    referral_gen3_rate: number | null
    contents: Content[]
    primaryColor: string
    expanded: boolean
    onToggle: () => void
}

function formatReward(amount: number | null, structure: string | null) {
    if (!amount) return null
    if (structure === 'PERCENTAGE') return `${amount}%`
    return `${(amount / 100).toFixed(0)}\u20AC`
}

export default function PortalProgramCard({
    missionTitle, missionDescription, linkUrl, stats,
    sale_enabled, sale_reward_amount, sale_reward_structure,
    lead_enabled, lead_reward_amount,
    recurring_enabled, recurring_reward_amount, recurring_reward_structure,
    recurring_duration_months,
    referral_enabled, referral_gen1_rate, referral_gen2_rate, referral_gen3_rate,
    contents, primaryColor, expanded, onToggle,
}: PortalProgramCardProps) {
    const t = useTranslations('portal')
    const tHome = useTranslations('portal.home')
    const [copied, setCopied] = useState(false)

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!linkUrl) return
        navigator.clipboard.writeText(linkUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const rewards: { icon: React.ElementType; label: string; value: string; detail?: string }[] = []
    if (sale_enabled && sale_reward_amount) {
        rewards.push({
            icon: DollarSign,
            label: tHome('perSale'),
            value: formatReward(sale_reward_amount, sale_reward_structure) || '',
            detail: tHome('perSaleDetail'),
        })
    }
    if (lead_enabled && lead_reward_amount) {
        rewards.push({
            icon: Users,
            label: tHome('perLead'),
            value: formatReward(lead_reward_amount, null) || '',
            detail: tHome('perLeadDetail'),
        })
    }
    if (recurring_enabled && recurring_reward_amount) {
        rewards.push({
            icon: RefreshCw,
            label: tHome('recurring'),
            value: formatReward(recurring_reward_amount, recurring_reward_structure) || '',
            detail: recurring_duration_months
                ? tHome('recurringFor', { months: recurring_duration_months })
                : tHome('recurringLifetime'),
        })
    }
    if (referral_enabled && referral_gen1_rate) {
        rewards.push({
            icon: UserPlus,
            label: tHome('perReferralGen1'),
            value: `${referral_gen1_rate / 100}%`,
            detail: tHome('perReferralGen1Detail'),
        })
        if (referral_gen2_rate) {
            rewards.push({
                icon: UserPlus,
                label: tHome('perReferralGen2'),
                value: `${referral_gen2_rate / 100}%`,
                detail: tHome('perReferralGen2Detail'),
            })
        }
        if (referral_gen3_rate) {
            rewards.push({
                icon: UserPlus,
                label: tHome('perReferralGen3'),
                value: `${referral_gen3_rate / 100}%`,
                detail: tHome('perReferralGen3Detail'),
            })
        }
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-shadow hover:shadow-sm">
            {/* Collapsed header */}
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-3 px-5 py-4 text-left"
            >
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{missionTitle}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
                        <MousePointerClick className="w-3 h-3" />
                        {stats.clicks}
                    </span>
                    <span className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
                        <DollarSign className="w-3 h-3" />
                        {stats.sales}
                    </span>
                    {linkUrl && (
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copied ? t('copied') : t('copyLink')}
                        </button>
                    )}
                    <ChevronDown
                        className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                    />
                </div>
            </button>

            {/* Expanded content */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-5 space-y-4 border-t border-gray-50 pt-4">
                            {/* Description */}
                            {missionDescription && (
                                <p className="text-xs text-gray-500 leading-relaxed">{missionDescription}</p>
                            )}

                            {/* Affiliate Link */}
                            {linkUrl && (
                                <div>
                                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">{t('yourLink')}</p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 overflow-hidden">
                                            <code className="text-xs text-gray-600 break-all">{linkUrl}</code>
                                        </div>
                                        <button
                                            onClick={handleCopy}
                                            className="flex items-center gap-1.5 px-3 py-2 text-white rounded-lg text-xs font-medium transition-all hover:opacity-90 flex-shrink-0"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Stats grid */}
                            <div className="grid grid-cols-4 gap-2">
                                {[
                                    { label: tHome('clicks'), value: stats.clicks },
                                    { label: tHome('leads'), value: stats.leads },
                                    { label: tHome('sales'), value: stats.sales },
                                    { label: tHome('revenue'), value: `${(stats.revenue / 100).toFixed(0)}\u20AC` },
                                ].map((s) => (
                                    <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                                        <p className="text-lg font-bold text-gray-900">{s.value}</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Rewards */}
                            {rewards.length > 0 && (
                                <div>
                                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2">{tHome('whatYouEarn')}</p>
                                    <div className="space-y-1.5">
                                        {rewards.map((r) => (
                                            <div key={r.label} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                                                <div
                                                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                                    style={{ backgroundColor: `${primaryColor}12` }}
                                                >
                                                    <r.icon className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-gray-700">{r.label}</p>
                                                    {r.detail && <p className="text-[10px] text-gray-400">{r.detail}</p>}
                                                </div>
                                                <span className="text-sm font-bold text-gray-900">{r.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Resources */}
                            {contents.length > 0 && (
                                <div>
                                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2">{tHome('resources')}</p>
                                    <div className="space-y-1">
                                        {contents.map((c) => (
                                            <a
                                                key={c.id}
                                                href={c.url || '#'}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors group"
                                            >
                                                <FileText className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="text-xs text-gray-600 flex-1 truncate">{c.title || c.url}</span>
                                                <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-gray-500 transition-colors" />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
