'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Copy, Check, ArrowLeft, ArrowRight, Loader2, LogOut, X, Shield, Link2, Wallet } from 'lucide-react'
import { getGroupDetail, leaveGroup, removeGroupMember } from '@/app/actions/group-actions'
import { useTranslations } from 'next-intl'

export default function GroupDetailPage() {
    const t = useTranslations('seller.groups')
    const router = useRouter()
    const params = useParams()
    const groupId = params.id as string

    const [loading, setLoading] = useState(true)
    const [group, setGroup] = useState<any>(null)
    const [isCreator, setIsCreator] = useState(false)
    const [sellerId, setSellerId] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [origin, setOrigin] = useState('')

    useEffect(() => { setOrigin(window.location.origin) }, [])

    const loadData = useCallback(async () => {
        setLoading(true)
        const result = await getGroupDetail(groupId)
        if (result.success) {
            setGroup(result.group)
            setIsCreator(result.isCreator || false)
            setSellerId(result.sellerId || null)
        }
        setLoading(false)
    }, [groupId])

    useEffect(() => { loadData() }, [loadData])

    const copyInviteLink = () => {
        if (!group?.invite_code || !origin) return
        navigator.clipboard.writeText(`${origin}/seller/groups/join/${group.invite_code}`)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleLeave = async () => {
        const msg = isCreator ? t('leaveCreatorConfirm') : t('leaveConfirm')
        if (!confirm(msg)) return
        setActionLoading('leave')
        const result = await leaveGroup()
        if (result.success) {
            router.push('/seller/groups')
        } else {
            alert(result.error || 'Failed to leave group')
        }
        setActionLoading(null)
    }

    const handleRemoveMember = async (memberId: string, memberName: string) => {
        if (!confirm(t('removeConfirm', { name: memberName }))) return
        setActionLoading(memberId)
        const result = await removeGroupMember(memberId)
        if (result.success) {
            loadData()
        } else {
            alert(result.error || 'Failed to remove member')
        }
        setActionLoading(null)
    }

    // Loading skeleton
    if (loading) {
        return (
            <div className="min-h-screen bg-[#FAFAFA]">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
                    <div className="animate-pulse space-y-6">
                        <div className="h-4 bg-gray-100 rounded w-24" />
                        <div>
                            <div className="h-7 bg-gray-200 rounded w-48 mb-2" />
                            <div className="h-4 bg-gray-100 rounded w-64" />
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 p-5 h-16" />
                        <div className="bg-white rounded-xl border border-gray-100 p-5 h-48" />
                        <div className="bg-white rounded-xl border border-gray-100 p-5 h-32" />
                    </div>
                </div>
            </div>
        )
    }

    if (!group) {
        return (
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
                <div className="text-center">
                    <Users className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-gray-400 mb-2">{t('notFound')}</p>
                    <Link href="/seller/groups" className="text-xs text-violet-500 font-medium">{t('backToGroups')}</Link>
                </div>
            </div>
        )
    }

    const memberCount = group._count?.Members || group.Members?.length || 0

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16"
            >
                <Link href="/seller/groups" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-8">
                    <ArrowLeft className="w-4 h-4" /> {t('back')}
                </Link>

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

                {/* Invite link */}
                {group.invite_code && group.status === 'ACTIVE' && origin && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
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

                {/* How it works (for non-creator members) */}
                {!isCreator && group.status === 'ACTIVE' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="mb-6 bg-violet-50 border border-violet-100 rounded-xl p-4"
                    >
                        <div className="flex items-start gap-3">
                            <Wallet className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-violet-700">{t('howItWorksPoints.revenue')}</p>
                        </div>
                    </motion.div>
                )}

                {/* Members */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-6 bg-white rounded-xl border border-gray-100"
                >
                    <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('members')}</p>
                        <p className="text-xs text-gray-300 tabular-nums">{memberCount}/{group.max_members}</p>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {group.Members?.map((member: any) => (
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
                                        <p className="text-[11px] text-gray-400">
                                            {member.seller_id === group.creator_id
                                                ? <span className="text-violet-500 font-medium">{t('creator')}</span>
                                                : t('member')
                                            }
                                        </p>
                                    </div>
                                </div>
                                {/* Remove button (creator only, not self) */}
                                {isCreator && member.seller_id !== sellerId && (
                                    <button
                                        onClick={() => handleRemoveMember(member.seller_id, member.Seller?.name || member.Seller?.email)}
                                        disabled={actionLoading === member.seller_id}
                                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title={t('removeMember')}
                                    >
                                        {actionLoading === member.seller_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Missions */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-8 bg-white rounded-xl border border-gray-100"
                >
                    <div className="px-4 py-3 border-b border-gray-50">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('groupMissions')}</p>
                    </div>
                    {group.Missions?.length > 0 ? (
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
                            <p className="text-xs text-gray-300 mb-3">{t('noMissionsDesc')}</p>
                            <Link href="/seller/marketplace" className="text-xs text-violet-500 hover:text-violet-600 font-medium">
                                {t('browseMarketplace')} &rarr;
                            </Link>
                        </div>
                    )}
                </motion.div>

                {/* Leave / Danger zone */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="pt-6 border-t border-gray-100"
                >
                    <button
                        onClick={handleLeave}
                        disabled={actionLoading === 'leave'}
                        className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                        {actionLoading === 'leave' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                        {isCreator ? t('leaveAndArchive') : t('leaveGroup')}
                    </button>
                </motion.div>
            </motion.div>
        </div>
    )
}
