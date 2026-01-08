'use client'

import { MessageSquare } from 'lucide-react'

export default function MessagesPage() {
    return (
        <div className="min-h-screen bg-[#FAFAFA] flex">

            {/* Messages List (Left) */}
            <div className="w-80 bg-white border-r border-gray-200">
                <div className="p-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold">Messages</h2>
                </div>

                {/* Empty State */}
                <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] px-8 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <MessageSquare className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-base font-medium text-gray-900 mb-2">
                        You don't have any messages
                    </h3>
                    <p className="text-sm text-gray-600">
                        When you receive a new message, it will appear here. You can also start a conversation at any time.
                    </p>
                </div>
            </div>

            {/* Message Compose (Right) */}
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center px-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
                    </div>
                    <p className="text-sm text-gray-600">
                        Select or compose a message
                    </p>
                </div>
            </div>
        </div>
    )
}
