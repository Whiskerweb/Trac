'use client'

import { Mail } from 'lucide-react'

export default function InvitationsPage() {
    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            <div className="max-w-6xl mx-auto px-8 py-10">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                        Invitations
                    </h1>
                </div>

                {/* Empty State */}
                <div className="bg-white rounded-lg border border-gray-200 p-16">
                    <div className="text-center max-w-md mx-auto">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Mail className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-base font-semibold text-gray-900 mb-2">
                            No program invitations
                        </h3>
                        <p className="text-sm text-gray-600">
                            When a program sends you an invitation to join them, they will appear here.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
