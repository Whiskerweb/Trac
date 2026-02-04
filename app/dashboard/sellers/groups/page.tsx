'use client'

import { Construction } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function ComingSoonPage() {
    const t = useTranslations('dashboard.comingSoon')

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-6">
                <Construction className="w-8 h-8 text-gray-400" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">{t('title')}</h1>
            <p className="text-gray-500 max-w-md">
                {t('description')}
            </p>
        </div>
    )
}
