'use client'

import { useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, UserPlus, Check, X, Mail, Search, Users, Clock, UserCheck, UserMinus, Send, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOrg } from '../layout'
import { inviteMemberToOrg, approveOrgMember, removeOrgMember } from '@/app/actions/organization-actions'

/* ── Palette for avatar gradients keyed off first letter ── */
const AVATAR_GRADIENTS: Record<string, string> = {
    A: 'from-rose-400 to-pink-500',
    B: 'from-orange-400 to-amber-500',
    C: 'from-amber-400 to-yellow-500',
    D: 'from-lime-400 to-green-500',
    E: 'from-emerald-400 to-teal-500',
    F: 'from-teal-400 to-cyan-500',
    G: 'from-cyan-400 to-sky-500',
    H: 'from-sky-400 to-blue-500',
    I: 'from-blue-400 to-indigo-500',
    J: 'from-indigo-400 to-violet-500',
    K: 'from-violet-400 to-purple-500',
    L: 'from-purple-400 to-fuchsia-500',
    M: 'from-fuchsia-400 to-pink-500',
    N: 'from-rose-400 to-red-500',
    O: 'from-orange-400 to-red-400',
    P: 'from-violet-400 to-indigo-500',
    Q: 'from-teal-400 to-emerald-500',
    R: 'from-blue-400 to-cyan-500',
    S: 'from-amber-400 to-orange-500',
    T: 'from-pink-400 to-rose-500',
    U: 'from-sky-400 to-indigo-500',
    V: 'from-emerald-400 to-green-500',
    W: 'from-purple-400 to-violet-500',
    X: 'from-red-400 to-orange-500',
    Y: 'from-lime-400 to-emerald-500',
    Z: 'from-cyan-400 to-blue-500',
}

function getGradient(name: string) {
    const letter = (name || '?').charAt(0).toUpperCase()
    return AVATAR_GRADIENTS[letter] || 'from-neutral-400 to-neutral-500'
}

/* ── Stagger animation config ── */
const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.05 },
    },
}

const item = {
    hidden: { opacity: 0, y: 6 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const } },
}

