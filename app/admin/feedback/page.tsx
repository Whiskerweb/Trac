'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    MessageSquare,
    Filter,
    ChevronDown,
    ExternalLink,
    Paperclip,
    Mic,
    Clock,
    User,
    Globe,
    CheckCircle,
    Archive,
    Eye,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    X,
    Download,
    FileText,
    Image as ImageIcon,
    File
} from 'lucide-react'

interface Attachment {
    name: string
    type: string
    size: number
    url: string
}

interface Feedback {
    id: string
    user_id: string
    user_email: string | null
    user_name: string | null
    user_type: 'STARTUP' | 'SELLER'
    message: string
    attachments: Attachment[] | null
    voice_url: string | null
    page_url: string | null
    user_agent: string | null
    status: 'NEW' | 'REVIEWED' | 'RESOLVED' | 'ARCHIVED'
    admin_notes: string | null
    created_at: string
}

interface Pagination {
    page: number
    limit: number
    total: number
    totalPages: number
}

const statusColors = {
    NEW: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    REVIEWED: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    RESOLVED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    ARCHIVED: 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30',
}

const statusIcons = {
    NEW: MessageSquare,
    REVIEWED: Eye,
    RESOLVED: CheckCircle,
    ARCHIVED: Archive,
}

// Get icon for file type
function getFileIcon(type: string) {
    if (type.startsWith('image/')) return ImageIcon
    if (type.includes('pdf')) return FileText
    return File
}

