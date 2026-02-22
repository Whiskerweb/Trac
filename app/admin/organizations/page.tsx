'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { fadeInUp, staggerContainer, staggerItem, springGentle, floatVariants } from '@/lib/animations'
import { Loader2, Building2, Users, Check, Ban, ChevronRight, RotateCcw, Globe, Lock, KeyRound, MessageSquare, Trash2, AlertTriangle, X } from 'lucide-react'
import { getAllOrgs, approveOrg, suspendOrg, reactivateOrg, rejectOrg, adminDeleteOrg } from '@/app/actions/admin-org-actions'

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        PENDING: 'bg-orange-50 text-orange-700 border-orange-200',
        ACTIVE: 'bg-green-50 text-green-700 border-green-200',
        SUSPENDED: 'bg-red-50 text-red-700 border-red-200',
    }
    return (
        <span className={`badge-pop px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
            {status}
        </span>
    )
}

function ConfirmDeleteModal({
    open,
    onClose,
    onConfirm,
    name,
    loading,
}: {
    open: boolean
    onClose: () => void
    onConfirm: () => void
    name: string
    loading: boolean
}) {
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => !loading && onClose()}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
                    >
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5 text-red-400" />
                                </div>
                                <div>
                                    <h2 className="text-[15px] font-semibold text-white">Delete Organization</h2>
                                    <p className="text-xs text-neutral-400">This action is irreversible</p>
                                </div>
                            </div>
                            <p className="text-sm text-neutral-300 mb-6">
                                Are you sure you want to permanently delete <span className="font-semibold text-white">{name}</span>?
                                This will remove all members and mission associations.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    disabled={loading}
                                    className="flex-1 h-11 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-sm font-medium text-neutral-300 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={onConfirm}
                                    disabled={loading}
                                    className="flex-1 h-11 bg-red-600 hover:bg-red-700 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Delete
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default function AdminOrganizationsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [organizations, setOrganizations] = useState<any[]>([])
    const [filter, setFilter] = useState<'all' | 'PENDING' | 'ACTIVE' | 'SUSPENDED'>('all')
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
    const [deleting, setDeleting] = useState(false)

    const loadData = useCallback(async () => {
        setLoading(true)
        const f = filter === 'all' ? undefined : filter
        const result = await getAllOrgs(f as any)
        if (result.success) {
            setOrganizations(result.organizations || [])
        }
        setLoading(false)
    }, [filter])

    useEffect(() => { loadData() }, [loadData])

    const handleApprove = async (orgId: string) => {
        await approveOrg(orgId)
        loadData()
    }

    const handleSuspend = async (orgId: string) => {
        await suspendOrg(orgId)
        loadData()
    }

    const handleReactivate = async (orgId: string) => {
        await reactivateOrg(orgId)
        loadData()
    }

    const handleReject = async (orgId: string) => {
        await rejectOrg(orgId)
        loadData()
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        const result = await adminDeleteOrg(deleteTarget.id)
        setDeleting(false)
        if (result.success) {
            setDeleteTarget(null)
            loadData()
        } else {
            alert(result.error || 'Failed to delete organization')
        }
    }

    return (
        <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-6">
            <motion.div variants={fadeInUp} transition={springGentle}>
                <h1 className="text-2xl font-bold text-white">Organizations</h1>
                <p className="text-gray-400 mt-1">Review and manage seller organizations</p>
            </motion.div>

            {/* Filter tabs */}
            <motion.div variants={fadeInUp} transition={springGentle} className="flex gap-2">
                {(['all', 'PENDING', 'ACTIVE', 'SUSPENDED'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`btn-press px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            filter === f ? 'bg-white text-black' : 'bg-white/10 text-gray-400 hover:text-white'
                        }`}
                    >
                        {f === 'all' ? 'All' : f}
                    </button>
                ))}
            </motion.div>

            {loading ? (
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="skeleton-shimmer h-20 rounded-xl" />
                    ))}
                </div>
            ) : organizations.length === 0 ? (
                <motion.div variants={fadeInUp} transition={springGentle} className="flex flex-col items-center justify-center min-h-[300px] text-center">
                    <motion.div variants={floatVariants} animate="float">
                        <Building2 className="w-10 h-10 text-gray-600 mb-3" />
                    </motion.div>
                    <p className="text-gray-400">No organizations found</p>
                </motion.div>
            ) : (
                <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
                    {organizations.map(org => (
                        <motion.div key={org.id} variants={staggerItem} transition={springGentle} className="row-hover bg-white/5 border border-white/10 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                        <Users className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-white">{org.name}</p>
                                            {org.visibility && (
                                                <span className={`badge-pop px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                                    org.visibility === 'PUBLIC' ? 'bg-green-500/20 text-green-400' :
                                                    org.visibility === 'PRIVATE' ? 'bg-amber-500/20 text-amber-400' :
                                                    'bg-purple-500/20 text-purple-400'
                                                }`}>
                                                    {org.visibility}
                                                </span>
                                            )}
                                            {org.slug && (
                                                <span className="text-[10px] text-gray-500">/org/{org.slug}</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400">
                                            Leader: {org.Leader?.name || org.Leader?.email} · {org._count?.Members || 0} members · {org._count?.Missions || 0} missions
                                            {org.estimated_audience && <> · Audience: {org.estimated_audience}</>}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={org.status} />

                                    {org.status === 'PENDING' && (
                                        <>
                                            <button
                                                onClick={() => handleApprove(org.id)}
                                                className="btn-press p-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30"
                                                title="Approve"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleReject(org.id)}
                                                className="btn-press p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                                                title="Reject"
                                            >
                                                <Ban className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                    {org.status === 'ACTIVE' && (
                                        <button
                                            onClick={() => handleSuspend(org.id)}
                                            className="btn-press p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                                            title="Suspend"
                                        >
                                            <Ban className="w-4 h-4" />
                                        </button>
                                    )}
                                    {org.status === 'SUSPENDED' && (
                                        <button
                                            onClick={() => handleReactivate(org.id)}
                                            className="btn-press p-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30"
                                            title="Reactivate"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                        </button>
                                    )}

                                    <button
                                        onClick={() => setDeleteTarget({ id: org.id, name: org.name })}
                                        className="btn-press p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                                        title="Delete organization"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>

                                    <button
                                        onClick={() => router.push(`/admin/organizations/${org.id}`)}
                                        className="btn-press p-1.5 text-gray-400 hover:text-white"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            {org.description && (
                                <p className="text-sm text-gray-500 mt-2 line-clamp-1">{org.description}</p>
                            )}
                            {/* Questionnaire fields (shown for PENDING) */}
                            {org.status === 'PENDING' && org.motivation && (
                                <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                                    <div className="flex items-start gap-2">
                                        <MessageSquare className="w-3.5 h-3.5 text-gray-500 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Motivation</p>
                                            <p className="text-xs text-gray-300 line-clamp-3">{org.motivation}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </motion.div>
            )}

            <ConfirmDeleteModal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                name={deleteTarget?.name || ''}
                loading={deleting}
            />
        </motion.div>
    )
}
