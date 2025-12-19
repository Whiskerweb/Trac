'use client'

import { useState, useEffect } from 'react'
import {
    Plus, X, Loader2, Target, Percent, Link2,
    Users, Calendar, MoreVertical, Archive, Trash2,
    ExternalLink, CheckCircle2, Clock, FileText
} from 'lucide-react'
import Link from 'next/link'
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
// MISSION CARD COMPONENT
// =============================================

function MissionCard({
    mission,
    onRefresh
}: {
    mission: Mission
    onRefresh: () => void
}) {
    const [menuOpen, setMenuOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const statusColors = {
        ACTIVE: 'bg-green-100 text-green-700',
        DRAFT: 'bg-slate-100 text-slate-600',
        ARCHIVED: 'bg-amber-100 text-amber-700',
    }

    const statusIcons = {
        ACTIVE: <CheckCircle2 className="w-3 h-3" />,
        DRAFT: <FileText className="w-3 h-3" />,
        ARCHIVED: <Archive className="w-3 h-3" />,
    }

    async function handleArchive() {
        setLoading(true)
        await updateMissionStatus(mission.id, 'ARCHIVED')
        setMenuOpen(false)
        onRefresh()
        setLoading(false)
    }

    async function handleDelete() {
        if (!confirm('Supprimer cette mission ?')) return
        setLoading(true)
        await deleteMission(mission.id)
        onRefresh()
    }

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                        <Target className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <Link href={`/dashboard/missions/${mission.id}`}>
                            <h3 className="font-semibold text-slate-900 hover:text-purple-600 transition-colors cursor-pointer">
                                {mission.title}
                            </h3>
                        </Link>
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${statusColors[mission.status]}`}>
                            {statusIcons[mission.status]}
                            {mission.status}
                        </div>
                    </div>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <MoreVertical className="w-4 h-4 text-slate-500" />
                    </button>

                    {menuOpen && (
                        <div className="absolute right-0 top-8 w-40 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-10">
                            <button
                                onClick={handleArchive}
                                disabled={loading}
                                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                                <Archive className="w-4 h-4" />
                                Archiver
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={loading}
                                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Supprimer
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                {mission.description || 'Aucune description'}
            </p>

            <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                <div className="flex items-center gap-1.5">
                    <Percent className="w-4 h-4" />
                    <span className="font-medium text-purple-600">{mission.reward}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    <span>{mission._count.enrollments} affiliés</span>
                </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <a
                    href={mission.target_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 truncate max-w-[200px]"
                >
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    {mission.target_url}
                </a>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(mission.created_at).toLocaleDateString('fr-FR')}
                </span>
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
            setError(result.error || 'Erreur lors de la création')
        }

        setLoading(false)
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900">
                        Nouvelle Mission
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Titre de la mission *
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Ex: Ambassadeur Campus"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            URL cible *
                        </label>
                        <div className="relative">
                            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="url"
                                value={formData.target_url}
                                onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                                placeholder="https://mon-saas.com"
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Récompense *
                        </label>
                        <div className="relative">
                            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={formData.reward}
                                onChange={(e) => setFormData({ ...formData, reward: e.target.value })}
                                placeholder="20% ou 5€ par vente"
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Décrivez la mission et les conditions..."
                            rows={3}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg transition-all flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Création...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    Créer la mission
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

export default function MissionsPage() {
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
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-6xl mx-auto px-6 py-12">
                {/* Back Link */}
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-8 transition-colors"
                >
                    ← Retour au Dashboard
                </Link>

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Missions</h1>
                        <p className="text-slate-500 mt-1">
                            Gérez vos offres d&apos;affiliation
                        </p>
                    </div>
                    <button
                        onClick={() => setModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-medium rounded-lg transition-all shadow-lg shadow-purple-500/25"
                    >
                        <Plus className="w-5 h-5" />
                        Nouvelle Mission
                    </button>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                    </div>
                ) : missions.length === 0 ? (
                    <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
                        <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Target className="w-8 h-8 text-purple-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">
                            Aucune mission
                        </h3>
                        <p className="text-slate-500 mb-6">
                            Créez votre première mission d&apos;affiliation pour recruter des ambassadeurs.
                        </p>
                        <button
                            onClick={() => setModalOpen(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Créer une mission
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {missions.map((mission) => (
                            <MissionCard
                                key={mission.id}
                                mission={mission}
                                onRefresh={loadMissions}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            <CreateMissionModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSuccess={loadMissions}
            />
        </div>
    )
}
