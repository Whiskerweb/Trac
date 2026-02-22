'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fadeInUp, staggerContainer, staggerItem, springGentle, floatVariants } from '@/lib/animations'
import { Loader2, Target, Search, Trash2, Users, ChevronRight, AlertTriangle, X } from 'lucide-react'
import { adminGetAllMissions, adminDeleteMission } from '@/app/actions/admin'
import { TraaactionLoader } from '@/components/ui/TraaactionLoader'

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        ACTIVE: 'bg-emerald-500/20 text-emerald-400',
        ARCHIVED: 'bg-neutral-500/20 text-neutral-400',
        DRAFT: 'bg-blue-500/20 text-blue-400',
        PAUSED: 'bg-amber-500/20 text-amber-400',
    }
    return (
        <span className={`badge-pop px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-neutral-500/20 text-neutral-400'}`}>
            {status}
        </span>
    )
}

function ConfirmDeleteModal({
    open,
    onClose,
    onConfirm,
    title,
    loading,
}: {
    open: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
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
                                    <h2 className="text-[15px] font-semibold text-white">Delete Mission</h2>
                                    <p className="text-xs text-neutral-400">This action is irreversible</p>
                                </div>
                            </div>
                            <p className="text-sm text-neutral-300 mb-6">
                                Are you sure you want to permanently delete <span className="font-semibold text-white">{title}</span>?
                                This will remove all enrollments, content, and links associated with this mission.
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

export default function AdminMissionsPage() {
    const [loading, setLoading] = useState(true)
    const [missions, setMissions] = useState<any[]>([])
    const [filter, setFilter] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)
    const [deleting, setDeleting] = useState(false)

    const loadData = useCallback(async () => {
        setLoading(true)
        const result = await adminGetAllMissions(filter)
        if (result.success) {
            setMissions(result.missions || [])
        }
        setLoading(false)
    }, [filter])

    useEffect(() => { loadData() }, [loadData])

    const handleDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        const result = await adminDeleteMission(deleteTarget.id)
        setDeleting(false)
        if (result.success) {
            setDeleteTarget(null)
            loadData()
        } else {
            alert(result.error || 'Failed to delete mission')
        }
    }

    const filtered = missions.filter(m => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return (
            m.title?.toLowerCase().includes(q) ||
            m.company_name?.toLowerCase().includes(q) ||
            m.Workspace?.name?.toLowerCase().includes(q)
        )
    })

    return (
        <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="p-6 md:p-8 space-y-6">
            <motion.div variants={fadeInUp} transition={springGentle}>
                <h1 className="text-2xl font-bold text-white">Missions</h1>
                <p className="text-gray-400 mt-1">Browse and manage all missions across workspaces</p>
            </motion.div>

            {/* Filters */}
            <motion.div variants={fadeInUp} transition={springGentle} className="flex flex-col sm:flex-row gap-3">
                <div className="flex gap-2">
                    {(['all', 'ACTIVE', 'ARCHIVED', 'DRAFT'] as const).map(f => (
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
                </div>
                <div className="relative flex-1 sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search missions..."
                        className="w-full pl-9 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/20"
                    />
                </div>
            </motion.div>

            {/* Count */}
            <motion.div variants={fadeInUp} transition={springGentle}>
                <p className="text-xs text-neutral-500">{filtered.length} mission{filtered.length !== 1 ? 's' : ''}</p>
            </motion.div>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <TraaactionLoader size={24} className="text-gray-400" />
                </div>
            ) : filtered.length === 0 ? (
                <motion.div variants={fadeInUp} transition={springGentle} className="flex flex-col items-center justify-center min-h-[300px] text-center">
                    <motion.div variants={floatVariants} animate="float">
                        <Target className="w-10 h-10 text-gray-600 mb-3" />
                    </motion.div>
                    <p className="text-gray-400">No missions found</p>
                </motion.div>
            ) : (
                <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
                    {filtered.map(mission => (
                        <motion.div
                            key={mission.id}
                            variants={staggerItem}
                            transition={springGentle}
                            className="row-hover bg-white/5 border border-white/10 rounded-xl p-4"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    {mission.logo_url ? (
                                        <img src={mission.logo_url} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" alt="" />
                                    ) : (
                                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <Target className="w-5 h-5 text-gray-400" />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-medium text-white truncate">{mission.title}</p>
                                            <StatusBadge status={mission.status} />
                                        </div>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {mission.company_name || mission.Workspace?.name || 'Unknown workspace'}
                                            {' · '}
                                            {mission._count?.MissionEnrollment || 0} enrollments
                                            {mission._count?.OrganizationMissions > 0 && ` · ${mission._count.OrganizationMissions} org deals`}
                                            {mission._count?.GroupMissions > 0 && ` · ${mission._count.GroupMissions} groups`}
                                        </p>
                                        <p className="text-[10px] text-neutral-600 mt-0.5 font-mono">{mission.id.slice(0, 16)}...</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {mission.reward && (
                                        <span className="text-xs text-emerald-400 font-medium hidden sm:inline">{mission.reward}</span>
                                    )}
                                    <button
                                        onClick={() => setDeleteTarget({ id: mission.id, title: mission.title })}
                                        className="btn-press p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                                        title="Delete mission"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmDeleteModal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title={deleteTarget?.title || ''}
                loading={deleting}
            />
        </motion.div>
    )
}
