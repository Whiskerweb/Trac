'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Globe, Plus, RefreshCw, Trash2, ExternalLink, Copy, Check,
    Loader2, AlertCircle, X, Info, AlertTriangle
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

interface VerificationRecord {
    type: string
    domain: string
    value: string
    reason: string
}

// =============================================
// COMPONENTS
// =============================================

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <button
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors flex-shrink-0"
            title="Copier"
        >
            {copied ? (
                <Check className="w-4 h-4 text-green-500" />
            ) : (
                <Copy className="w-4 h-4 text-gray-400" />
            )}
        </button>
    )
}

function StatusDot({ status }: { status: 'verified' | 'pending' | 'verifying' }) {
    const styles = {
        verified: 'bg-green-500',
        pending: 'bg-amber-400',
        verifying: 'bg-blue-500 animate-pulse',
    }

    const labels = {
        verified: 'Verified',
        pending: 'Pending DNS',
        verifying: 'Verifying...',
    }

    return (
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${styles[status]}`} />
            <span className="text-sm text-gray-600 font-medium">{labels[status]}</span>
        </div>
    )
}

function DNSRecordRow({ type, name, value }: { type: string; name: string; value: string }) {
    return (
        <tr className="border-b border-gray-100 last:border-0">
            <td className="py-3 px-4">
                <code className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{type}</code>
            </td>
            <td className="py-3 px-4 font-mono text-sm text-gray-700">{name}</td>
            <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                    <code className="font-mono text-sm text-gray-900 bg-gray-50 px-2 py-1 rounded border border-gray-200 truncate max-w-[300px]">
                        {value}
                    </code>
                    <CopyButton text={value} />
                </div>
            </td>
        </tr>
    )
}

function DomainRow({
    domain,
    onVerify,
    onDelete,
    isVerifying,
    isDeleting,
    expanded,
    onToggleExpand,
    verificationRecords
}: {
    domain: DomainData
    onVerify: () => void
    onDelete: () => void
    isVerifying: boolean
    isDeleting: boolean
    expanded: boolean
    onToggleExpand: () => void
    verificationRecords: VerificationRecord[]
}) {
    const isSubdomain = domain.name.split('.').length > 2
    const recordName = isSubdomain ? domain.name.split('.')[0] : '@'

    // Find TXT record from verification records
    const txtRecord = verificationRecords.find(r => r.type === 'TXT')

    return (
        <div className="group border-b border-gray-100 last:border-0 bg-white hover:bg-gray-50/30 transition-colors">
            {/* Main Row */}
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0">
                        <Globe className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="font-semibold text-gray-900">{domain.name}</span>
                            <StatusDot status={isVerifying ? 'verifying' : domain.verified ? 'verified' : 'pending'} />
                        </div>
                        {domain.verified && domain.verifiedAt && (
                            <p className="text-xs text-gray-500 mt-0.5">
                                Verified on {new Date(domain.verifiedAt).toLocaleDateString()}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {!domain.verified && (
                        <>
                            <button
                                onClick={onToggleExpand}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 hover:bg-blue-50 rounded-md transition-colors"
                            >
                                {expanded ? 'Hide' : 'Configure'}
                            </button>
                            <button
                                onClick={onVerify}
                                disabled={isVerifying}
                                className="text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-1.5 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-2"
                            >
                                {isVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                Verify
                            </button>
                        </>
                    )}
                    <button
                        onClick={onDelete}
                        disabled={isDeleting}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Expanded DNS Instructions */}
            {expanded && !domain.verified && (
                <div className="px-4 md:px-14 pb-6 pt-0">
                    {/* Warning Block */}
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 mb-4">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-semibold text-amber-900">Important: DNS Ownership Transfer</h4>
                            <p className="text-sm text-amber-800 mt-1">
                                Adding these DNS records will transfer routing authority to Traaaction for this domain/subdomain.
                                SSL certificates will be automatically provisioned by Vercel once records propagate.
                            </p>
                        </div>
                    </div>

                    {/* DNS Records Table */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-900">Required DNS Records</h4>
                            <p className="text-xs text-gray-500 mt-0.5">Add both records to your DNS provider</p>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr className="text-xs uppercase text-gray-500 font-medium">
                                    <th className="px-4 py-2 w-20">Type</th>
                                    <th className="px-4 py-2 w-32">Name</th>
                                    <th className="px-4 py-2">Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* CNAME Record */}
                                <DNSRecordRow
                                    type="CNAME"
                                    name={recordName}
                                    value={CNAME_TARGET}
                                />
                                {/* TXT Record (if available) */}
                                {txtRecord && (
                                    <DNSRecordRow
                                        type="TXT"
                                        name={txtRecord.domain.replace(`.${domain.name}`, '') || '_vercel'}
                                        value={txtRecord.value}
                                    />
                                )}
                            </tbody>
                        </table>
                    </div>

                    <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5">
                        <Info className="w-3 h-3" />
                        DNS propagation can take 1-60 minutes. Click "Verify" to check status.
                    </p>
                </div>
            )}
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
    const [expanded, setExpanded] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [verificationRecords, setVerificationRecords] = useState<Record<string, VerificationRecord[]>>({})

    // Modal state
    const [newDomainName, setNewDomainName] = useState('')
    const [adding, setAdding] = useState(false)

    // Load domains
    const loadDomains = useCallback(async () => {
        setLoading(true)
        const result = await getDomains()
        if (result.success && result.domains) {
            setDomains(result.domains)
        } else {
            setError(result.error || 'Failed to load domains')
        }
        setLoading(false)
    }, [])

    useEffect(() => {
        loadDomains()
    }, [loadDomains])

    const handleAddDomain = async (e: React.FormEvent) => {
        e.preventDefault()
        setAdding(true)
        try {
            const result = await addDomain(newDomainName)
            if (result.success && result.domain) {
                setNewDomainName('')
                setIsModalOpen(false)
                setExpanded(result.domain.id)
                await loadDomains()
                // Trigger verification to get TXT records
                handleVerify(result.domain.id)
            } else {
                throw new Error(result.error)
            }
        } catch (err: any) {
            alert(err.message)
        }
        setAdding(false)
    }

    const handleVerify = async (id: string) => {
        setVerifyingId(id)
        const result = await verifyDomain(id)

        // Store verification records
        if (result.verification && result.verification.length > 0) {
            setVerificationRecords(prev => ({
                ...prev,
                [id]: result.verification!
            }))
        }

        await loadDomains()
        setVerifyingId(null)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure? This will break any links using this domain.')) return
        setDeletingId(id)
        await removeDomain(id)
        await loadDomains()
        setDeletingId(null)
    }

    return (
        <div className="w-full max-w-6xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Custom Domains</h1>
                    <p className="text-gray-500 mt-1">
                        Configure branded domains for your tracking links.
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-md font-medium text-sm transition-all shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Add Domain
                </button>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mb-2" />
                    <p className="text-sm">Loading domains...</p>
                </div>
            ) : domains.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-16 text-center shadow-sm">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                        <Globe className="w-6 h-6 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No custom domains
                    </h3>
                    <p className="text-gray-500 mb-6 max-w-md mx-auto">
                        Add a custom domain (e.g. <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">link.yoursite.com</code>) to brand your short links and bypass ad-blockers.
                    </p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-md font-medium text-sm transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add Domain
                    </button>
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="divide-y divide-gray-100">
                        {domains.map((domain) => (
                            <DomainRow
                                key={domain.id}
                                domain={domain}
                                onVerify={() => handleVerify(domain.id)}
                                onDelete={() => handleDelete(domain.id)}
                                isVerifying={verifyingId === domain.id}
                                isDeleting={deletingId === domain.id}
                                expanded={expanded === domain.id}
                                onToggleExpand={() => {
                                    setExpanded(expanded === domain.id ? null : domain.id)
                                    // Load verification records when expanding
                                    if (!verificationRecords[domain.id]) {
                                        handleVerify(domain.id)
                                    }
                                }}
                                verificationRecords={verificationRecords[domain.id] || []}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Add Domain Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-200 overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900">Add Custom Domain</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddDomain} className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Domain Name
                                </label>
                                <input
                                    type="text"
                                    value={newDomainName}
                                    onChange={(e) => setNewDomainName(e.target.value)}
                                    placeholder="link.yoursite.com"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black outline-none text-sm"
                                    autoFocus
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1.5">
                                    We recommend using a subdomain like <b>link</b> or <b>go</b> for tracking links.
                                </p>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newDomainName.trim() || adding}
                                    className="px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-md text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                                >
                                    {adding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    Add Domain
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
