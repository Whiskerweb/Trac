'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, MessageSquare, Users, CreditCard, Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { getNotificationSummary, type NotificationSummary } from '@/app/actions/notifications'
import { markAllMessagesAsRead } from '@/app/actions/messaging'
import { dropdownVariants } from '@/lib/animations'

export function NotificationCenter() {
    const t = useTranslations('dashboard.notifications')
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [summary, setSummary] = useState<NotificationSummary | null>(null)
    const [markingRead, setMarkingRead] = useState(false)
    const panelRef = useRef<HTMLDivElement>(null)

    const fetchNotifications = useCallback(async () => {
        const res = await getNotificationSummary()
        if (res.success && res.summary) {
            setSummary(res.summary)
        }
    }, [])

    // Initial load + 30s refresh
    useEffect(() => {
        fetchNotifications()
        const interval = setInterval(fetchNotifications, 30000)
        return () => clearInterval(interval)
    }, [fetchNotifications])

    // Close on click outside
    useEffect(() => {
        function handleMouseDown(e: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleMouseDown)
        }
        return () => document.removeEventListener('mousedown', handleMouseDown)
    }, [isOpen])

    const handleMarkAllRead = async () => {
        setMarkingRead(true)
        await markAllMessagesAsRead()
        await fetchNotifications()
        setMarkingRead(false)
    }

    const handleItemClick = (href: string) => {
        setIsOpen(false)
        router.push(href)
    }

    const totalCount = summary?.totalCount || 0

    return (
        <div ref={panelRef} className="relative">
            {/* Bell trigger */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Notifications"
            >
                <Bell className="w-5 h-5" />
                {totalCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
                        {totalCount > 99 ? '99+' : totalCount}
                    </span>
                )}
            </button>

            {/* Dropdown panel */}
            <AnimatePresence>
            {isOpen && (
                <motion.div
                    variants={dropdownVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="absolute right-0 top-full mt-2 w-[380px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-gray-100">
                        <h3 className="text-[15px] font-semibold text-gray-900">{t('title')}</h3>
                    </div>

                    {totalCount === 0 ? (
                        /* Empty state */
                        <div className="px-5 py-10 text-center">
                            <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                                <Check className="w-6 h-6 text-gray-400" />
                            </div>
                            <p className="text-[14px] text-gray-500">{t('empty')}</p>
                        </div>
                    ) : (
                        <div className="max-h-[420px] overflow-y-auto">
                            {/* Messages section */}
                            {summary && summary.categories.messages.count > 0 && (
                                <div>
                                    <div className="px-5 py-2.5 flex items-center justify-between bg-gray-50/80">
                                        <div className="flex items-center gap-2">
                                            <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                                            <span className="text-[12px] font-medium text-gray-500 uppercase tracking-wider">{t('messages')}</span>
                                            <span className="text-[11px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">
                                                {summary.categories.messages.count}
                                            </span>
                                        </div>
                                        <button
                                            onClick={handleMarkAllRead}
                                            disabled={markingRead}
                                            className="text-[12px] text-violet-600 hover:text-violet-700 font-medium transition-colors disabled:opacity-50"
                                        >
                                            {t('markAllRead')}
                                        </button>
                                    </div>
                                    {summary.categories.messages.items.map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => handleItemClick(item.href)}
                                            className="w-full px-5 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <MessageSquare className="w-4 h-4 text-violet-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-medium text-gray-900 truncate">{item.label}</p>
                                                {item.sublabel && (
                                                    <p className="text-[12px] text-gray-500 truncate mt-0.5">{item.sublabel}</p>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Sellers section */}
                            {summary && summary.categories.sellers.count > 0 && (
                                <div>
                                    <div className="px-5 py-2.5 flex items-center gap-2 bg-gray-50/80">
                                        <Users className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="text-[12px] font-medium text-gray-500 uppercase tracking-wider">{t('sellers')}</span>
                                        <span className="text-[11px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-medium">
                                            {summary.categories.sellers.count}
                                        </span>
                                    </div>
                                    {summary.categories.sellers.items.map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => handleItemClick(item.href)}
                                            className="w-full px-5 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Users className="w-4 h-4 text-orange-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-medium text-gray-900 truncate">{item.label}</p>
                                                {item.sublabel && (
                                                    <p className="text-[12px] text-gray-500 truncate mt-0.5">{item.sublabel}</p>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Commissions section */}
                            {summary && summary.categories.commissions.count > 0 && (
                                <div>
                                    <div className="px-5 py-2.5 flex items-center gap-2 bg-gray-50/80">
                                        <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="text-[12px] font-medium text-gray-500 uppercase tracking-wider">{t('commissions')}</span>
                                        <span className="text-[11px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
                                            {summary.categories.commissions.count}
                                        </span>
                                    </div>
                                    {summary.categories.commissions.items.map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => handleItemClick(item.href)}
                                            className="w-full px-5 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <CreditCard className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-medium text-gray-900 truncate">{item.label}</p>
                                                {item.sublabel && (
                                                    <p className="text-[12px] text-gray-500 truncate mt-0.5">{item.sublabel}</p>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    )
}
