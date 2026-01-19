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
    deleteMission,
    addMissionContent // New import
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
    visibility?: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY'
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
                        {/* Visibility Badge */}
                        <div className={`px-2 py-0.5 rounded text-[10px] font-medium border ${mission.visibility === 'PUBLIC' ? 'bg-green-50 text-green-700 border-green-200' :
                            mission.visibility === 'PRIVATE' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-purple-50 text-purple-700 border-purple-200'
                            }`}>
                            {mission.visibility || 'PUBLIC'}
                        </div>
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

// =============================================
// CREATE MISSION WIZARD
// =============================================

type WizardStep = 'DETAILS' | 'VISIBILITY' | 'RESOURCES'

function CreateMissionModal({
    isOpen,
    onClose,
    onSuccess
}: {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}) {
    const [step, setStep] = useState<WizardStep>('DETAILS')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [createdMissionId, setCreatedMissionId] = useState<string | null>(null)

    // Form Data
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        target_url: '',
        reward: '',
        industry: '',
        gain_type: '',
        visibility: 'PUBLIC' as 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY'
    })

    // Resource State
    const [resources, setResources] = useState<Array<{
        type: 'YOUTUBE' | 'PDF' | 'LINK' | 'TEXT',
        title: string,
        url: string
    }>>([])
    const [newResource, setNewResource] = useState({ type: 'YOUTUBE', title: '', url: '' })

    // Reset on close
    useEffect(() => {
        if (!isOpen) {
            setStep('DETAILS')
            setFormData({
                title: '',
                description: '',
                target_url: '',
                reward: '',
                industry: '',
                gain_type: '',
                visibility: 'PUBLIC'
            })
            setCreatedMissionId(null)
            setResources([])
            setError(null)
        }
    }, [isOpen])

    if (!isOpen) return null

    // HANDLERS

    async function handleCreateMission() {
        setLoading(true)
        setError(null)

        const result = await createMission({
            ...formData,
            industry: formData.industry || undefined,
            gain_type: formData.gain_type || undefined
        })

        if (result.success && result.mission) {
            setCreatedMissionId(result.mission.id)
            setStep('RESOURCES')
            onSuccess() // Refresh list in background
        } else {
            setError(result.error || 'Failed to create mission')
        }

        setLoading(false)
    }

    async function handleAddResource() {
        if (!createdMissionId) return
        if (!newResource.title || !newResource.url) return

        setLoading(true)
        const result = await addMissionContent({
            missionId: createdMissionId,
            type: newResource.type as any,
            title: newResource.title,
            url: newResource.url,
            order: resources.length
        })

        if (result.success) {
            setResources([...resources, { ...newResource } as any])
            setNewResource({ ...newResource, title: '', url: '' }) // Keep type
        } else {
            setError(result.error || 'Failed to add resource')
        }
        setLoading(false)
    }

    // STEPS RENDERERS

    const renderDetailsStep = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mission Title</label>
                <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Brand Ambassador Q3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black outline-none text-sm"
                    autoFocus
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Target URL</label>
                    <div className="relative">
                        <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="url"
                            value={formData.target_url}
                            onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                            placeholder="https://site.com"
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black outline-none text-sm"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Reward</label>
                    <div className="relative">
                        <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={formData.reward}
                            onChange={(e) => setFormData({ ...formData, reward: e.target.value })}
                            placeholder="e.g. 20%"
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black outline-none text-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Industry</label>
                    <select
                        value={formData.industry}
                        onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black outline-none text-sm bg-white"
                    >
                        <option value="">Select Industry...</option>
                        <option value="SaaS">SaaS</option>
                        <option value="E-commerce">E-commerce</option>
                        <option value="Finance">Finance</option>
                        <option value="Health">Health</option>
                        <option value="Education">Education</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Gain Type</label>
                    <select
                        value={formData.gain_type}
                        onChange={(e) => setFormData({ ...formData, gain_type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black outline-none text-sm bg-white"
                    >
                        <option value="">Select Type...</option>
                        <option value="Net Revenue">Net Revenue</option>
                        <option value="ROI">ROI</option>
                        <option value="Fixed">Fixed</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the mission requirements..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black outline-none text-sm resize-none"
                />
            </div>
        </div>
    )

    const renderVisibilityStep = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <p className="text-sm text-gray-600 mb-4">
                Control who can see and join your affiliate program.
            </p>

            <div className="space-y-3">
                <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${formData.visibility === 'PUBLIC' ? 'border-black bg-gray-50 ring-1 ring-black' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input
                        type="radio"
                        name="visibility"
                        value="PUBLIC"
                        checked={formData.visibility === 'PUBLIC'}
                        onChange={() => setFormData({ ...formData, visibility: 'PUBLIC' })}
                        className="mt-1"
                    />
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            {/* Note: Icons need to be imported or replaced if missing */}
                            <span className="font-semibold text-gray-900">Public Marketplace</span>
                            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded font-medium">Recommended</span>
                        </div>
                        <p className="text-sm text-gray-500">Visible to all partners in the marketplace. Anyone can join immediately.</p>
                    </div>
                </label>

                <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${formData.visibility === 'PRIVATE' ? 'border-black bg-gray-50 ring-1 ring-black' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input
                        type="radio"
                        name="visibility"
                        value="PRIVATE"
                        checked={formData.visibility === 'PRIVATE'}
                        onChange={() => setFormData({ ...formData, visibility: 'PRIVATE' })}
                        className="mt-1"
                    />
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">Private (Application)</span>
                        </div>
                        <p className="text-sm text-gray-500">Listed in marketplace, but partners must apply. You approve/reject requests.</p>
                    </div>
                </label>

                <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${formData.visibility === 'INVITE_ONLY' ? 'border-black bg-gray-50 ring-1 ring-black' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input
                        type="radio"
                        name="visibility"
                        value="INVITE_ONLY"
                        checked={formData.visibility === 'INVITE_ONLY'}
                        onChange={() => setFormData({ ...formData, visibility: 'INVITE_ONLY' })}
                        className="mt-1"
                    />
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">Invite Only</span>
                        </div>
                        <p className="text-sm text-gray-500">Hidden from marketplace. Only partners you effectively invite can join.</p>
                    </div>
                </label>
            </div>
        </div>
    )

    const renderResourcesStep = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-sm text-green-800">
                <CheckCircle2 className="w-4 h-4" />
                Mission created successfully! You can now add resources.
            </div>

            <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900">Add Resource</h4>
                <div className="flex gap-2">
                    <select
                        value={newResource.type}
                        onChange={(e) => setNewResource({ ...newResource, type: e.target.value as any })}
                        className="w-[120px] px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                    >
                        <option value="YOUTUBE">YouTube</option>
                        <option value="PDF">PDF URL</option>
                        <option value="LINK">Link</option>
                    </select>
                    <input
                        type="text"
                        value={newResource.title}
                        onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                        placeholder="Resource Title"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-black outline-none"
                    />
                </div>
                <div className="flex gap-2">
                    <input
                        type="url"
                        value={newResource.url}
                        onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                        placeholder="URL (e.g. YouTube link or PDF address)"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-black outline-none"
                    />
                    <button
                        onClick={handleAddResource}
                        disabled={loading || !newResource.title || !newResource.url}
                        className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                    </button>
                </div>
            </div>

            {/* List */}
            {resources.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900">Added Resources</h4>
                    {resources.map((r, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-gray-500" />
                                <span className="font-medium text-gray-900">{r.title}</span>
                                <span className="text-xs text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">{r.type}</span>
                            </div>
                            <a href={r.url} target="_blank" className="text-gray-400 hover:text-gray-600">
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )

    return (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">
                            {step === 'RESOURCES' ? 'Add Resources' : 'Create Mission'}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <div className={`h-1.5 w-12 rounded-full transition-colors ${step === 'DETAILS' ? 'bg-black' : 'bg-black'}`} />
                            <div className={`h-1.5 w-12 rounded-full transition-colors ${step === 'VISIBILITY' ? 'bg-black' : (step === 'RESOURCES' ? 'bg-black' : 'bg-gray-200')}`} />
                            <div className={`h-1.5 w-12 rounded-full transition-colors ${step === 'RESOURCES' ? 'bg-black' : 'bg-gray-200'}`} />
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    {step === 'DETAILS' && renderDetailsStep()}
                    {step === 'VISIBILITY' && renderVisibilityStep()}
                    {step === 'RESOURCES' && renderResourcesStep()}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                    {step === 'DETAILS' ? (
                        <>
                            <button onClick={onClose} className="text-sm font-medium text-gray-600 hover:text-gray-900">Cancel</button>
                            <button
                                onClick={() => setStep('VISIBILITY')}
                                disabled={!formData.title || !formData.target_url || !formData.reward}
                                className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                            >
                                Next Step
                            </button>
                        </>
                    ) : step === 'VISIBILITY' ? (
                        <>
                            <button onClick={() => setStep('DETAILS')} className="text-sm font-medium text-gray-600 hover:text-gray-900">Back</button>
                            <button
                                onClick={handleCreateMission}
                                disabled={loading}
                                className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Mission'}
                            </button>
                        </>
                    ) : (
                        <>
                            {/* RESOURCES Step */}
                            <span className="text-xs text-gray-500">Resources are optional</span>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800"
                            >
                                Finish
                            </button>
                        </>
                    )}
                </div>
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
                <Link
                    href="/dashboard/missions/create"
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-md font-medium text-sm transition-all shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    New Mission
                </Link>
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
                    <Link
                        href="/dashboard/missions/create"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-md font-medium text-sm transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Create Mission
                    </Link>
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
