'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Users, Plus, Copy, Check, ArrowRight, Info, Link2, Wallet, Shield, Loader2 } from 'lucide-react'
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

    // Loading skeleton
    if (loading) {
        return (
            <div className="min-h-screen bg-[#FAFAFA]">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
                    <div className="animate-pulse space-y-6">
                        <div>
                            <div className="h-7 bg-gray-200 rounded w-40 mb-2" />
                            <div className="h-4 bg-gray-100 rounded w-80" />
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 p-5 h-20" />
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-white rounded-xl border border-gray-100 p-4 h-20" />
                            <div className="bg-white rounded-xl border border-gray-100 p-4 h-20" />
                            <div className="bg-white rounded-xl border border-gray-100 p-4 h-20" />
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 p-5 h-48" />
                    </div>
                </div>
            </div>
        )
    }

    // No group → empty state
    if (!group) {
        return (
            <div className="min-h-screen bg-[#FAFAFA]">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16"
                >
                    <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">{t('title')}</h1>
                    <p className="text-gray-500 text-[15px] mt-1 mb-10">{t('noGroupDesc')}</p>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Link
                            href="/seller/groups/create"
                            className="flex items-start gap-4 p-5 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200 group"
                        >
                            <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-100 transition-colors">
                                <Plus className="w-5 h-5 text-violet-600" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900 text-[15px]">{t('create')}</p>
                                <p className="text-sm text-gray-500 mt-0.5">{t('createDesc')}</p>
                            </div>
                        </Link>

                        <div className="flex items-start gap-4 p-5 bg-white rounded-xl border border-gray-100">
                            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                                <Users className="w-5 h-5 text-gray-400" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900 text-[15px]">{t('join')}</p>
                                <p className="text-sm text-gray-500 mt-0.5">{t('joinDesc')}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 bg-white rounded-xl border border-gray-100 p-5">
                        <p className="text-sm font-medium text-gray-900 mb-3">{t('howItWorks')}</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {[
                                { icon: Link2, text: t('howItWorksPoints.links') },
                                { icon: Wallet, text: t('howItWorksPoints.revenue') },
                                { icon: Shield, text: t('howItWorksPoints.separate') },
                                { icon: Users, text: t('howItWorksPoints.limit') },
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-2.5">
                                    <item.icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-gray-500">{item.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        )
    }

    // Has group → dashboard view
    const memberCount = group._count?.Members || group.Members?.length || 0
    const missionCount = group.Missions?.length || 0

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16"
            >
                {/* Header */}
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">{group.name}</h1>
                        {group.description && <p className="text-gray-500 text-[15px] mt-1">{group.description}</p>}
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
                        group.status === 'ACTIVE'
                            ? 'bg-green-50 text-green-600 border border-green-100'
                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                    }`}>
                        {group.status === 'ACTIVE' ? t('active') : t('archived')}
                    </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                        { label: t('members'), value: `${memberCount}/${group.max_members}`, icon: Users },
                        { label: t('activeMissions'), value: missionCount, icon: ArrowRight },
                        { label: 'Role', value: isCreator ? t('creator') : t('member'), icon: Shield },
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * i }}
                            className="bg-white rounded-xl border border-gray-100 p-4"
                        >
                            <stat.icon className="w-4 h-4 text-gray-300 mb-2" />
                            <p className="text-xl font-semibold text-gray-900 tabular-nums">{stat.value}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{stat.label}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Invite link */}
                {group.invite_code && group.status === 'ACTIVE' && origin && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mb-6 bg-white rounded-xl border border-gray-100 p-4"
                    >
                        <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{t('inviteLink')}</p>
                                <p className="text-sm text-gray-600 font-mono truncate">{origin}/seller/groups/join/{group.invite_code}</p>
                            </div>
                            <button
                                onClick={copyInviteLink}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-colors flex-shrink-0 ml-4"
                            >
                                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                {copied ? t('copied') : t('copyLink')}
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Members */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mb-6 bg-white rounded-xl border border-gray-100"
                >
                    <div className="px-4 py-3 border-b border-gray-50">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('members')}</p>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {group.Members?.map((member: any, i: number) => (
                            <div key={member.id} className="flex items-center justify-between px-4 py-3">
                                <div className="flex items-center gap-3">
                                    {member.Seller?.Profile?.avatar_url ? (
                                        <img src={member.Seller.Profile.avatar_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                            <span className="text-xs font-medium text-white">{(member.Seller?.name || member.Seller?.email || '?').charAt(0).toUpperCase()}</span>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{member.Seller?.name || member.Seller?.email}</p>
                                        {member.seller_id === group.creator_id && (
                                            <p className="text-[11px] text-violet-500 font-medium">{t('creator')}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Missions */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mb-6 bg-white rounded-xl border border-gray-100"
                >
                    <div className="px-4 py-3 border-b border-gray-50">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('groupMissions')}</p>
                    </div>
                    {missionCount > 0 ? (
                        <div className="divide-y divide-gray-50">
                            {group.Missions.map((gm: any) => (
                                <div key={gm.id} className="flex items-center justify-between px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        {gm.Mission?.logo_url ? (
                                            <img src={gm.Mission.logo_url} className="w-8 h-8 rounded-lg object-cover" alt="" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                                                <span className="text-xs font-bold text-violet-600">{gm.Mission?.company_name?.charAt(0) || 'M'}</span>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{gm.Mission?.title}</p>
                                            <p className="text-xs text-gray-400">{gm.Mission?.company_name} &middot; {gm.Mission?.reward}</p>
                                        </div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-gray-300" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="px-4 py-8 text-center">
                            <Users className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                            <p className="text-sm text-gray-400 mb-1">{t('noMissions')}</p>
                            <Link href="/seller/marketplace" className="text-xs text-violet-500 hover:text-violet-600 font-medium">
                                {t('browseMarketplace')} &rarr;
                            </Link>
                        </div>
                    )}
                </motion.div>

                {/* Actions */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                >
                    <Link
                        href={`/seller/groups/${group.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        {t('manageGroup')} <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </motion.div>
            </motion.div>
        </div>
    )
}
