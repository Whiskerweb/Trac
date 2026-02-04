'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Globe, Plus, RefreshCw, Trash2, ExternalLink, Copy, Check,
    Loader2, AlertCircle, X, Info, AlertTriangle, ArrowRight, CheckCircle2
} from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { getDomains, addDomain, verifyDomain, removeDomain, updateDomain } from '@/app/actions/domains'
import { CNAME_TARGET } from '@/lib/config/constants'
import confetti from 'canvas-confetti'


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
    const t = useTranslations('dashboard.domains')
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
            title={t('copy')}
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
    const t = useTranslations('dashboard.domains')

    const styles = {
        verified: 'bg-green-500',
        pending: 'bg-amber-400',
        verifying: 'bg-blue-500 animate-pulse',
    }

    const labels = {
        verified: t('verified'),
        pending: t('pending'),
        verifying: t('verifying'),
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
            <td className="py-3 px-2 sm:px-4">
                <code className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{type}</code>
            </td>
            <td className="py-3 px-2 sm:px-4 font-mono text-xs sm:text-sm text-gray-700 break-all">{name}</td>
            <td className="py-3 px-2 sm:px-4">
                <div className="flex items-center gap-2">
                    <code className="font-mono text-xs sm:text-sm text-gray-900 bg-gray-50 px-2 py-1 rounded border border-gray-200 truncate max-w-[150px] sm:max-w-[300px]">
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
    verificationRecords,

    onEdit,
    isConfirmingDelete,
    onCancelDelete
}: {
    domain: DomainData
    onVerify: (force?: boolean) => void
    onDelete: () => void
    isVerifying: boolean
    isDeleting: boolean
    expanded: boolean
    onToggleExpand: () => void
    verificationRecords: VerificationRecord[]
    onEdit: () => void
    isConfirmingDelete: boolean
    onCancelDelete: () => void
}) {
    const t = useTranslations('dashboard.domains')

    const isSubdomain = domain.name.split('.').length > 2
    const recordName = isSubdomain ? domain.name.split('.')[0] : '@'

    // Find TXT record from verification records
    const txtRecord = verificationRecords.find(r => r.type === 'TXT')

    return (
        <div className={`group border-b border-gray-100 last:border-0 transition-all ${domain.verified ? 'bg-white' : 'bg-gray-50/30'}`}>
            {/* Main Row */}
            <div className="p-4 sm:p-6">
                {/* Top section: Domain info + delete button */}
                <div className="flex items-start justify-between gap-3 mb-3 sm:mb-0">
                    <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg border flex items-center justify-center flex-shrink-0 transition-colors ${domain.verified ? 'bg-green-50 border-green-200 text-green-600' : 'bg-white border-gray-200 text-gray-400'}`}>
                            {domain.verified ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Globe className="w-4 h-4 sm:w-5 sm:h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                <span
                                    onClick={onEdit}
                                    className={`font-semibold text-sm sm:text-base cursor-pointer hover:underline decoration-dotted underline-offset-4 break-all ${domain.verified ? 'text-gray-900' : 'text-gray-700'}`}
                                    title={t('clickToEdit')}
                                >
                                    {domain.name}
                                </span>
                                <StatusDot status={isVerifying ? 'verifying' : domain.verified ? 'verified' : 'pending'} />
                            </div>
                            {domain.verified && domain.verifiedAt ? (
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {t('verifiedOn')} {new Date(domain.verifiedAt).toLocaleDateString()}
                                </p>
                            ) : (
                                <p className="text-xs text-amber-600 mt-0.5 font-medium">
                                    {t('actionRequired')}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Delete button - always visible on top right */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {isConfirmingDelete ? (
                            <>
                                <span className="text-xs text-red-600 font-bold hidden sm:inline animate-in fade-in">{t('sure')}</span>
                                <button
                                    onClick={onCancelDelete}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                    title={t('cancel')}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={onDelete}
                                    className="p-2 text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors shadow-sm"
                                    title={t('confirmDelete')}
                                >
                                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={onDelete}
                                disabled={isDeleting}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title={t('deleteDomain')}
                            >
                                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                        )}
                    </div>
                </div>

                {/* Bottom section: Action buttons (mobile: full width, desktop: inline) */}
                {!domain.verified && (
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-3 sm:mt-4">
                        <button
                            onClick={onToggleExpand}
                            className="w-full sm:w-auto text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-2 sm:py-1.5 hover:bg-gray-100 rounded-md transition-colors text-center sm:text-left"
                        >
                            {expanded ? t('hideInstructions') : t('configureDNS')}
                        </button>
                        <button
                            onClick={() => onVerify(true)}
                            disabled={isVerifying}
                            className="w-full sm:w-auto text-sm text-white bg-black hover:bg-gray-800 disabled:opacity-50 disabled:hover:bg-black font-medium px-4 py-2 sm:py-1.5 rounded-md transition-all flex items-center justify-center gap-2 shadow-sm"
                        >
                            {isVerifying ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    {t('checking')}
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    {t('verifyNow')}
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Confirmation text on mobile */}
                {isConfirmingDelete && (
                    <p className="text-xs text-red-600 font-bold mt-2 sm:hidden animate-in fade-in">{t('sure')}</p>
                )}
            </div>

            {/* Expanded DNS Instructions (Step-by-Step) */}
            {expanded && !domain.verified && (
                <div className="px-4 sm:px-6 md:px-14 pb-6 sm:pb-8 pt-2 animate-in slide-in-from-top-2 duration-200">
                    <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm space-y-6 sm:space-y-8">

                        {/* Step 1 */}
                        <div className="flex gap-3 sm:gap-4">
                            <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-xs sm:text-sm text-gray-600">1</div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm sm:text-base text-gray-900">{t('step1.title')}</h4>
                                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                    {t('step1.description')}
                                </p>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="flex gap-3 sm:gap-4">
                            <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-xs sm:text-sm text-gray-600">2</div>
                            <div className="w-full flex-1 min-w-0">
                                <h4 className="font-semibold text-sm sm:text-base text-gray-900">{t('step2.title')}</h4>
                                <p className="text-xs sm:text-sm text-gray-500 mt-1 mb-3">
                                    {t('step2.description')}
                                </p>
                                <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-x-auto">
                                    <table className="w-full text-left min-w-[500px]">
                                        <thead className="bg-gray-100/50 border-b border-gray-200">
                                            <tr className="text-xs uppercase text-gray-500 font-medium">
                                                <th className="px-2 sm:px-4 py-2 w-20 sm:w-24">{t('table.type')}</th>
                                                <th className="px-2 sm:px-4 py-2 w-28 sm:w-32">{t('table.name')}</th>
                                                <th className="px-2 sm:px-4 py-2">{t('table.value')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <DNSRecordRow type="CNAME" name={recordName} value={CNAME_TARGET} />
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Step 3 (Only if TXT needed) */}
                        {txtRecord && (
                            <div className="flex gap-3 sm:gap-4">
                                <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-xs sm:text-sm text-gray-600">3</div>
                                <div className="w-full flex-1 min-w-0">
                                    <h4 className="font-semibold text-sm sm:text-base text-gray-900">{t('step3.title')}</h4>
                                    <p className="text-xs sm:text-sm text-gray-500 mt-1 mb-3">
                                        {t('step3.description')}
                                    </p>
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-x-auto">
                                        <table className="w-full text-left min-w-[500px]">
                                            <thead className="bg-gray-100/50 border-b border-gray-200">
                                                <tr className="text-xs uppercase text-gray-500 font-medium">
                                                    <th className="px-2 sm:px-4 py-2 w-20 sm:w-24">{t('table.type')}</th>
                                                    <th className="px-2 sm:px-4 py-2 w-28 sm:w-32">{t('table.name')}</th>
                                                    <th className="px-2 sm:px-4 py-2">{t('table.value')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <DNSRecordRow
                                                    type="TXT"
                                                    name={txtRecord.domain.replace(`.${domain.name}`, '') || '_vercel'}
                                                    value={txtRecord.value}
                                                />
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Warning */}
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 flex gap-2 sm:gap-3 text-xs sm:text-sm text-amber-800">
                            <Info className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-amber-600" />
                            <p>
                                {t('dnsWarning')}
                                <br />
                                <strong>{t('clickVerify')}</strong>
                            </p>
                        </div>

                    </div>
                </div>
            )}
        </div>
    )
}

// =============================================
// MAIN PAGE COMPONENT
// =============================================

export default function DomainsPage() {
    const t = useTranslations('dashboard.domains')
    const [domains, setDomains] = useState<DomainData[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [verifyingId, setVerifyingId] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null) // Inline confirm state
    const [editingId, setEditingId] = useState<string | null>(null) // New state for editing
    const [expanded, setExpanded] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [verificationRecords, setVerificationRecords] = useState<Record<string, VerificationRecord[]>>({})

    // Modal state
    const [newDomainName, setNewDomainName] = useState('')
    const [adding, setAdding] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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
            let result;
            if (editingId) {
                // UPDATE existing domain
                result = await updateDomain(editingId, newDomainName)
            } else {
                // ADD new domain
                result = await addDomain(newDomainName)
            }

            if (result.success && result.domain) {
                setNewDomainName('')
                setIsModalOpen(false)
                setEditingId(null)
                setExpanded(result.domain.id)
                await loadDomains()
                // Trigger verification to get TXT records (only if not verified)
                if (!result.domain.verified) {
                    handleVerify(result.domain.id)
                }
            } else {
                throw new Error(result.error)
            }
        } catch (err: any) {
            alert(err.message)
        }
        setAdding(false)
    }

    const openEditModal = (domain: DomainData) => {
        setNewDomainName(domain.name)
        setEditingId(domain.id)
        setShowDeleteConfirm(false)
        setIsModalOpen(true)
    }

    const openAddModal = () => {
        setNewDomainName('')
        setEditingId(null)
        setIsModalOpen(true)
    }

    const handleVerify = async (id: string, force: boolean = false) => {
        setVerifyingId(id)

        // If force (Live Validator), we skip cache
        const result = await verifyDomain(id, force)

        // Store verification records
        if (result.verification && result.verification.length > 0) {
            setVerificationRecords(prev => ({
                ...prev,
                [id]: result.verification!
            }))
        }

        if (result.success && result.verified) {
            // 🎊 Success!
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#000000', '#22C55E', '#FFD700']
            })
            setExpanded(null)
        }

        await loadDomains()
        setVerifyingId(null)
    }

    const handleDelete = async (id: string) => {
        // If inline confirmation is not yet active for this ID, activate it
        if (confirmDeleteId !== id) {
            setConfirmDeleteId(id)
            return
        }

        // If we are here, it means we confirmed
        setDeletingId(id)
        await removeDomain(id)
        await loadDomains()
        setDeletingId(null)
        setConfirmDeleteId(null)
    }

    const cancelDelete = () => {
        setConfirmDeleteId(null)
    }

    return (
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">{t('title')}</h1>
                    <p className="text-sm sm:text-base text-gray-500 mt-1">
                        {t('subtitle')}
                    </p>
                </div>
                {/* Only show Add button if NO custom domains exist */}
                {domains.length === 0 && (
                    <button
                        onClick={openAddModal}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-md font-medium text-sm transition-all shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        {t('addDomain')}
                    </button>
                )}
            </div>

            {/* Error Banner */}
            {error && (
                <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg flex items-start sm:items-center gap-2 sm:gap-3 text-sm sm:text-base text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1">{error}</span>
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mb-2" />
                    <p className="text-sm">{t('loading')}</p>
                </div>
            ) : domains.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-8 sm:p-16 text-center shadow-sm">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                        <Globe className="w-6 h-6 text-gray-400" />
                    </div>
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                        {t('noDomains')}
                    </h3>
                    <p className="text-sm sm:text-base text-gray-500 mb-6 max-w-md mx-auto px-4">
                        {t('addFirst')} <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs sm:text-sm whitespace-nowrap">link.yoursite.com</code>{t('bypassAdBlockers')}
                    </p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-md font-medium text-sm transition-colors shadow-sm w-full sm:w-auto"
                    >
                        <Plus className="w-4 h-4" />
                        {t('addDomain')}
                    </button>
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="divide-y divide-gray-100">
                        {domains.map((domain) => (
                            <DomainRow
                                key={domain.id}
                                domain={domain}
                                onVerify={(force) => handleVerify(domain.id, force)}
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
                                onEdit={() => openEditModal(domain)}
                                isConfirmingDelete={confirmDeleteId === domain.id}
                                onCancelDelete={() => setConfirmDeleteId(null)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Add Domain Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-200 overflow-hidden">
                        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-base sm:text-lg font-bold text-gray-900">{editingId ? t('editDomain') : t('addDomain')}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddDomain} className="p-4 sm:p-6">
                            <div className="mb-4 sm:mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    {t('modal.domainName')}
                                </label>
                                <input
                                    type="text"
                                    value={newDomainName}
                                    onChange={(e) => setNewDomainName(e.target.value)}
                                    placeholder={t('modal.placeholder')}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black outline-none text-sm"
                                    autoFocus
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1.5">
                                    {t('modal.recommendation')} <b>link</b> {t('modal.or')} <b>go</b> {t('modal.forTracking')}
                                </p>
                            </div>

                            {/* Mobile layout: Stack vertically */}
                            <div className="flex flex-col gap-3 pt-2">
                                {/* Delete Button - Full width on mobile */}
                                {editingId && !showDeleteConfirm && (
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteConfirm(true)}
                                        disabled={adding || !!deletingId}
                                        className="w-full sm:w-auto px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors order-2 sm:order-1"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        {t('modal.delete')}
                                    </button>
                                )}

                                {/* Actions - Stack on mobile, inline on desktop */}
                                {showDeleteConfirm ? (
                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 order-1 sm:order-2">
                                        <span className="text-sm text-gray-500 text-center sm:self-center sm:mr-2">{t('modal.areYouSure')}</span>
                                        <div className="flex gap-2 sm:gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setShowDeleteConfirm(false)}
                                                className="flex-1 sm:flex-none px-3 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
                                            >
                                                {t('modal.cancel')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    setDeletingId(editingId)
                                                    try {
                                                        await removeDomain(editingId!)
                                                        setIsModalOpen(false)
                                                        setEditingId(null)
                                                        await loadDomains()
                                                    } catch (e) {
                                                        alert(t('modal.failedToDelete'))
                                                    }
                                                    setDeletingId(null)
                                                }}
                                                className="flex-1 sm:flex-none px-3 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                                            >
                                                {deletingId === editingId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                {t('modal.confirmDelete')}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-2 sm:gap-3 order-1 sm:order-2 sm:justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            className="flex-1 sm:flex-none px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
                                        >
                                            {t('modal.cancel')}
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!newDomainName.trim() || adding || !!deletingId}
                                            className="flex-1 sm:flex-none px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-md text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {adding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                            {editingId ? t('modal.update') : t('modal.add')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
