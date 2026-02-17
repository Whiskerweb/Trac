'use client'

import { useState } from 'react'
import { Copy, Check, ExternalLink, MousePointerClick } from 'lucide-react'
import Link from 'next/link'
import { portalPath } from './portal-utils'

interface PortalEnrollmentCardProps {
    workspaceSlug: string
    missionId: string
    missionTitle: string
    missionDescription: string
    linkUrl: string | null
    clicks: number
    primaryColor: string
}

export default function PortalEnrollmentCard({
    workspaceSlug,
    missionId,
    missionTitle,
    missionDescription,
    linkUrl,
    clicks,
    primaryColor,
}: PortalEnrollmentCardProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
        if (!linkUrl) return
        navigator.clipboard.writeText(linkUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 transition-all">
            <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1 mr-3">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{missionTitle}</h3>
                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{missionDescription}</p>
                </div>
                <Link
                    href={portalPath(workspaceSlug, `/dashboard/missions/${missionId}`)}
                    className="flex items-center gap-1 text-xs font-medium flex-shrink-0 transition-colors"
                    style={{ color: primaryColor }}
                >
                    <ExternalLink className="w-3 h-3" />
                </Link>
            </div>

            {linkUrl && (
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <code className="text-[11px] text-gray-600 truncate flex-1">{linkUrl}</code>
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors"
                        style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}
                    >
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>
                </div>
            )}

            <div className="flex items-center gap-3 mt-2.5">
                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                    <MousePointerClick className="w-3 h-3" />
                    {clicks}
                </span>
            </div>
        </div>
    )
}
