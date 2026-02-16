'use client'

import OrgDealCard from './OrgDealCard'
import MissionInviteCard from './MissionInviteCard'
import EnrollmentRequestCard from './EnrollmentRequestCard'

interface MessageCardProps {
    messageId: string
    messageType: string
    metadata: Record<string, unknown> | null
    actionStatus: string | null
    /** true when the card was sent by the current viewer */
    isOwnMessage: boolean
    onAction?: () => void
}

export default function MessageCard({ messageId, messageType, metadata, actionStatus, isOwnMessage, onAction }: MessageCardProps) {
    if (!metadata) return null

    switch (messageType) {
        case 'ORG_DEAL_PROPOSAL':
            return (
                <OrgDealCard
                    messageId={messageId}
                    metadata={metadata as Record<string, unknown> & { orgMissionId: string; orgId: string; orgName: string; missionId: string; missionTitle: string; totalReward: string; companyName: string }}
                    actionStatus={actionStatus}
                    isOwnMessage={isOwnMessage}
                    onAction={onAction}
                />
            )
        case 'MISSION_INVITE':
            return (
                <MissionInviteCard
                    messageId={messageId}
                    metadata={metadata as Record<string, unknown> & { missionId: string; missionTitle: string; reward: string; companyName: string }}
                    actionStatus={actionStatus}
                    isOwnMessage={isOwnMessage}
                    onAction={onAction}
                />
            )
        case 'ENROLLMENT_REQUEST':
            return (
                <EnrollmentRequestCard
                    messageId={messageId}
                    metadata={metadata as Record<string, unknown> & { programRequestId: string; missionId: string; missionTitle: string; sellerName: string; sellerEmail: string }}
                    actionStatus={actionStatus}
                    isOwnMessage={isOwnMessage}
                    onAction={onAction}
                />
            )
        default:
            return null
    }
}
