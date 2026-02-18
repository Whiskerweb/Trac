'use client'

import { useState, useCallback } from 'react'
import { Copy, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { springSnappy } from '@/lib/animations'

interface CopyButtonProps {
    text: string
    className?: string
    iconSize?: number
    label?: string
}

export function CopyButton({ text, className = '', iconSize = 4, label }: CopyButtonProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = useCallback(async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }, [text])

    const sizeClass = `w-${iconSize} h-${iconSize}`

    return (
        <button
            onClick={handleCopy}
            className={`flex-shrink-0 rounded-lg transition-colors ${
                copied
                    ? 'bg-green-50 text-green-600'
                    : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            } ${label ? 'flex items-center gap-2 px-3 py-1.5' : 'p-2'} ${className}`}
            title={copied ? 'Copied!' : 'Copy'}
        >
            <AnimatePresence mode="wait" initial={false}>
                {copied ? (
                    <motion.div
                        key="check"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={springSnappy}
                    >
                        <Check className={sizeClass} />
                    </motion.div>
                ) : (
                    <motion.div
                        key="copy"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={springSnappy}
                    >
                        <Copy className={sizeClass} />
                    </motion.div>
                )}
            </AnimatePresence>
            {label && <span className="text-sm">{copied ? 'Copied!' : label}</span>}
        </button>
    )
}
