// =============================================
// MARKETING TAGS — Apple-style color palette
// =============================================

export interface TagColor {
    id: string
    hex: string
    bg: string
    text: string
    dot: string
}

export const TAG_COLORS: TagColor[] = [
    { id: 'red',    hex: '#EF4444', bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500' },
    { id: 'orange', hex: '#F97316', bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
    { id: 'yellow', hex: '#EAB308', bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
    { id: 'green',  hex: '#22C55E', bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500' },
    { id: 'blue',   hex: '#3B82F6', bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500' },
    { id: 'purple', hex: '#8B5CF6', bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
    { id: 'gray',   hex: '#6B7280', bg: 'bg-gray-100',   text: 'text-gray-700',   dot: 'bg-gray-500' },
]

const colorMap = new Map(TAG_COLORS.map(c => [c.hex, c]))

/**
 * Get Tailwind classes for a given hex color.
 * Falls back to gray if hex not found.
 */
export function getTagColor(hex: string): TagColor {
    return colorMap.get(hex) || TAG_COLORS[TAG_COLORS.length - 1]
}
