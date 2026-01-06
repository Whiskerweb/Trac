'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Globe, Plus, RefreshCw, Trash2, ExternalLink, Copy, Check,
    Loader2, CheckCircle2, Clock, AlertCircle, X, Info
} from 'lucide-react'
import Link from 'next/link'
import { getDomains, addDomain, verifyDomain, removeDomain } from '@/app/actions/domains'
import { CNAME_TARGET } from '@/lib/config/constants'

// =============================================
// TYPES
// =============================================

interface DomainData {
    id: string
    name: string
    verified: boolean
    createdAt: Date
    verifiedAt: Date | null
}

// =============================================
// COPY BUTTON COMPONENT
// =============================================

function CopyButton({ text, className = '' }: { text: string; className?: string }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <button
            onClick={handleCopy}
            className={`p-2 rounded-lg hover:bg-slate-100 transition-all ${className}`}
            title="Copier"
        >
            {copied ? (
                <Check className="w-4 h-4 text-green-500" />
            ) : (
                <Copy className="w-4 h-4 text-slate-400" />
            )}
        </button>
    )
}

// =============================================
// STATUS BADGE COMPONENT
// =============================================

function StatusBadge({ verified, verifying }: { verified: boolean; verifying?: boolean }) {
    if (verifying) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                <Loader2 className="w-3 h-3 animate-spin" />
                Vérification...
            </span>
        )
    }

    if (verified) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="w-3 h-3" />
                Vérifié
            </span>
        )
    }

    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
            <Clock className="w-3 h-3" />
            En attente
        </span>
    )
}

// =============================================
// DNS INSTRUCTIONS CARD
// =============================================

function DNSInstructionsCard({ domainName }: { domainName: string }) {
    const isSubdomain = domainName.split('.').length > 2
    const recordName = isSubdomain ? domainName.split('.')[0] : '@'

    return (
        <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-start gap-3 mb-4">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-medium text-slate-900">Configuration DNS requise</h4>
                    <p className="text-sm text-slate-600 mt-1">
                        Ajoutez un enregistrement CNAME dans les paramètres DNS de votre domaine.
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                            <th className="text-left py-2 px-4 font-medium text-slate-600">Type</th>
                            <th className="text-left py-2 px-4 font-medium text-slate-600">Nom</th>
                            <th className="text-left py-2 px-4 font-medium text-slate-600">Valeur</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="py-3 px-4">
                                <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">CNAME</code>
                            </td>
                            <td className="py-3 px-4">
                                <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">{recordName}</code>
                            </td>
                            <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                    <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">{CNAME_TARGET}</code>
                                    <CopyButton text={CNAME_TARGET} />
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                La propagation DNS peut prendre 5 à 60 minutes.
            </p>
        </div>
    )
}

// =============================================
// DOMAIN CARD COMPONENT
// =============================================

function DomainCard({
    domain,
    onVerify,
    onDelete,
    isVerifying,
    isDeleting,
    showDNS,
    onToggleDNS,
}: {
    domain: DomainData
    onVerify: () => void
    onDelete: () => void
    isVerifying: boolean
    isDeleting: boolean
    showDNS: boolean
    onToggleDNS: () => void
}) {
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-100 rounded-lg">
                        <Globe className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900">{domain.name}</h3>
                            <a
                                href={`https://${domain.name}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Ajouté le {new Date(domain.createdAt).toLocaleDateString('fr-FR')}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <StatusBadge verified={domain.verified} verifying={isVerifying} />

                    {!domain.verified && (
                        <button
                            onClick={onVerify}
                            disabled={isVerifying}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${isVerifying ? 'animate-spin' : ''}`} />
                            Vérifier
                        </button>
                    )}

                    <button
                        onClick={onDelete}
                        disabled={isDeleting}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isDeleting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Trash2 className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </div>

            {/* DNS Toggle */}
            {!domain.verified && (
                <button
                    onClick={onToggleDNS}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                    {showDNS ? 'Masquer les instructions DNS' : 'Voir les instructions DNS'}
                </button>
            )}

            {/* DNS Instructions */}
            {showDNS && !domain.verified && (
                <DNSInstructionsCard domainName={domain.name} />
            )}

            {/* Verified info */}
            {domain.verified && domain.verifiedAt && (
                <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                    Vérifié le {new Date(domain.verifiedAt).toLocaleDateString('fr-FR')}
                </div>
            )}
        </div>
    )
}

// =============================================
// ADD DOMAIN MODAL
// =============================================

