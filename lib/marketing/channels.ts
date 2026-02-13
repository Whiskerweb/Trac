// =============================================
// MARKETING CHANNELS CONFIGURATION
// =============================================

export interface ChannelConfig {
    id: string
    label: string
    icon: string          // Lucide icon name
    color: string         // Tailwind bg class
    textColor: string     // Tailwind text class
    gradient?: string     // Optional gradient class
}

export const PREDEFINED_CHANNELS: ChannelConfig[] = [
    {
        id: 'instagram',
        label: 'Instagram',
        icon: 'Instagram',
        color: 'bg-gradient-to-r from-purple-500 to-pink-500',
        textColor: 'text-white',
        gradient: 'from-purple-500 to-pink-500',
    },
    {
        id: 'tiktok',
        label: 'TikTok',
        icon: 'Music2',
        color: 'bg-gray-900',
        textColor: 'text-white',
    },
    {
        id: 'email',
        label: 'Email',
        icon: 'Mail',
        color: 'bg-blue-600',
        textColor: 'text-white',
    },
    {
        id: 'google-ads',
        label: 'Google Ads',
        icon: 'Search',
        color: 'bg-green-600',
        textColor: 'text-white',
    },
    {
        id: 'facebook',
        label: 'Facebook',
        icon: 'Facebook',
        color: 'bg-blue-700',
        textColor: 'text-white',
    },
    {
        id: 'twitter',
        label: 'X / Twitter',
        icon: 'Twitter',
        color: 'bg-gray-900',
        textColor: 'text-white',
    },
    {
        id: 'linkedin',
        label: 'LinkedIn',
        icon: 'Linkedin',
        color: 'bg-blue-800',
        textColor: 'text-white',
    },
    {
        id: 'youtube',
        label: 'YouTube',
        icon: 'Youtube',
        color: 'bg-red-600',
        textColor: 'text-white',
    },
    {
        id: 'organic',
        label: 'Organic',
        icon: 'Leaf',
        color: 'bg-emerald-600',
        textColor: 'text-white',
    },
    {
        id: 'other',
        label: 'Other',
        icon: 'Globe',
        color: 'bg-gray-500',
        textColor: 'text-white',
    },
]

const channelMap = new Map(PREDEFINED_CHANNELS.map(c => [c.id, c]))

/**
 * Get channel config by ID. Handles custom channels (prefixed with "custom:").
 */
export function getChannelConfig(channelId: string | null | undefined): ChannelConfig {
    if (!channelId) {
        return PREDEFINED_CHANNELS[PREDEFINED_CHANNELS.length - 1] // "other"
    }

    // Predefined channel
    const predefined = channelMap.get(channelId)
    if (predefined) return predefined

    // Custom channel: "custom:Mon Canal"
    if (channelId.startsWith('custom:')) {
        const customLabel = channelId.slice(7)
        return {
            id: channelId,
            label: customLabel,
            icon: 'Tag',
            color: 'bg-violet-600',
            textColor: 'text-white',
        }
    }

    // Unknown — treat as other
    return { ...PREDEFINED_CHANNELS[PREDEFINED_CHANNELS.length - 1], label: channelId }
}

/**
 * Get all predefined channel IDs for filtering.
 */
export function getPredefinedChannelIds(): string[] {
    return PREDEFINED_CHANNELS.map(c => c.id)
}
