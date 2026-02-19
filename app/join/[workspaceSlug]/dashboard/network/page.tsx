'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Users, Loader2 } from 'lucide-react'
import { usePortalData } from '../layout'
import { getPortalReferrals, getPortalSubTree } from '@/app/actions/portal'
import { staggerContainer, staggerItem, springGentle, floatVariants } from '@/lib/animations'

interface TreeNode {
    id: string
    name: string | null
    email: string
    status: string
    joinedAt: string
    salesCount: number
    earnings: number
    hasSubReferrals: boolean
    subReferralCount: number
}

export default function PortalNetworkPage() {
    const ctx = usePortalData()
    const t = useTranslations('portal.network')
    const params = useParams()
    const workspaceSlug = params.workspaceSlug as string

    const [gen1, setGen1] = useState<TreeNode[]>([])
    const [expanded, setExpanded] = useState<Set<string>>(new Set())
    const [subTree, setSubTree] = useState<Record<string, TreeNode[]>>({})
    const [loadingSub, setLoadingSub] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(true)

    if (!ctx) return null
    const { data } = ctx
    const primaryColor = data.workspace.portal_primary_color || '#7C3AED'

    // Dynamic rates and max depth from workspace config
    const config = data.referralConfig
    const gen1Pct = config.gen1Rate ? `${(config.gen1Rate / 100).toFixed(config.gen1Rate % 100 === 0 ? 0 : 1)}%` : null
    const gen2Pct = config.gen2Rate ? `${(config.gen2Rate / 100).toFixed(config.gen2Rate % 100 === 0 ? 0 : 1)}%` : null
    const gen3Pct = config.gen3Rate ? `${(config.gen3Rate / 100).toFixed(config.gen3Rate % 100 === 0 ? 0 : 1)}%` : null
    const maxGenerations = gen3Pct ? 3 : gen2Pct ? 2 : 1
    const rateLabel = [gen1Pct && `Gen 1 (${gen1Pct})`, gen2Pct && `Gen 2 (${gen2Pct})`, gen3Pct && `Gen 3 (${gen3Pct})`].filter(Boolean).join(' → ')

    const loadInitial = useCallback(async () => {
        const result = await getPortalReferrals(workspaceSlug, 1)
        if (result.success && result.data) {
            setGen1(result.data.referrals.map(r => ({
                ...r,
                earnings: r.totalEarnings,
                hasSubReferrals: r.subReferralCount > 0,
            })))
        }
        setLoading(false)
    }, [workspaceSlug])

    useEffect(() => { loadInitial() }, [loadInitial])

    const toggleExpand = async (sellerId: string, generation: number) => {
        const newExpanded = new Set(expanded)
        if (newExpanded.has(sellerId)) {
            newExpanded.delete(sellerId)
            setExpanded(newExpanded)
            return
        }

        newExpanded.add(sellerId)
        setExpanded(newExpanded)

        if (!subTree[sellerId]) {
            setLoadingSub(prev => new Set(prev).add(sellerId))
            const result = await getPortalSubTree(workspaceSlug, sellerId, generation)
            if (result.success && result.data) {
                setSubTree(prev => ({ ...prev, [sellerId]: result.data as TreeNode[] }))
            }
            setLoadingSub(prev => { const n = new Set(prev); n.delete(sellerId); return n })
        }
    }

    const renderNode = (node: TreeNode, generation: number, depth: number) => {
        const isExpanded = expanded.has(node.id)
        const isLoading = loadingSub.has(node.id)
        const children = subTree[node.id]
        const canExpand = node.hasSubReferrals && generation < maxGenerations

        return (
            <div key={node.id}>
                <div
                    className="flex items-center gap-3 px-3 py-3 rounded-xl row-hover transition-colors cursor-pointer"
                    style={{ paddingLeft: `${12 + depth * 24}px` }}
                    onClick={() => canExpand && toggleExpand(node.id, generation)}
                >
                    {canExpand ? (
                        <ChevronRight
                            className={`w-3.5 h-3.5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                        />
                    ) : (
                        <span className="w-3.5 flex-shrink-0" />
                    )}
                    <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                        style={{ backgroundColor: primaryColor, opacity: 1 - depth * 0.2 }}
                    >
                        {(node.name || node.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{node.name || node.email}</p>
                        <p className="text-[10px] text-gray-400">
                            Gen {generation} &middot; {node.salesCount} sales
                            {node.subReferralCount > 0 && ` · ${node.subReferralCount} referrals`}
                        </p>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full badge-pop ${
                        node.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                        {node.status}
                    </span>
                    <span className="text-xs font-semibold text-gray-700">{(node.earnings / 100).toFixed(0)}&euro;</span>
                </div>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2 py-3" style={{ paddingLeft: `${36 + depth * 24}px` }}>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                                    <span className="text-[11px] text-gray-400">Loading...</span>
                                </div>
                            ) : children ? (
                                children.map(child => renderNode(child, generation + 1, depth + 1))
                            ) : null}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        )
    }

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="space-y-5"
        >
            <motion.div variants={staggerItem} transition={springGentle}>
                <h1 className="text-lg font-semibold text-gray-900 mb-1">{t('title')}</h1>
                <p className="text-xs text-gray-500 mb-4">{rateLabel}</p>
            </motion.div>

            <motion.div
                variants={staggerItem}
                transition={springGentle}
                className="bg-white rounded-2xl border border-gray-100 card-hover p-4"
            >
                {loading ? (
                    <div className="space-y-3 py-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="skeleton-shimmer h-12 rounded-xl" />
                        ))}
                    </div>
                ) : gen1.length === 0 ? (
                    <div className="text-center py-12">
                        <motion.div variants={floatVariants} animate="float">
                            <Users className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                        </motion.div>
                        <p className="text-sm text-gray-500">{t('empty')}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {gen1.map(node => renderNode(node, 1, 0))}
                    </div>
                )}
            </motion.div>
        </motion.div>
    )
}
