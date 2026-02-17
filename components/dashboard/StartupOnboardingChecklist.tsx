'use client'

import { useState, useEffect } from 'react'
import { Check, X, Building2, Rocket, Webhook, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { getStartupOnboardingStatus, type StartupOnboardingStatus } from '@/app/actions/startup-profile'

const DISMISS_KEY = 'trac_startup_onboarding_dismissed'

export function StartupOnboardingChecklist() {
    const t = useTranslations('dashboard.onboarding')
    const router = useRouter()
    const [status, setStatus] = useState<StartupOnboardingStatus | null>(null)
    const [dismissed, setDismissed] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (sessionStorage.getItem(DISMISS_KEY) === 'true') {
            setDismissed(true)
            setLoading(false)
            return
        }
        getStartupOnboardingStatus().then(res => {
            if (res.success && res.status) {
                setStatus(res.status)
            }
            setLoading(false)
        })
    }, [])

    if (loading || dismissed || !status || status.isComplete) return null

    const steps = [
        {
            key: 'profile' as const,
            icon: Building2,
            label: t('steps.profile'),
            href: '/dashboard/settings',
            done: status.steps.profile,
        },
        {
            key: 'mission' as const,
            icon: Rocket,
            label: t('steps.mission'),
            href: '/dashboard/missions/create',
            done: status.steps.mission,
        },
        {
            key: 'webhook' as const,
            icon: Webhook,
            label: t('steps.webhook'),
            href: '/dashboard/integration',
            done: status.steps.webhook,
        },
        {
            key: 'seller' as const,
            icon: Users,
            label: t('steps.seller'),
            href: '/dashboard/sellers',
            done: status.steps.seller,
        },
    ]

    const completedCount = steps.filter(s => s.done).length
    const progress = (completedCount / steps.length) * 100

    const handleDismiss = () => {
        sessionStorage.setItem(DISMISS_KEY, 'true')
        setDismissed(true)
    }

    return (
        <div className="mb-6 bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-5 pt-5 pb-4">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h3 className="text-[15px] font-semibold text-gray-900">{t('title')}</h3>
                        <p className="text-[13px] text-gray-500 mt-0.5">{t('subtitle')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[13px] font-medium text-gray-500">
                            {completedCount}/{steps.length}
                        </span>
                        <button
                            onClick={handleDismiss}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gray-900 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Steps */}
            <div className="px-5 pb-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {steps.map((step) => {
                        const Icon = step.icon
                        return (
                            <button
                                key={step.key}
                                onClick={() => !step.done && router.push(step.href)}
                                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all ${
                                    step.done
                                        ? 'bg-emerald-50'
                                        : 'bg-gray-50 hover:bg-gray-100 cursor-pointer'
                                }`}
                            >
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    step.done ? 'bg-emerald-500' : 'bg-gray-200'
                                }`}>
                                    {step.done ? (
                                        <Check className="w-3.5 h-3.5 text-white" />
                                    ) : (
                                        <Icon className="w-3.5 h-3.5 text-gray-500" />
                                    )}
                                </div>
                                <span className={`text-[13px] font-medium ${
                                    step.done ? 'text-emerald-700 line-through' : 'text-gray-700'
                                }`}>
                                    {step.label}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
