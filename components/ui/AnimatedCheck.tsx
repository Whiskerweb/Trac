'use client'

import { motion } from 'framer-motion'
import { checkmarkDraw } from '@/lib/animations'

interface AnimatedCheckProps {
    size?: number
    className?: string
    color?: string
}

export function AnimatedCheck({ size = 24, className = '', color = 'currentColor' }: AnimatedCheckProps) {
    return (
        <motion.svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <motion.path
                d="M5 13l4 4L19 7"
                variants={checkmarkDraw}
                initial="hidden"
                animate="visible"
            />
        </motion.svg>
    )
}
