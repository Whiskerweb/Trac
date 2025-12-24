'use client'

import { useEffect, useState } from 'react'
import { X, Copy, Check, ExternalLink, Edit2, Trash2, Share2 } from 'lucide-react'
import QRCodeSVG from 'react-qr-code'

interface LinkDrawerProps {
    isOpen: boolean
    onClose: () => void
    link: {
        id: string
        slug: string
        original_url: string
        clicks: number
        created_at: string
    }
    onDelete?: () => void
}

export function LinkDrawer({ isOpen, onClose, link, onDelete }: LinkDrawerProps) {
    const [copied, setCopied] = useState(false)
    const shortUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${link.slug}`

    // Lock body scroll when drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }

        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    // Close on ESC key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose()
            }
        }

        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [isOpen, onClose])

    const handleCopy = async () => {
        await navigator.clipboard.writeText(shortUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this link?')) return

        if (onDelete) {
            await onDelete()
        }
        onClose()
    }

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={`
                    fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50
                    transform transition-transform duration-300 ease-out overflow-y-auto
                    ${isOpen ? 'translate-x-0' : 'translate-x-full'}
                `}
            >
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Link Details</h2>
                        <p className="text-sm text-gray-500 mt-1 font-mono">/{link.slug}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Share Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Share2 className="w-4 h-4 text-gray-500" />
                            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                Share
                            </h3>
                        </div>

                        {/* Short URL Display */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <label className="text-xs text-gray-500 font-medium mb-2 block">
                                Short URL
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={shortUrl}
                                    readOnly
                                    className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    onClick={handleCopy}
                                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" />
                                            Copy
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Destination URL */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <label className="text-xs text-gray-500 font-medium mb-2 block">
                                Destination URL
                            </label>
                            <a
                                href={link.original_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 break-all"
                            >
                                {link.original_url}
                                <ExternalLink className="w-4 h-4 flex-shrink-0" />
                            </a>
                        </div>

                        {/* QR Code */}
                        <div className="bg-gray-50 rounded-lg p-6 flex flex-col items-center">
                            <label className="text-xs text-gray-500 font-medium mb-4 self-start">
                                QR Code
                            </label>
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                                <QRCodeSVG
                                    value={shortUrl}
                                    size={200}
                                    level="H"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-3 text-center">
                                Scan to open this link
                            </p>
                        </div>
                    </div>

                    {/* Stats Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                            Statistics
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                                <p className="text-xs text-blue-600 font-medium mb-1">Total Clicks</p>
                                <p className="text-2xl font-bold text-blue-900">{link.clicks}</p>
                            </div>
                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                                <p className="text-xs text-purple-600 font-medium mb-1">Created</p>
                                <p className="text-sm font-semibold text-purple-900">
                                    {new Date(link.created_at).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Social Preview Section (Mock) */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                            Social Media Preview
                        </h3>
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            {/* Mock OG Image */}
                            <div className="bg-gradient-to-br from-gray-100 to-gray-200 h-48 flex items-center justify-center">
                                <div className="text-center">
                                    <Share2 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500">Preview Image</p>
                                </div>
                            </div>
                            {/* Mock OG Text */}
                            <div className="p-4 bg-white">
                                <p className="text-sm font-semibold text-gray-900 mb-1">
                                    {link.slug} • Short Link
                                </p>
                                <p className="text-xs text-gray-500">
                                    Quick access to {link.original_url.substring(0, 50)}...
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
                    <button
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2 font-medium"
                    >
                        <Edit2 className="w-4 h-4" />
                        Edit
                    </button>
                    <button
                        onClick={handleDelete}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete
                    </button>
                </div>
            </div>
        </>
    )
}