function AddDomainModal({
    isOpen,
    onClose,
    onAdd,
}: {
    isOpen: boolean
    onClose: () => void
    onAdd: (domain: string) => Promise<void>
}) {
    const [domainName, setDomainName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        try {
            await onAdd(domainName)
            setDomainName('')
            onClose()
        } catch (err: any) {
            setError(err.message || 'Une erreur est survenue')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-900">Ajouter un domaine</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Nom de domaine
                        </label>
                        <input
                            type="text"
                            value={domainName}
                            onChange={(e) => setDomainName(e.target.value)}
                            placeholder="track.votresite.com"
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            disabled={loading}
                            autoFocus
                        />
                        <p className="mt-2 text-sm text-slate-500">
                            Entrez un domaine (ex: track.startup.com) ou sous-domaine personnalisé.
                        </p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
                            disabled={loading}
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !domainName.trim()}
                            className="flex-1 px-4 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Ajout...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    Ajouter
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

export default function DomainsPage() {
    const [domains, setDomains] = useState<DomainData[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [verifyingId, setVerifyingId] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [expandedDNS, setExpandedDNS] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Load domains on mount
    const loadDomains = useCallback(async () => {
        setLoading(true)
        const result = await getDomains()
        if (result.success && result.domains) {
            setDomains(result.domains)
        } else {
            setError(result.error || 'Erreur lors du chargement')
        }
        setLoading(false)
    }, [])

    useEffect(() => {
        loadDomains()
    }, [loadDomains])

    // Add domain handler
    const handleAddDomain = async (domainName: string) => {
        const result = await addDomain(domainName)
        if (!result.success) {
            throw new Error(result.error)
        }
        // Expand DNS instructions for new domain
        if (result.domain) {
            setExpandedDNS(result.domain.id)
        }
        await loadDomains()
    }

    // Verify domain handler
    const handleVerify = async (domainId: string) => {
        setVerifyingId(domainId)
        const result = await verifyDomain(domainId)
        if (result.success) {
            await loadDomains()
        }
        setVerifyingId(null)
    }

    // Delete domain handler
    const handleDelete = async (domainId: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce domaine ?')) return

        setDeletingId(domainId)
        const result = await removeDomain(domainId)
        if (result.success) {
            await loadDomains()
        }
        setDeletingId(null)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex items-center gap-3 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Chargement...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-5xl mx-auto px-6 py-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                                    <Globe className="w-6 h-6 text-white" />
                                </div>
                                <h1 className="text-3xl font-bold text-slate-900">Domaines</h1>
                            </div>
                            <p className="text-slate-600">
                                Configurez des domaines personnalisés pour vos liens de tracking avec CNAME Cloaking.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link
                                href="/dashboard"
                                className="px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                ← Retour
                            </Link>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-all shadow-lg shadow-slate-900/10"
                            >
                                <Plus className="w-5 h-5" />
                                Ajouter un domaine
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-6 py-8">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-red-700">{error}</p>
                    </div>
                )}

                {domains.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Globe className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">
                            Aucun domaine configuré
                        </h3>
                        <p className="text-slate-600 mb-6 max-w-md mx-auto">
                            Ajoutez un domaine personnalisé pour utiliser vos propres URLs de tracking
                            et améliorer la confiance des utilisateurs.
                        </p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            Ajouter votre premier domaine
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {domains.map((domain) => (
                            <DomainCard
                                key={domain.id}
                                domain={domain}
                                onVerify={() => handleVerify(domain.id)}
                                onDelete={() => handleDelete(domain.id)}
                                isVerifying={verifyingId === domain.id}
                                isDeleting={deletingId === domain.id}
                                showDNS={expandedDNS === domain.id}
                                onToggleDNS={() => setExpandedDNS(
                                    expandedDNS === domain.id ? null : domain.id
                                )}
                            />
                        ))}
                    </div>
                )}

                {/* Info Card */}
                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-5">
                    <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-semibold text-blue-900">Comment ça marche ?</h4>
                            <p className="text-sm text-blue-800 mt-1">
                                Le CNAME Cloaking permet d&apos;utiliser votre propre domaine (ex: <code className="bg-blue-100 px-1 rounded">track.votresite.com</code>)
                                pour les liens de tracking. Cela améliore la confiance des utilisateurs et réduit les risques de blocage par les adblockers.
                            </p>
                            <ul className="text-sm text-blue-700 mt-3 space-y-1">
                                <li>• SSL automatique via Vercel</li>
                                <li>• Aucune maintenance requise</li>
                                <li>• Compatible avec tous les navigateurs</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Domain Modal */}
            <AddDomainModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAdd={handleAddDomain}
            />
        </div>
    )
}
