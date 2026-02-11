'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Users, Copy, Check, ArrowLeft, ArrowRight, Loader2, LogOut, X } from 'lucide-react'
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

    if (!group) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <p className="text-sm text-neutral-400 mb-2">{t('notFound')}</p>
                    <Link href="/seller/groups" className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors">
                        {t('backToGroups')}
                    </Link>
                </div>
            </div>
        )
    }

    const memberCount = group._count?.Members || group.Members?.length || 0

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="max-w-2xl mx-auto py-8"
        >
            <Link
                href="/seller/groups"
                className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-600 transition-colors mb-12"
            >
                <ArrowLeft className="w-3.5 h-3.5" /> {t('back')}
            </Link>

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="mb-12"
            >
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-extralight tracking-tight text-neutral-900">{group.name}</h1>
                    <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${group.status === 'ACTIVE' ? 'bg-green-500' : 'bg-neutral-300'}`} />
                        <span className="text-xs text-neutral-400">
                            {group.status === 'ACTIVE' ? t('active') : t('archived')}
                        </span>
                    </div>
                </div>
                {group.description && (
                    <p className="text-sm text-neutral-400 mt-2">{group.description}</p>
                )}
            </motion.div>

            {/* Invite link */}
            {group.invite_code && group.status === 'ACTIVE' && origin && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-12"
                >
                    <h2 className="text-xs uppercase tracking-[0.15em] text-neutral-400 mb-4">{t('inviteLink')}</h2>
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

            {/* How it works (for members) */}
            {!isCreator && group.status === 'ACTIVE' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 }}
                    className="mb-12 py-4 px-4 -mx-4 rounded-xl bg-neutral-50"
                >
                    <p className="text-sm text-neutral-500">{t('howItWorksPoints.revenue')}</p>
                </motion.div>
            )}

            {/* Members */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mb-12"
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs uppercase tracking-[0.15em] text-neutral-400">{t('members')}</h2>
                    <span className="text-xs text-neutral-300 tabular-nums">{memberCount}/{group.max_members}</span>
                </div>
                <div className="space-y-1">
                    {group.Members?.map((member: any, index: number) => (
                        <motion.div
                            key={member.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.04 * index }}
                            className="group flex items-center justify-between py-3 px-4 -mx-4 rounded-xl hover:bg-neutral-50 transition-colors"
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
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-neutral-600">{member.Seller?.name || member.Seller?.email}</span>
                                    {member.seller_id === group.creator_id && (
                                        <span className="text-[10px] uppercase tracking-[0.1em] text-neutral-400">{t('creator')}</span>
                                    )}
                                </div>
                            </div>
                            {isCreator && member.seller_id !== sellerId && (
                                <button
                                    onClick={() => handleRemoveMember(member.seller_id, member.Seller?.name || member.Seller?.email)}
                                    disabled={actionLoading === member.seller_id}
                                    className="p-1.5 text-neutral-300 hover:text-red-500 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    title={t('removeMember')}
                                >
                                    {actionLoading === member.seller_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                                </button>
                            )}
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* Missions */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="mb-12"
            >
                <h2 className="text-xs uppercase tracking-[0.15em] text-neutral-400 mb-4">{t('groupMissions')}</h2>
                {group.Missions?.length > 0 ? (
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
                        <p className="text-xs text-neutral-300 mt-1 mb-3">{t('noMissionsDesc')}</p>
                        <Link href="/seller/marketplace" className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors">
                            {t('browseMarketplace')} →
                        </Link>
                    </div>
                )}
            </motion.div>

            {/* Leave */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="pt-8 border-t border-neutral-100"
            >
                <button
                    onClick={handleLeave}
                    disabled={actionLoading === 'leave'}
                    className="flex items-center gap-2 text-xs text-neutral-400 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                    {actionLoading === 'leave' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                    {isCreator ? t('leaveAndArchive') : t('leaveGroup')}
                </button>
            </motion.div>
        </motion.div>
    )
}
