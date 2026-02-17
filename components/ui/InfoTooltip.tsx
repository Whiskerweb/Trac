'use client'

import { Info } from 'lucide-react'

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right'

interface InfoTooltipProps {
    text: string
    position?: TooltipPosition
    width?: string
}

const positionClasses: Record<TooltipPosition, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}

const arrowClasses: Record<TooltipPosition, string> = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-900 border-x-transparent border-b-transparent border-[4px]',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900 border-x-transparent border-t-transparent border-[4px]',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-900 border-y-transparent border-r-transparent border-[4px]',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-900 border-y-transparent border-l-transparent border-[4px]',
}

export default function InfoTooltip({ text, position = 'top', width = 'w-64' }: InfoTooltipProps) {
    return (
        <div className="group/tooltip relative inline-flex">
            <Info className="w-3.5 h-3.5 text-gray-400 cursor-help hover:text-gray-500 transition-colors" />
            <div className={`absolute ${positionClasses[position]} hidden group-hover/tooltip:block ${width} z-50`}>
                <div className="bg-gray-900 text-white text-xs rounded-lg p-2.5 leading-relaxed shadow-lg">
                    {text}
                </div>
                <div className={`absolute ${arrowClasses[position]}`} />
            </div>
        </div>
    )
}
