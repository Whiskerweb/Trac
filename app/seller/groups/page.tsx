'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Users, Plus, Copy, Check, ArrowRight, Loader2 } from 'lucide-react'
import { getMyGroup } from '@/app/actions/group-actions'
import { useTranslations } from 'next-intl'

export default function GroupsPage() {
    const t = useTranslations('seller.groups')
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [group, setGroup] = useState<any>(null)
    const [isCreator, setIsCreator] = useState(false)
    const [copied, setCopied] = useState(false)
    const [origin, setOrigin] = useState('')

    useEffect(() => { setOrigin(window.location.origin) }, [])

    const loadData = useCallback(async () => {
        setLoading(true)
        const result = await getMyGroup()
        if (result.success) {
            setGroup(result.group)
            setIsCreator(result.isCreator || false)
        }
        setLoading(false)
    }, [])

    useEffect(() => { loadData() }, [loadData])

    const copyInviteLink = () => {
        if (!group?.invite_code || !origin) return
        navigator.clipboard.writeText(`${origin}/seller/groups/join/${group.invite_code}`)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (loading) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                    <span className="text-xs text-neutral-400 tracking-wide">Loading</span>
                </motion.div>
            </div>
        )
    }

    // No group — empty state
    if (!group) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="max-w-2xl mx-auto py-8"
            >
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                    className="text-center mb-16"
                >
                    <p className="text-xs uppercase tracking-[0.2em] text-neutral-400 mb-4">{t('title')}</p>
                    <h1 className="text-3xl md:text-4xl font-extralight tracking-tight text-neutral-900 mb-3">
                        {t('noGroup')}
                    </h1>
                    <p className="text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
                        {t('noGroupDesc')}
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-3 mb-16"
                >
                    <Link
                        href="/seller/groups/create"
                        className="group flex items-center justify-between py-5 px-5 -mx-1 rounded-2xl hover:bg-neutral-50 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center">
                                <Plus className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-neutral-900">{t('create')}</p>
                                <p className="text-xs text-neutral-400 mt-0.5">{t('createDesc')}</p>
                            </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500 group-hover:translate-x-0.5 transition-all" />
                    </Link>

                    <div className="flex items-center gap-4 py-5 px-5 -mx-1">
                        <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
                            <Users className="w-4 h-4 text-neutral-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-neutral-900">{t('join')}</p>
                            <p className="text-xs text-neutral-400 mt-0.5">{t('joinDesc')}</p>
                        </div>
                    </div>
                </motion.div>

                {/* How it works */}
                <motion.details
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="group"
                >
                    <summary className="text-xs uppercase tracking-[0.15em] text-neutral-400 cursor-pointer hover:text-neutral-600 transition-colors list-none flex items-center gap-2">
                        <span className="w-4 h-px bg-neutral-200 group-open:rotate-90 transition-transform" />
                        {t('howItWorks')}
                    </summary>
                    <div className="mt-6 pl-6 space-y-4 text-sm text-neutral-500 border-l border-neutral-100">
                        <p><span className="text-neutral-400">1.</span> {t('howItWorksPoints.links')}</p>
                        <p><span className="text-neutral-400">2.</span> {t('howItWorksPoints.revenue')}</p>
                        <p><span className="text-neutral-400">3.</span> {t('howItWorksPoints.separate')}</p>
                        <p><span className="text-neutral-400">4.</span> {t('howItWorksPoints.limit')}</p>
                    </div>
                </motion.details>
            </motion.div>
        )
    }

    // Has group — dashboard
    const memberCount = group._count?.Members || group.Members?.length || 0
    const missionCount = group.Missions?.length || 0

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="max-w-2xl mx-auto py-8"
        >
            {/* Hero */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="text-center mb-16"
            >
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-400 mb-4">{t('title')}</p>
                <h1 className="text-3xl md:text-4xl font-extralight tracking-tight text-neutral-900">
                    {group.name}
                </h1>
                {group.description && (
                    <p className="text-sm text-neutral-400 mt-3">{group.description}</p>
                )}
                <div className="inline-flex items-center gap-1.5 mt-4">
                    <div className={`w-1.5 h-1.5 rounded-full ${group.status === 'ACTIVE' ? 'bg-green-500' : 'bg-neutral-300'}`} />
                    <span className="text-xs text-neutral-400">
                        {group.status === 'ACTIVE' ? t('active') : t('archived')}
                    </span>
                </div>
            </motion.div>

            {/* Stats */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-3 gap-px bg-neutral-100 rounded-2xl overflow-hidden mb-12"
            >
                <div className="bg-white p-6 text-center">
                    <p className="text-2xl font-light text-neutral-900 tabular-nums">{memberCount}<span className="text-neutral-300">/{group.max_members}</span></p>
                    <p className="text-xs text-neutral-400 mt-1">{t('members')}</p>
                </div>
                <div className="bg-white p-6 text-center">
                    <p className="text-2xl font-light text-neutral-900 tabular-nums">{missionCount}</p>
                    <p className="text-xs text-neutral-400 mt-1">{t('activeMissions')}</p>
                </div>
                <div className="bg-white p-6 text-center">
                    <p className="text-2xl font-light text-neutral-900">{isCreator ? t('creator') : t('member')}</p>
                    <p className="text-xs text-neutral-400 mt-1">Role</p>
                </div>
            </motion.div>

            {/* Invite link */}
            {group.invite_code && group.status === 'ACTIVE' && origin && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-12"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xs uppercase tracking-[0.15em] text-neutral-400">{t('inviteLink')}</h2>
                    </div>
                    <div className="flex items-center justify-between py-4 px-4 -mx-4 rounded-xl bg-neutral-50">
                        <p className="text-sm text-neutral-500 font-mono truncate mr-4">
                            {origin}/seller/groups/join/{group.invite_code}
                        </p>
                        <button
                            onClick={copyInviteLink}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-black transition-colors flex-shrink-0"
                        >
                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copied ? t('copied') : t('copyLink')}
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Members */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="mb-12"
            >
                <h2 className="text-xs uppercase tracking-[0.15em] text-neutral-400 mb-6">{t('members')}</h2>
                <div className="space-y-1">
                    {group.Members?.map((member: any, index: number) => (
                        <motion.div
                            key={member.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.04 * index }}
                            className="flex items-center justify-between py-3 px-4 -mx-4 rounded-xl hover:bg-neutral-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                {member.Seller?.Profile?.avatar_url ? (
                                    <img src={member.Seller.Profile.avatar_url} className="w-7 h-7 rounded-full object-cover" alt="" />
                                ) : (
                                    <div className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center">
                                        <span className="text-[10px] font-medium text-neutral-500">
                                            {(member.Seller?.name || member.Seller?.email || '?').charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                                <span className="text-sm text-neutral-600">{member.Seller?.name || member.Seller?.email}</span>
                            </div>
                            {member.seller_id === group.creator_id && (
                                <span className="text-[10px] uppercase tracking-[0.1em] text-neutral-400">{t('creator')}</span>
                            )}
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* Missions */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mb-12"
            >
                <h2 className="text-xs uppercase tracking-[0.15em] text-neutral-400 mb-6">{t('groupMissions')}</h2>
                {missionCount > 0 ? (
                    <div className="space-y-1">
                        {group.Missions.map((gm: any, index: number) => (
                            <motion.div
                                key={gm.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.04 * index }}
                                className="flex items-center justify-between py-3 px-4 -mx-4 rounded-xl hover:bg-neutral-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    {gm.Mission?.logo_url ? (
                                        <img src={gm.Mission.logo_url} className="w-7 h-7 rounded-lg object-cover" alt="" />
                                    ) : (
                                        <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center">
                                            <span className="text-[10px] font-bold text-neutral-400">
                                                {gm.Mission?.company_name?.charAt(0) || 'M'}
                                            </span>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm text-neutral-600">{gm.Mission?.title}</p>
                                        <p className="text-[11px] text-neutral-400">{gm.Mission?.company_name}</p>
                                    </div>
                                </div>
                                <span className="text-xs text-neutral-400 tabular-nums">{gm.Mission?.reward}</span>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-neutral-400 text-sm">{t('noMissions')}</p>
                        <Link href="/seller/marketplace" className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors mt-1 inline-block">
                            {t('browseMarketplace')} →
                        </Link>
                    </div>
                )}
            </motion.div>

            {/* Manage */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
            >
                <Link
                    href={`/seller/groups/${group.id}`}
                    className="group inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                    {t('manageGroup')}
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </Link>
            </motion.div>
        </motion.div>
    )
}