/* ── Avatar ── */
function MemberAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
    const letter = (name || '?').charAt(0).toUpperCase()
    const gradient = getGradient(name)
    const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-9 h-9 text-sm'
    return (
        <div className={`${sizeClass} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
            <span className="font-semibold text-white/90 drop-shadow-sm">{letter}</span>
        </div>
    )
}

/* ── Stat pill ── */
function StatPill({ icon: Icon, label, value, color }: {
    icon: React.ElementType; label: string; value: number; color: string
}) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-3 bg-white border border-neutral-200/60 rounded-2xl px-5 py-4 shadow-sm"
        >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-[18px] h-[18px]" />
            </div>
            <div>
                <p className="text-xl font-semibold text-neutral-900 tracking-tight">{value}</p>
                <p className="text-[11px] text-neutral-400 font-medium">{label}</p>
            </div>
        </motion.div>
    )
}

export default function ManageOrgMembers() {
    const { org, isLeader, reload } = useOrg()
    const params = useParams()
    const orgId = params.orgId as string
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviting, setInviting] = useState(false)
    const [inviteMsg, setInviteMsg] = useState<{ text: string; success: boolean } | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [showRemoved, setShowRemoved] = useState(false)

    if (!org) return null

    const pendingMembers = org.Members?.filter((m: any) => m.status === 'PENDING') || []
    const activeMembers = org.Members?.filter((m: any) => m.status === 'ACTIVE') || []
    const removedMembers = org.Members?.filter((m: any) => m.status === 'REMOVED') || []

    // ── Member-only read-only view ──
    if (!isLeader) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <h2 className="text-[12px] font-semibold text-neutral-400 uppercase tracking-wider">
                        Members
                    </h2>
                    <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {activeMembers.length}
                    </span>
                </div>
                {activeMembers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 bg-white border border-neutral-200/60 rounded-2xl shadow-sm">
                        <Users className="w-8 h-8 text-neutral-300 mb-3" />
                        <p className="text-[14px] text-neutral-400">No active members yet</p>
                    </div>
                ) : (
                    <div className="bg-white border border-neutral-200/60 rounded-2xl shadow-sm overflow-hidden">
                        {activeMembers.map((m: any, i: number) => (
                            <Link
                                key={m.id}
                                href={`/seller/manage/${orgId}/member/${m.Seller?.id}`}
                                className={`flex items-center gap-3.5 px-5 py-3.5 hover:bg-neutral-50/60 transition-colors ${
                                    i < activeMembers.length - 1 ? 'border-b border-neutral-100' : ''
                                }`}
                            >
                                <MemberAvatar name={m.Seller?.name || m.Seller?.email || '?'} />
                                <div>
                                    <p className="text-[14px] font-medium text-neutral-900">{m.Seller?.name || 'Unknown'}</p>
                                    <p className="text-[12px] text-neutral-400">{m.Seller?.email}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    const filteredActive = useMemo(() => {
        if (!searchQuery.trim()) return activeMembers
        const q = searchQuery.toLowerCase()
        return activeMembers.filter((m: any) =>
            (m.Seller?.name || '').toLowerCase().includes(q) ||
            (m.Seller?.email || '').toLowerCase().includes(q)
        )
    }, [activeMembers, searchQuery])

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inviteEmail.trim()) return
        setInviting(true)
        setInviteMsg(null)
        const result = await inviteMemberToOrg(org.id, inviteEmail.trim())
        if (result.success) {
            setInviteMsg({ text: 'Invitation sent successfully', success: true })
            setInviteEmail('')
            await reload()
        } else {
            setInviteMsg({ text: result.error || 'Failed to send invitation', success: false })
        }
        setInviting(false)
        setTimeout(() => setInviteMsg(null), 4000)
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

    const totalMembers = activeMembers.length + pendingMembers.length

    return (
        <div className="space-y-10">
            {/* ── Stats ── */}
            <div className="grid grid-cols-3 gap-3">
                <StatPill icon={Users} label="Total" value={totalMembers} color="bg-neutral-100 text-neutral-600" />
                <StatPill icon={UserCheck} label="Active" value={activeMembers.length} color="bg-emerald-50 text-emerald-600" />
                <StatPill icon={Clock} label="Pending" value={pendingMembers.length} color="bg-amber-50 text-amber-600" />
            </div>

            {/* ── Invite ── */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="bg-white rounded-2xl border border-neutral-200/60 shadow-sm p-6"
            >
                <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center">
                        <UserPlus className="w-4 h-4 text-neutral-600" />
                    </div>
                    <div>
                        <h2 className="text-[15px] font-semibold text-neutral-900">Invite a Seller</h2>
                        <p className="text-[12px] text-neutral-400">Send an email invitation to join your organization</p>
                    </div>
                </div>
                <form onSubmit={handleInvite} className="flex gap-3">
                    <div className="flex-1 relative group">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 group-focus-within:text-neutral-500 transition-colors" />
                        <input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="seller@email.com"
                            className="w-full pl-10 pr-4 h-11 bg-neutral-50/50 border border-neutral-200 rounded-xl text-[15px] text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900/5 focus:border-neutral-300 focus:bg-white transition-all"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={inviting || !inviteEmail.trim()}
                        className="h-11 px-5 bg-neutral-900 text-white rounded-xl text-[14px] font-medium hover:bg-neutral-800 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2 transition-all"
                    >
                        {inviting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-3.5 h-3.5" />
                        )}
                        <span>Send Invite</span>
                    </button>
                </form>
                <AnimatePresence>
                    {inviteMsg && (
                        <motion.p
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className={`text-xs mt-3 flex items-center gap-1.5 ${inviteMsg.success ? 'text-emerald-600' : 'text-red-500'}`}
                        >
                            {inviteMsg.success ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            {inviteMsg.text}
                        </motion.p>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* ── Pending Members ── */}
            <AnimatePresence>
                {pendingMembers.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <h2 className="text-[12px] font-semibold text-neutral-400 uppercase tracking-wider">
                                Awaiting Approval
                            </h2>
                            <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                {pendingMembers.length}
                            </span>
                        </div>
                        <motion.div className="space-y-2" variants={container} initial="hidden" animate="show">
                            {pendingMembers.map((m: any) => (
                                <motion.div
                                    key={m.id}
                                    variants={item}
                                    className="flex items-center justify-between px-4 py-3.5 bg-white border border-neutral-200/60 rounded-xl shadow-sm hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-shadow"
                                >
                                    <div className="flex items-center gap-3.5">
                                        <div className="relative">
                                            <MemberAvatar name={m.Seller?.name || m.Seller?.email || '?'} />
                                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-white" />
                                        </div>
                                        <div>
                                            <p className="text-[14px] font-medium text-neutral-900">{m.Seller?.name || m.Seller?.email}</p>
                                            <p className="text-[12px] text-neutral-400 mt-0.5">
                                                {m.invited_by ? 'Invited' : 'Applied to join'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {actionLoading === m.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-neutral-300" />
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => handleApprove(m.id)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 active:scale-[0.97] transition-all"
                                                    title="Approve"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleRemove(m.id)}
                                                    className="p-1.5 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-lg active:scale-[0.97] transition-all"
                                                    title="Reject"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Active Members ── */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <h2 className="text-[12px] font-semibold text-neutral-400 uppercase tracking-wider">
                            Active Members
                        </h2>
                        <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            {activeMembers.length}
                        </span>
                    </div>
                    {activeMembers.length > 4 && (
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-300" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search members..."
                                className="pl-8.5 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg w-48 focus:outline-none focus:ring-1 focus:ring-neutral-900/5 focus:border-neutral-300 transition-all placeholder:text-neutral-300"
                                style={{ paddingLeft: '2rem' }}
                            />
                        </div>
                    )}
                </div>

                {activeMembers.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-16 bg-white border border-neutral-200/60 rounded-2xl shadow-sm"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-neutral-50 flex items-center justify-center mb-4">
                            <Users className="w-5 h-5 text-neutral-300" />
                        </div>
                        <p className="text-[14px] font-medium text-neutral-400">No active members yet</p>
                        <p className="text-[12px] text-neutral-300 mt-1">Invite sellers above to build your team</p>
                    </motion.div>
                ) : (
                    <div className="bg-white border border-neutral-200/60 rounded-2xl shadow-sm overflow-hidden">
                        <motion.div variants={container} initial="hidden" animate="show">
                            {filteredActive.map((m: any, i: number) => (
                                <motion.div
                                    key={m.id}
                                    variants={item}
                                    className={`flex items-center justify-between px-5 py-3.5 hover:bg-neutral-50/60 transition-colors group ${
                                        i < filteredActive.length - 1 ? 'border-b border-neutral-100' : ''
                                    }`}
                                >
                                    <Link
                                        href={`/seller/manage/${orgId}/member/${m.Seller?.id}`}
                                        className="flex items-center gap-3.5 flex-1 min-w-0"
                                    >
                                        <MemberAvatar name={m.Seller?.name || m.Seller?.email || '?'} />
                                        <div>
                                            <p className="text-[14px] font-medium text-neutral-900">{m.Seller?.name || 'Unknown'}</p>
                                            <p className="text-[12px] text-neutral-400">{m.Seller?.email}</p>
                                        </div>
                                    </Link>
                                    <button
                                        onClick={() => handleRemove(m.id)}
                                        disabled={actionLoading === m.id}
                                        className="p-2 text-neutral-200 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-[0.95]"
                                        title="Remove member"
                                    >
                                        {actionLoading === m.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-neutral-300" />
                                        ) : (
                                            <UserMinus className="w-4 h-4" />
                                        )}
                                    </button>
                                </motion.div>
                            ))}
                        </motion.div>
                        {searchQuery && filteredActive.length === 0 && (
                            <div className="px-5 py-10 text-center">
                                <p className="text-[14px] text-neutral-400">No members match &ldquo;{searchQuery}&rdquo;</p>
                            </div>
                        )}
                    </div>
                )}
            </motion.div>

            {/* ── Removed Members ── */}
            {removedMembers.length > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <button
                        onClick={() => setShowRemoved(!showRemoved)}
                        className="flex items-center gap-2 text-xs text-neutral-400 hover:text-neutral-500 transition-colors mb-3"
                    >
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showRemoved ? 'rotate-180' : ''}`} />
                        <span className="font-medium uppercase tracking-wider">
                            Removed
                        </span>
                        <span className="text-[10px] font-medium text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded-full">
                            {removedMembers.length}
                        </span>
                    </button>
                    <AnimatePresence>
                        {showRemoved && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <div className="space-y-1.5">
                                    {removedMembers.map((m: any) => (
                                        <div
                                            key={m.id}
                                            className="flex items-center gap-3.5 px-4 py-3 rounded-xl opacity-40"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center">
                                                <span className="text-xs font-medium text-neutral-400">
                                                    {(m.Seller?.name || m.Seller?.email || '?').charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-[14px] text-neutral-500">{m.Seller?.name || m.Seller?.email}</p>
                                                {m.Seller?.email && m.Seller?.name && (
                                                    <p className="text-[12px] text-neutral-300">{m.Seller?.email}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </div>
    )
}