// Format file size
function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function AdminFeedbackPage() {
    const [feedback, setFeedback] = useState<Feedback[]>([])
    const [pagination, setPagination] = useState<Pagination | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('')
    const [userTypeFilter, setUserTypeFilter] = useState<string>('')
    const [page, setPage] = useState(1)

    const fetchFeedback = async () => {
        setIsLoading(true)
        setError(null)

        try {
            const params = new URLSearchParams()
            if (statusFilter) params.set('status', statusFilter)
            if (userTypeFilter) params.set('userType', userTypeFilter)
            params.set('page', page.toString())
            params.set('limit', '20')

            const response = await fetch(`/api/feedback?${params}`)
            if (!response.ok) throw new Error('Failed to fetch feedback')

            const data = await response.json()
            setFeedback(data.feedback)
            setPagination(data.pagination)
        } catch (err) {
            console.error('Failed to fetch feedback:', err)
            setError('Failed to load feedback')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchFeedback()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter, userTypeFilter, page])

    const updateFeedbackStatus = async (feedbackId: string, newStatus: string) => {
        try {
            const response = await fetch(`/api/feedback/${feedbackId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            })

            if (response.ok) {
                setFeedback(prev =>
                    prev.map(f => f.id === feedbackId ? { ...f, status: newStatus as Feedback['status'] } : f)
                )
                if (selectedFeedback?.id === feedbackId) {
                    setSelectedFeedback(prev => prev ? { ...prev, status: newStatus as Feedback['status'] } : null)
                }
            }
        } catch (err) {
            console.error('Failed to update status:', err)
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        const diffDays = Math.floor(diffHours / 24)

        if (diffHours < 1) return 'Just now'
        if (diffHours < 24) return `${diffHours}h ago`
        if (diffDays < 7) return `${diffDays}d ago`
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    const parseBrowser = (userAgent: string | null) => {
        if (!userAgent) return 'Unknown'
        if (userAgent.includes('Chrome')) return 'Chrome'
        if (userAgent.includes('Firefox')) return 'Firefox'
        if (userAgent.includes('Safari')) return 'Safari'
        if (userAgent.includes('Edge')) return 'Edge'
        return 'Other'
    }

    // Open attachment (for now shows info, when real upload is implemented will open file)
    const openAttachment = (attachment: Attachment) => {
        // In production with real uploads, this would open the file URL
        // For MVP, show an alert with file info
        if (attachment.url.startsWith('pending_')) {
            alert(`File: ${attachment.name}\nType: ${attachment.type}\nSize: ${formatFileSize(attachment.size)}\n\nNote: File upload not yet implemented. This is file metadata only.`)
        } else {
            window.open(attachment.url, '_blank')
        }
    }

    return (
        <div className="min-h-screen bg-neutral-950 p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-semibold text-white">Feedback</h1>
                        <p className="text-sm text-neutral-500 mt-1">
                            {pagination?.total || 0} total submissions
                        </p>
                    </div>
                    <button
                        onClick={fetchFeedback}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-neutral-500">
                        <Filter className="w-4 h-4" />
                        Filters:
                    </div>

                    {/* Status filter */}
                    <div className="relative">
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                            className="appearance-none pl-3 pr-8 py-1.5 text-sm bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-lg hover:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                        >
                            <option value="">All Status</option>
                            <option value="NEW">New</option>
                            <option value="REVIEWED">Reviewed</option>
                            <option value="RESOLVED">Resolved</option>
                            <option value="ARCHIVED">Archived</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                    </div>

                    {/* User type filter */}
                    <div className="relative">
                        <select
                            value={userTypeFilter}
                            onChange={(e) => { setUserTypeFilter(e.target.value); setPage(1) }}
                            className="appearance-none pl-3 pr-8 py-1.5 text-sm bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-lg hover:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                        >
                            <option value="">All Users</option>
                            <option value="STARTUP">Startups</option>
                            <option value="SELLER">Sellers</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                    </div>

                    {(statusFilter || userTypeFilter) && (
                        <button
                            onClick={() => { setStatusFilter(''); setUserTypeFilter(''); setPage(1) }}
                            className="text-sm text-neutral-500 hover:text-neutral-300"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div>
                {error ? (
                    <div className="text-center py-12">
                        <p className="text-red-400">{error}</p>
                        <button
                            onClick={fetchFeedback}
                            className="mt-4 text-sm text-neutral-500 hover:text-white"
                        >
                            Try again
                        </button>
                    </div>
                ) : isLoading ? (
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="bg-neutral-900 rounded-xl p-5 animate-pulse border border-neutral-800">
                                <div className="h-4 bg-neutral-800 rounded w-1/4 mb-3" />
                                <div className="h-3 bg-neutral-800/50 rounded w-3/4" />
                            </div>
                        ))}
                    </div>
                ) : feedback.length === 0 ? (
                    <div className="text-center py-16">
                        <MessageSquare className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-1">No feedback yet</h3>
                        <p className="text-sm text-neutral-500">Feedback from users will appear here</p>
                    </div>
                ) : (
                    <>
                        {/* Feedback list */}
                        <div className="space-y-3">
                            {feedback.map((item) => {
                                const StatusIcon = statusIcons[item.status]
                                return (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={() => setSelectedFeedback(item)}
                                        className="bg-neutral-900 rounded-xl p-5 border border-neutral-800 hover:border-neutral-700 cursor-pointer transition-all"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                {/* Header */}
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full border ${statusColors[item.status]}`}>
                                                        <StatusIcon className="w-3 h-3" />
                                                        {item.status}
                                                    </span>
                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${item.user_type === 'STARTUP' ? 'bg-violet-500/20 text-violet-400 border-violet-500/30' : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'}`}>
                                                        {item.user_type}
                                                    </span>
                                                    <span className="text-xs text-neutral-500 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {formatDate(item.created_at)}
                                                    </span>
                                                </div>

                                                {/* User info */}
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                                                        {(item.user_name || item.user_email || '?')[0].toUpperCase()}
                                                    </div>
                                                    <span className="text-sm font-medium text-white">
                                                        {item.user_name || item.user_email?.split('@')[0] || 'Anonymous'}
                                                    </span>
                                                    {item.user_email && (
                                                        <span className="text-xs text-neutral-500">{item.user_email}</span>
                                                    )}
                                                </div>

                                                {/* Message preview */}
                                                <p className="text-sm text-neutral-400 line-clamp-2">
                                                    {item.message || '(No message - attachments only)'}
                                                </p>

                                                {/* Indicators */}
                                                <div className="flex items-center gap-3 mt-3">
                                                    {item.attachments && item.attachments.length > 0 && (
                                                        <span className="flex items-center gap-1 text-xs text-neutral-500">
                                                            <Paperclip className="w-3 h-3" />
                                                            {item.attachments.length} file{item.attachments.length > 1 ? 's' : ''}
                                                        </span>
                                                    )}
                                                    {item.voice_url && (
                                                        <span className="flex items-center gap-1 text-xs text-violet-400">
                                                            <Mic className="w-3 h-3" />
                                                            Voice
                                                        </span>
                                                    )}
                                                    {item.page_url && (
                                                        <span className="flex items-center gap-1 text-xs text-neutral-500">
                                                            <Globe className="w-3 h-3" />
                                                            {(() => {
                                                                try {
                                                                    return new URL(item.page_url).pathname
                                                                } catch {
                                                                    return item.page_url
                                                                }
                                                            })()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>

                        {/* Pagination */}
                        {pagination && pagination.totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-8">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 text-neutral-500 hover:text-white disabled:opacity-50"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-sm text-neutral-500">
                                    Page {page} of {pagination.totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                    disabled={page === pagination.totalPages}
                                    className="p-2 text-neutral-500 hover:text-white disabled:opacity-50"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Detail modal */}
            <AnimatePresence>
                {selectedFeedback && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedFeedback(null)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ opacity: 0, x: 100 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 100 }}
                            transition={{ type: 'spring', bounce: 0.1, duration: 0.4 }}
                            className="fixed right-0 top-0 bottom-0 w-[500px] max-w-full bg-neutral-900 border-l border-neutral-800 shadow-2xl z-50 overflow-y-auto"
                        >
                            <div className="p-6">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full border ${statusColors[selectedFeedback.status]}`}>
                                                {selectedFeedback.status}
                                            </span>
                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${selectedFeedback.user_type === 'STARTUP' ? 'bg-violet-500/20 text-violet-400 border-violet-500/30' : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'}`}>
                                                {selectedFeedback.user_type}
                                            </span>
                                        </div>
                                        <h2 className="text-lg font-semibold text-white">
                                            {selectedFeedback.user_name || selectedFeedback.user_email?.split('@')[0] || 'Anonymous'}
                                        </h2>
                                        {selectedFeedback.user_email && (
                                            <p className="text-sm text-neutral-500">{selectedFeedback.user_email}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setSelectedFeedback(null)}
                                        className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Message */}
                                <div className="mb-6">
                                    <h3 className="text-sm font-medium text-neutral-400 mb-2">Message</h3>
                                    <div className="p-4 bg-neutral-800/50 rounded-lg border border-neutral-800">
                                        <p className="text-sm text-neutral-300 whitespace-pre-wrap">
                                            {selectedFeedback.message || '(No message)'}
                                        </p>
                                    </div>
                                </div>

                                {/* Attachments */}
                                {selectedFeedback.attachments && selectedFeedback.attachments.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-sm font-medium text-neutral-400 mb-2">Attachments</h3>
                                        <div className="space-y-2">
                                            {selectedFeedback.attachments.map((att, i) => {
                                                const FileIcon = getFileIcon(att.type)
                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => openAttachment(att)}
                                                        className="w-full flex items-center gap-3 p-3 bg-neutral-800/50 rounded-lg border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800 transition-all text-left group"
                                                    >
                                                        <div className="w-10 h-10 bg-neutral-700 rounded-lg flex items-center justify-center">
                                                            <FileIcon className="w-5 h-5 text-neutral-400" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm text-neutral-200 truncate">{att.name}</p>
                                                            <p className="text-xs text-neutral-500">
                                                                {att.type.split('/')[1]?.toUpperCase() || 'FILE'} &bull; {formatFileSize(att.size)}
                                                            </p>
                                                        </div>
                                                        <Download className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Voice recording */}
                                {selectedFeedback.voice_url && (
                                    <div className="mb-6">
                                        <h3 className="text-sm font-medium text-neutral-400 mb-2">Voice Recording</h3>
                                        <div className="flex items-center gap-3 p-3 bg-violet-500/10 rounded-lg border border-violet-500/20">
                                            <div className="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center">
                                                <Mic className="w-5 h-5 text-violet-400" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm text-violet-300">Voice message attached</p>
                                                <p className="text-xs text-violet-400/60">Audio playback coming soon</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Context */}
                                <div className="mb-6">
                                    <h3 className="text-sm font-medium text-neutral-400 mb-2">Context</h3>
                                    <div className="space-y-2 p-3 bg-neutral-800/50 rounded-lg border border-neutral-800">
                                        {selectedFeedback.page_url && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <Globe className="w-4 h-4 text-neutral-500" />
                                                <span className="text-neutral-500">Page:</span>
                                                <a
                                                    href={selectedFeedback.page_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-violet-400 hover:text-violet-300 flex items-center gap-1"
                                                >
                                                    {(() => {
                                                        try {
                                                            return new URL(selectedFeedback.page_url).pathname
                                                        } catch {
                                                            return selectedFeedback.page_url
                                                        }
                                                    })()}
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 text-sm">
                                            <User className="w-4 h-4 text-neutral-500" />
                                            <span className="text-neutral-500">Browser:</span>
                                            <span className="text-neutral-300">{parseBrowser(selectedFeedback.user_agent)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Clock className="w-4 h-4 text-neutral-500" />
                                            <span className="text-neutral-500">Submitted:</span>
                                            <span className="text-neutral-300">
                                                {new Date(selectedFeedback.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Status actions */}
                                <div className="border-t border-neutral-800 pt-6">
                                    <h3 className="text-sm font-medium text-neutral-400 mb-3">Update Status</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {(['NEW', 'REVIEWED', 'RESOLVED', 'ARCHIVED'] as const).map((status) => {
                                            const Icon = statusIcons[status]
                                            const isActive = selectedFeedback.status === status
                                            return (
                                                <button
                                                    key={status}
                                                    onClick={() => updateFeedbackStatus(selectedFeedback.id, status)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors border ${
                                                        isActive
                                                            ? statusColors[status]
                                                            : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white hover:border-neutral-600'
                                                    }`}
                                                >
                                                    <Icon className="w-3.5 h-3.5" />
                                                    {status}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
