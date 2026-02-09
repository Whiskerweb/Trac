'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, Check, Copy, Globe, Lock, KeyRound, Link as LinkIcon } from 'lucide-react'
import { useOrg } from '../layout'
import { updateOrganizationSettings } from '@/app/actions/organization-actions'

const VISIBILITY_OPTIONS = [
    { value: 'PUBLIC', label: 'Public', description: 'Listed in browse, anyone can join', icon: Globe, color: 'text-green-600 border-green-200 bg-green-50' },
    { value: 'PRIVATE', label: 'Private', description: 'Listed in browse, approval needed', icon: Lock, color: 'text-amber-600 border-amber-200 bg-amber-50' },
    { value: 'INVITE_ONLY', label: 'Invite Only', description: 'Hidden, invite code only', icon: KeyRound, color: 'text-purple-600 border-purple-200 bg-purple-50' },
] as const

export default function ManageOrgSettings() {
    const { org, reload } = useOrg()
    const params = useParams()
    const orgId = params.orgId as string

    const [name, setName] = useState(org?.name || '')
    const [description, setDescription] = useState(org?.description || '')
    const [visibility, setVisibility] = useState(org?.visibility || 'PUBLIC')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [copiedInvite, setCopiedInvite] = useState(false)
    const [copiedShare, setCopiedShare] = useState(false)

    if (!org) return null

    const handleSave = async () => {
        setSaving(true)
        const result = await updateOrganizationSettings(orgId, {
            name: name.trim(),
            description: description.trim(),
            visibility: visibility as any,
        })
        if (result.success) {
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
            await reload()
        }
        setSaving(false)
    }

    const copyInviteCode = () => {
        if (org.invite_code) {
            navigator.clipboard.writeText(`${window.location.origin}/org/join/${org.invite_code}`)
            setCopiedInvite(true)
            setTimeout(() => setCopiedInvite(false), 2000)
        }
    }

    const copyShareLink = () => {
        if (org.slug) {
            navigator.clipboard.writeText(`${window.location.origin}/org/${org.slug}`)
            setCopiedShare(true)
            setTimeout(() => setCopiedShare(false), 2000)
        }
    }

    return (
        <div className="space-y-8 max-w-2xl">
            {/* Name & Description */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-5">
                <h2 className="text-sm font-semibold text-gray-900">General</h2>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Organization Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300 resize-none"
                    />
                </div>
            </div>

            {/* Visibility */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
                <h2 className="text-sm font-semibold text-gray-900">Visibility</h2>
                <div className="space-y-2">
                    {VISIBILITY_OPTIONS.map(option => {
                        const Icon = option.icon
                        const isSelected = visibility === option.value
                        return (
                            <button
                                key={option.value}
                                onClick={() => setVisibility(option.value)}
                                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl border text-left transition-all ${
                                    isSelected ? option.color : 'border-gray-100 hover:border-gray-200'
                                }`}
                            >
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isSelected ? '' : 'bg-gray-50'}`}>
                                    <Icon className={`w-4 h-4 ${isSelected ? '' : 'text-gray-400'}`} />
                                </div>
                                <div className="flex-1">
                                    <p className={`text-sm font-medium ${isSelected ? '' : 'text-gray-700'}`}>{option.label}</p>
                                    <p className="text-xs text-gray-400">{option.description}</p>
                                </div>
                                {isSelected && <Check className="w-4 h-4" />}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Links */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
                <h2 className="text-sm font-semibold text-gray-900">Share Links</h2>

                {/* Public share link */}
                {org.slug && (
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Public Page</label>
                        <div className="flex gap-2">
                            <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 truncate">
                                {typeof window !== 'undefined' ? `${window.location.origin}/org/${org.slug}` : `/org/${org.slug}`}
                            </div>
                            <button onClick={copyShareLink} className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                {copiedShare ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                            </button>
                        </div>
                    </div>
                )}

                {/* Invite code link */}
                {org.invite_code && (
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Invite Link (auto-join)</label>
                        <div className="flex gap-2">
                            <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 truncate">
                                {typeof window !== 'undefined' ? `${window.location.origin}/org/join/${org.invite_code}` : `/org/join/${org.invite_code}`}
                            </div>
                            <button onClick={copyInviteCode} className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                {copiedInvite ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Save */}
            <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
            >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
                {saved ? 'Saved!' : 'Save Changes'}
            </button>
        </div>
    )
}
