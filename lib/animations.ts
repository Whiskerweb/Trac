import type { Transition, Variants } from 'framer-motion'

// =============================================
// SPRING PRESETS
// =============================================

/** Snappy spring for buttons, badges, toggles */
export const springSnappy: Transition = {
    type: 'spring',
    stiffness: 500,
    damping: 30,
}

/** Smooth spring for modals, drawers */
export const springSmooth: Transition = {
    type: 'spring',
    stiffness: 300,
    damping: 30,
}

/** Gentle spring for page entrances, staggered lists */
export const springGentle: Transition = {
    type: 'spring',
    stiffness: 200,
    damping: 24,
}

// =============================================
// INTERACTION PRESETS
// =============================================

/** Micro press feedback for buttons */
export const buttonTap = { scale: 0.97 }

/** Subtle scale on icon hover */
export const iconHover = { scale: 1.12 }

// =============================================
// VARIANTS
// =============================================

/** Fade in + slide up — page sections, cards */
export const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0 },
}

/** Scale pop — badges, toasts */
export const scalePop: Variants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: springSnappy,
    },
}

/** Dropdown / popover entrance */
export const dropdownVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: -4 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: springSnappy,
    },
    exit: { opacity: 0, scale: 0.95, y: -4, transition: { duration: 0.15 } },
}

/** Modal backdrop */
export const modalOverlayVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
}

/** Modal content panel */
export const modalContentVariants: Variants = {
    hidden: { opacity: 0, scale: 0.96, y: 10 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: springSmooth,
    },
    exit: { opacity: 0, scale: 0.96, y: 10, transition: { duration: 0.15 } },
}

/** Stagger container — wrap items with staggerItem */
export const staggerContainer: Variants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.04,
        },
    },
}

/** Individual stagger item */
export const staggerItem: Variants = {
    hidden: { opacity: 0, y: 6 },
    visible: { opacity: 1, y: 0 },
}

/** Floating animation for empty states */
export const floatVariants: Variants = {
    float: {
        y: [0, -6, 0],
        transition: {
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
        },
    },
}

/** Checkmark draw path */
export const checkmarkDraw: Variants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
        pathLength: 1,
        opacity: 1,
        transition: { duration: 0.4, ease: 'easeOut' },
    },
}
