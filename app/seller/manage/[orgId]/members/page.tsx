'use client'

import { useState } from 'react'
import { Loader2, UserPlus, Check, X, Trash2, Mail } from 'lucide-react'
import { useOrg } from '../layout'
import { inviteMemberToOrg, approveOrgMember, removeOrgMember } from '@/app/actions/organization-actions'

function MemberStatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        PENDING: 'bg-orange-50 text-orange-700',
        ACTIVE: 'bg-green-50 text-green-700',
        REMOVED: 'bg-red-50 text-red-700',
    }
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
            {status}
        </span>
    )
}

export default function ManageOrgMembers() {
    const { org, reload } = useOrg()
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviting, setInviting] = useState(false)
    const [inviteMsg, setInviteMsg] = useState('')
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    if (!org) return null

    const pendingMembers = org.Members?.filter((m: any) => m.status === 'PENDING') || []
    const activeMembers = org.Members?.filter((m: any) => m.status === 'ACTIVE') || []
    const removedMembers = org.Members?.filter((m: any) => m.status === 'REMOVED') || []

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inviteEmail.trim()) return
        setInviting(true)
        setInviteMsg('')
        const result = await inviteMemberToOrg(org.id, inviteEmail.trim())
        if (result.success) {
            setInviteMsg('Invitation sent!')
            setInviteEmail('')
            await reload()
        } else {
            setInviteMsg(result.error || 'Failed to invite')
        }
        setInviting(false)
    }

    const handleApprove = async (membershipId: string) => {
        setActionLoading(membershipId)
        await approveOrgMember(membershipId)
        await reload()
        setActionLoading(null)
    }

    const handleRemove = async (membershipId: string) => {
        setActionLoading(membershipId)
        await removeOrgMember(membershipId)
        await reload()
        setActionLoading(null)
    }

    return (
        <div className="space-y-8">
            {/* Invite */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-violet-500" /> Invite a Seller
                </h2>
                <form onSubmit={handleInvite} className="flex gap-3">
                    <div className="flex-1 relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="seller@email.com"
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={inviting || !inviteEmail.trim()}
                        className="px-4 py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                    >
                        {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                        Invite
                    </button>
                </form>
                {inviteMsg && <p className="text-xs mt-2 text-gray-500">{inviteMsg}</p>}
            </div>

            {/* Pending */}
            {pendingMembers.length > 0 && (
                <div>
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Pending ({pendingMembers.length})</h2>
                    <div className="space-y-2">
                        {pendingMembers.map((m: any) => (
                            <div key={m.id} className="flex items-center justify-between px-4 py-3 bg-white border border-gray-100 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center">
                                        <span className="text-xs font-medium text-orange-600">{(m.Seller?.name || m.Seller?.email || '?').charAt(0).toUpperCase()}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{m.Seller?.name || m.Seller?.email}</p>
                                        <p className="text-xs text-gray-400">{m.invited_by ? 'Invited' : 'Applied'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {actionLoading === m.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                    ) : (
                                        <>
                                            <button onClick={() => handleApprove(m.id)} className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100" title="Approve">
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleRemove(m.id)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100" title="Reject">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Active */}
            <div>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Active Members ({activeMembers.length})</h2>
                {activeMembers.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No active members yet. Invite sellers to join!</p>
                ) : (
                    <div className="space-y-2">
                        {activeMembers.map((m: any) => (
                            <div key={m.id} className="flex items-center justify-between px-4 py-3 bg-white border border-gray-100 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                                        <span className="text-xs font-medium text-green-600">{(m.Seller?.name || m.Seller?.email || '?').charAt(0).toUpperCase()}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{m.Seller?.name || 'Unknown'}</p>
                                        <p className="text-xs text-gray-400">{m.Seller?.email}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemove(m.id)}
                                    disabled={actionLoading === m.id}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Remove member"
                                >
                                    {actionLoading === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Removed */}
            {removedMembers.length > 0 && (
                <div>
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Removed ({removedMembers.length})</h2>
                    <div className="space-y-2">
                        {removedMembers.map((m: any) => (
                            <div key={m.id} className="flex items-center px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl opacity-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                        <span className="text-xs font-medium text-gray-500">{(m.Seller?.name || '?').charAt(0).toUpperCase()}</span>
                                    </div>
                                    <p className="text-sm text-gray-500">{m.Seller?.name || m.Seller?.email}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
