'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { usePortalData } from './layout'
import PortalKPIRow from '@/components/portal/PortalKPIRow'
import PortalEnrollmentCard from '@/components/portal/PortalEnrollmentCard'
import { portalPath } from '@/components/portal/portal-utils'

export default function PortalDashboardHome() {
    const ctx = usePortalData()
    const t = useTranslations('portal.home')
    const tPrograms = useTranslations('portal.programs')
    const params = useParams()
    const workspaceSlug = params.workspaceSlug as string

    if (!ctx) return null
    const { data } = ctx

    const primaryColor = data.workspace.portal_primary_color || '#7C3AED'

    return (
        <div className="space-y-5">
            {/* KPI Row */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <PortalKPIRow
                    pending={data.balance.pending}
                    available={data.balance.available}
                    paid={data.balance.paid}
                    primaryColor={primaryColor}
                />
            </motion.div>

            {/* My Programs Grid */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6"
            >
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-gray-900">{t('myPrograms')}</p>
                    <Link
                        href={portalPath(workspaceSlug, '/dashboard/programs')}
                        className="flex items-center gap-1 text-xs font-medium transition-colors"
                        style={{ color: primaryColor }}
                    >
                        {t('viewAll')}
                        <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>

                {data.enrollments.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-sm text-gray-500">{tPrograms('noEnrolled')}</p>
                        <Link
                            href={portalPath(workspaceSlug, '/dashboard/programs')}
                            className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium transition-colors"
                            style={{ color: primaryColor }}
                        >
                            {tPrograms('browseAvailable')}
                            <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {data.enrollments.map(enrollment => (
                            <PortalEnrollmentCard
                                key={enrollment.id}
                                workspaceSlug={workspaceSlug}
                                missionId={enrollment.missionId}
                                missionTitle={enrollment.missionTitle}
                                missionDescription={enrollment.missionDescription}
                                linkUrl={enrollment.linkUrl}
                                clicks={enrollment.clicks}
                                primaryColor={primaryColor}
                            />
                        ))}
                    </div>
                )}
            </motion.div>

            {/* Available Programs Teaser */}
            {data.availableMissions.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-gray-900">{tPrograms('available')}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {tPrograms('availableCount', { count: data.availableMissions.length })}
                            </p>
                        </div>
                        <Link
                            href={portalPath(workspaceSlug, '/dashboard/programs')}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-colors"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {tPrograms('browseAvailable')}
                            <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                </motion.div>
            )}
        </div>
    )
}
