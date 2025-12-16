'use client'

import { useState } from 'react'

interface CopyButtonProps {
    text: string
    className?: string
}

export function CopyButton({ text, className = '' }: CopyButtonProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    return (
        <button
            onClick={handleCopy}
            className={`text-xs px-2 py-1 rounded transition ${copied
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                } ${className}`}
        >
            {copied ? '✓ Copied!' : 'Copy'}
        </button>
    )
}
