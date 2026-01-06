'use client'

import { useState, useEffect } from 'react'
import {
    Plus, X, Loader2, Target, Percent, Link2,
    Users, Calendar, MoreHorizontal, Archive, Trash2,
    ExternalLink, CheckCircle2, FileText, AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { DNSGatekeeper } from '@/components/dashboard/DNSGatekeeper'
import {
    createMission,
    getWorkspaceMissions,
    updateMissionStatus,
    deleteMission
} from '@/app/actions/missions'

interface Mission {
    id: string
    title: string
    description: string
    target_url: string
    reward: string
    status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
    created_at: Date
    _count: { enrollments: number }
}

// =============================================
// MISSION LIST ITEM COMPONENT
// =============================================

function MissionListItem({
    mission,
    onRefresh
}: {
    mission: Mission
    onRefresh: () => void
}) {
    const [menuOpen, setMenuOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // Status Indicator Dot
    const StatusDot = ({ status }: { status: string }) => {
        const colors = {
            ACTIVE: 'bg-green-500',
            DRAFT: 'bg-gray-300',
            ARCHIVED: 'bg-amber-500',
        }
        return (
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-300'}`} />
                <span className="text-sm text-gray-600 capitalize font-medium">{status.toLowerCase()}</span>
            </div>
        )
    }

    async function handleArchive() {
        setLoading(true)
        await updateMissionStatus(mission.id, 'ARCHIVED')
        setMenuOpen(false)
        onRefresh()
        setLoading(false)
    }

    async function handleDelete() {
        if (!confirm('Are you sure you want to delete this mission?')) return
        setLoading(true)
        await deleteMission(mission.id)
        onRefresh()
    }

    return (
        <div className="group bg-white hover:bg-gray-50/50 border-b border-gray-100 last:border-0 transition-colors p-4 flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Icon */}
                <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0">
                    <Target className="w-5 h-5 text-gray-500" />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                        <Link href={`/dashboard/missions/${mission.id}`} className="block">
                            <h3 className="text-sm font-semibold text-gray-900 truncate hover:underline underline-offset-2">
                                {mission.title}
                            </h3>
                        </Link>
                        <StatusDot status={mission.status} />
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                        <a
                            href={mission.target_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 truncate max-w-[200px]"
                        >
                            <ExternalLink className="w-3 h-3" />
                            {new URL(mission.target_url).hostname}
                        </a>
                        <span className="text-gray-300 text-xs">|</span>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Users className="w-3 h-3" />
                            <span>{mission._count.enrollments} affiliates</span>
                        </div>
                        <span className="text-gray-300 text-xs">|</span>
                        <div className="flex items-center gap-1 text-xs font-medium text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded">
                            {mission.reward}
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="relative ml-4">
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="p-2 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <MoreHorizontal className="w-4 h-4" />
                </button>

                {menuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 animate-in fade-in zoom-in-95 duration-200">
                        <button
                            onClick={handleArchive}
                            disabled={loading}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                            <Archive className="w-4 h-4" />
                            Archive
                        </button>
                        <div className="h-px bg-gray-100 my-1" />
                        <button
                            onClick={handleDelete}
                            disabled={loading}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>
                    </div>
                )}

                {/* Backdrop to close menu */}
                {menuOpen && (
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                )}
            </div>
        </div>
    )
}

// =============================================
// CREATE MISSION MODAL
// =============================================

function CreateMissionModal({
    isOpen,
    onClose,
    onSuccess
}: {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        target_url: '',
        reward: '',
    })

    if (!isOpen) return null

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const result = await createMission(formData)

        if (result.success) {
            setFormData({ title: '', description: '', target_url: '', reward: '' })
            onSuccess()
            onClose()
        } else {
            setError(result.error || 'Failed to create mission')
        }

        setLoading(false)
    }

    return (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">
                        Create Mission
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Mission Title
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g. Brand Ambassador Q3"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black outline-none text-sm"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Target URL
                            </label>
                            <div className="relative">
                                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="url"
                                    value={formData.target_url}
                                    onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                                    placeholder="https://your-site.com"
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black outline-none text-sm"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Reward Structure
                            </label>
                            <div className="relative">
                                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={formData.reward}
                                    onChange={(e) => setFormData({ ...formData, reward: e.target.value })}
                                    placeholder="e.g. 20% commission"
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black outline-none text-sm"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Describe the mission and requirements..."
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black outline-none text-sm resize-none"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-md text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-md text-sm font-medium transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    Create Mission
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// =============================================
// MAIN PAGE COMPONENT
// =============================================

// =============================================
// MISSIONS CONTENT (Renamed from default export)
// =============================================

function MissionsContent() {
    const [missions, setMissions] = useState<Mission[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)

    async function loadMissions() {
        const result = await getWorkspaceMissions()
        if (result.success && result.missions) {
            setMissions(result.missions as Mission[])
        }
        setLoading(false)
    }

    useEffect(() => {
        loadMissions()
    }, [])

    return (
        <div className="w-full max-w-6xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Missions</h1>
                    <p className="text-gray-500 mt-1">
                        Create and manage affiliate offers for your workspace.
                    </p>
                </div>
                <button
                    onClick={() => setModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-md font-medium text-sm transition-all shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    New Mission
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20 text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mb-2" />
                    <p className="text-sm">Loading missions...</p>
                </div>
            ) : missions.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                        <Target className="w-6 h-6 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No missions created
                    </h3>
                    <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                        Create your first mission to start recruiting affiliates for your product.
                    </p>
                    <button
                        onClick={() => setModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-md font-medium text-sm transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Create Mission
                    </button>
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="divide-y divide-gray-100">
                        {missions.map((mission) => (
                            <MissionListItem
                                key={mission.id}
                                mission={mission}
                                onRefresh={loadMissions}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Modal */}
            <CreateMissionModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSuccess={loadMissions}
            />
        </div>
    )
}

export default function MissionsPage() {
    return (
        <DNSGatekeeper>
            <MissionsContent />
        </DNSGatekeeper>
    )
}
