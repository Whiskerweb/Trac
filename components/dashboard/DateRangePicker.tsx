'use client'

import { subDays, subHours, format } from 'date-fns'
import { Calendar } from 'lucide-react'

interface DateRangePickerProps {
    selectedRange: string
    onRangeChange: (range: string, from: string, to: string) => void
}

const PRESET_RANGES = [
    { label: '24h', value: '24h' },
    { label: '7d', value: '7d' },
    { label: '30d', value: '30d' },
    { label: '90d', value: '90d' },
]

export function DateRangePicker({ selectedRange, onRangeChange }: DateRangePickerProps) {
    const calculateDateRange = (range: string): { from: string; to: string } => {
        const now = new Date()
        const to = format(now, 'yyyy-MM-dd')
        let from: string

        switch (range) {
            case '24h':
                from = format(subHours(now, 24), 'yyyy-MM-dd')
                break
            case '7d':
                from = format(subDays(now, 7), 'yyyy-MM-dd')
                break
            case '30d':
                from = format(subDays(now, 30), 'yyyy-MM-dd')
                break
            case '90d':
                from = format(subDays(now, 90), 'yyyy-MM-dd')
                break
            default:
                from = format(subDays(now, 30), 'yyyy-MM-dd')
        }

        return { from, to }
    }

    const handleRangeClick = (range: string) => {
        const { from, to } = calculateDateRange(range)
        onRangeChange(range, from, to)
    }

    return (
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">Period:</span>
            </div>
            <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
                {PRESET_RANGES.map((preset) => (
                    <button
                        key={preset.value}
                        onClick={() => handleRangeClick(preset.value)}
                        className={`
                            px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200
                            ${selectedRange === preset.value
                                ? 'bg-blue-500 text-white shadow-sm'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }
                        `}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>
        </div>
    )
}
