'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Users, Plus, Copy, Check, ArrowRight, Shield } from 'lucide-react'
import { getMyGroup } from '@/app/actions/group-actions'

export default function GroupsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [group, setGroup] = useState<any>(null)
    const [isCreator, setIsCreator] = useState(false)
    const [copied, setCopied] = useState(false)

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
        if (!group?.invite_code) return
        const link = `${window.location.origin}/seller/groups/join/${group.invite_code}`
        navigator.clipboard.writeText(link)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    // No group → show create/join CTA
    if (!group) {
        return (
            <div className="max-w-2xl mx-auto px-6 py-12">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Groups</h1>
                <p className="text-gray-500 mb-8">Pool your earnings with other sellers. Every sale is split equally among group members.</p>

                <div className="grid gap-4 sm:grid-cols-2">
                    <Link
                        href="/seller/groups/create"
                        className="flex flex-col items-center gap-3 p-8 rounded-2xl border-2 border-dashed border-gray-200 hover:border-violet-300 hover:bg-violet-50/50 transition-all group"
                    >
                        <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center group-hover:bg-violet-200 transition-colors">
                            <Plus className="w-6 h-6 text-violet-600" />
                        </div>
                        <div className="text-center">
                            <p className="font-semibold text-gray-900">Create a Group</p>
                            <p className="text-sm text-gray-500 mt-1">Start a new group and invite sellers</p>
                        </div>
                    </Link>

                    <div className="flex flex-col items-center gap-3 p-8 rounded-2xl border border-gray-200 bg-gray-50">
                        <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center">
                            <Users className="w-6 h-6 text-gray-500" />
                        </div>
                        <div className="text-center">
                            <p className="font-semibold text-gray-900">Join a Group</p>
                            <p className="text-sm text-gray-500 mt-1">Ask a group creator for their invite link</p>
                        </div>
                    </div>
                </div>

                <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex gap-3">
                        <Shield className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-blue-900">How Groups work</p>
                            <ul className="text-sm text-blue-700 mt-1 space-y-1">
                                <li>Each member gets their own tracking link for group missions</li>
                                <li>When any member makes a sale, the commission is split equally (1/N)</li>
                                <li>Group missions are separate from your personal missions</li>
                                <li>You can only be in one group at a time (max 10 members)</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Has group → show detail
    const memberCount = group._count?.Members || group.Members?.length || 0

    return (
        <div className="max-w-3xl mx-auto px-6 py-8">
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
                            <p className="text-xs text-violet-600 mt-0.5 font-mono">{window.location.origin}/seller/groups/join/{group.invite_code}</p>
                        </div>
                        <button
                            onClick={copyInviteLink}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
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
                        </div>
                    ))}
                </div>
            </div>

            {/* Group missions */}
            <div className="mb-6">
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
            <div className="flex gap-3">
                <Link
                    href={`/seller/groups/${group.id}`}
                    className="px-4 py-2 text-sm font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-xl transition-colors"
                >
                    Manage group
                </Link>
            </div>
        </div>
    )
}
