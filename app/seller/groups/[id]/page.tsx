'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Users, Copy, Check, ArrowLeft, ArrowRight, X, LogOut, Trash2 } from 'lucide-react'
import { getGroupDetail, leaveGroup, removeGroupMember } from '@/app/actions/group-actions'

export default function GroupDetailPage() {
    const router = useRouter()
    const params = useParams()
    const groupId = params.id as string

    const [loading, setLoading] = useState(true)
    const [group, setGroup] = useState<any>(null)
    const [isCreator, setIsCreator] = useState(false)
    const [sellerId, setSellerId] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

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
        if (!group?.invite_code) return
        const link = `${window.location.origin}/seller/groups/join/${group.invite_code}`
        navigator.clipboard.writeText(link)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleLeave = async () => {
        if (!confirm(isCreator ? 'As the creator, leaving will archive the group. Are you sure?' : 'Leave this group?')) return
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
        if (!confirm(`Remove ${memberName} from the group?`)) return
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
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    if (!group) {
        return (
            <div className="max-w-2xl mx-auto px-6 py-12 text-center">
                <p className="text-gray-500">Group not found or you are not a member.</p>
                <Link href="/seller/groups" className="text-violet-600 text-sm mt-2 inline-block">Back to Groups</Link>
            </div>
        )
    }

    const memberCount = group._count?.Members || group.Members?.length || 0

    return (
        <div className="max-w-3xl mx-auto px-6 py-8">
            <Link href="/seller/groups" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
                <ArrowLeft className="w-4 h-4" /> Back
            </Link>

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
                    {group.description && <p className="text-gray-500 mt-1">{group.description}</p>}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    group.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
                }`}>
                    {group.status}
                </span>
            </div>

            {/* Invite link */}
            {group.invite_code && group.status === 'ACTIVE' && (
                <div className="mb-6 p-4 bg-violet-50 rounded-xl border border-violet-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-violet-900">Invite link</p>
                            <p className="text-xs text-violet-600 mt-0.5 font-mono break-all">{window.location.origin}/seller/groups/join/{group.invite_code}</p>
                        </div>
                        <button
                            onClick={copyInviteLink}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors flex-shrink-0 ml-4"
                        >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                </div>
            )}

            {/* Members */}
            <div className="mb-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Members ({memberCount}/{group.max_members})
                </h2>
                <div className="space-y-2">
                    {group.Members?.map((member: any) => (
                        <div key={member.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100">
                            <div className="flex items-center gap-3">
                                {member.Seller?.Profile?.avatar_url ? (
                                    <img src={member.Seller.Profile.avatar_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                        <Users className="w-4 h-4 text-gray-400" />
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{member.Seller?.name || member.Seller?.email}</p>
                                    {member.seller_id === group.creator_id && (
                                        <span className="text-xs text-violet-600">Creator</span>
                                    )}
                                </div>
                            </div>
                            {/* Remove button (creator only, not self) */}
                            {isCreator && member.seller_id !== sellerId && (
                                <button
                                    onClick={() => handleRemoveMember(member.seller_id, member.Seller?.name || member.Seller?.email)}
                                    disabled={actionLoading === member.seller_id}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Remove member"
                                >
                                    {actionLoading === member.seller_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Missions */}
            <div className="mb-8">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Group Missions ({group.Missions?.length || 0})
                </h2>
                {group.Missions?.length > 0 ? (
                    <div className="space-y-2">
                        {group.Missions.map((gm: any) => (
                            <div key={gm.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100">
                                <div className="flex items-center gap-3">
                                    {gm.Mission?.logo_url ? (
                                        <img src={gm.Mission.logo_url} className="w-8 h-8 rounded-lg object-cover" alt="" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                                            <span className="text-xs font-bold text-violet-600">{gm.Mission?.company_name?.charAt(0) || 'M'}</span>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{gm.Mission?.title}</p>
                                        <p className="text-xs text-gray-500">{gm.Mission?.company_name} &middot; {gm.Mission?.reward}</p>
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-gray-300" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-6 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <p className="text-sm text-gray-500">No group missions yet.</p>
                        <Link href="/seller/marketplace" className="text-sm text-violet-600 hover:text-violet-700 font-medium mt-1 inline-block">
                            Browse marketplace &rarr;
                        </Link>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                    onClick={handleLeave}
                    disabled={actionLoading === 'leave'}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors disabled:opacity-50"
                >
                    {actionLoading === 'leave' ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                    {isCreator ? 'Leave & Archive Group' : 'Leave Group'}
                </button>
            </div>
        </div>
    )
}
