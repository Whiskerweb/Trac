'use client'

import { useState, useEffect } from 'react'
import {
    Inbox,
    CheckCircle2,
    XCircle,
    Loader2,
    User,
    MessageSquare,
    Clock
} from 'lucide-react'
import {
    getMyProgramRequests,
    approveProgramRequest,
    rejectProgramRequest
} from '@/app/actions/marketplace-actions'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ProgramRequest {
    id: string
    partner_email: string
    partner_name: string | null
    mission_title: string
    message: string | null
    created_at: Date
}

function RequestCard({
    request,
    onApprove,
    onReject,
    isProcessing
}: {
    request: ProgramRequest
    onApprove: () => void
    onReject: () => void
    isProcessing: boolean
}) {
    const partnerDisplay = request.partner_name || request.partner_email.split('@')[0]

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 transition-colors">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">{partnerDisplay}</h3>
                        <p className="text-sm text-gray-500">{request.partner_email}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDistanceToNow(new Date(request.created_at), {
                        addSuffix: true,
                        locale: fr
                    })}
                </div>
            </div>

            {/* Mission */}
            <div className="mb-4">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Mission</span>
                <p className="text-sm font-medium text-gray-900 mt-1">{request.mission_title}</p>
            </div>

            {/* Message */}
            {request.message && (
                <div className="mb-4 bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Message du partenaire
                    </div>
                    <p className="text-sm text-gray-700">{request.message}</p>
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <button
                    onClick={onApprove}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                    {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <>
                            <CheckCircle2 className="w-4 h-4" />
                            Approuver
                        </>
                    )}
                </button>
                <button
                    onClick={onReject}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-red-600 text-sm font-medium rounded-lg border border-gray-200 hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-50"
                >
                    <XCircle className="w-4 h-4" />
                    Refuser
                </button>
            </div>
        </div>
    )
}

export default function PartnerRequestsPage() {
    const [requests, setRequests] = useState<ProgramRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const loadRequests = async () => {
        setLoading(true)
        try {
            const result = await getMyProgramRequests()
            if (result.success && 'requests' in result && result.requests) {
                setRequests(result.requests as ProgramRequest[])
            } else {
                setError(('error' in result && result.error) || 'Erreur lors du chargement')
            }
        } catch (err) {
            setError('Erreur inattendue')
        }
        setLoading(false)
    }

    useEffect(() => {
        loadRequests()
    }, [])

    const handleApprove = async (requestId: string) => {
        setProcessingId(requestId)
        const result = await approveProgramRequest(requestId)
        if (result.success) {
            setRequests(prev => prev.filter(r => r.id !== requestId))
        }
        setProcessingId(null)
    }

    const handleReject = async (requestId: string) => {
        setProcessingId(requestId)
        const result = await rejectProgramRequest(requestId)
        if (result.success) {
            setRequests(prev => prev.filter(r => r.id !== requestId))
        }
        setProcessingId(null)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                {error}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-black tracking-tight">Demandes d'accès</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Gérez les demandes de partenaires pour vos missions privées.
                </p>
            </div>

            {/* Requests Grid */}
            {requests.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Inbox className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Aucune demande en attente
                    </h3>
                    <p className="text-gray-500 text-sm max-w-md mx-auto">
                        Les demandes d'accès aux missions privées apparaîtront ici lorsque des partenaires postuleront.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {requests.map((request) => (
                        <RequestCard
                            key={request.id}
                            request={request}
                            onApprove={() => handleApprove(request.id)}
                            onReject={() => handleReject(request.id)}
                            isProcessing={processingId === request.id}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
