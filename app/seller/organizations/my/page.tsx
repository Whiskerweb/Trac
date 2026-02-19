'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Crown, Users, ChevronRight, FolderOpen } from 'lucide-react'
import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer, staggerItem, springGentle } from '@/lib/animations'
import { getMyOrganizations } from '@/app/actions/organization-actions'

function OrgStatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        PENDING: 'bg-orange-50 text-orange-700 border-orange-200',
        ACTIVE: 'bg-green-50 text-green-700 border-green-200',
        SUSPENDED: 'bg-red-50 text-red-700 border-red-200',
    }
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border badge-pop ${styles[status] || 'bg-neutral-100 text-neutral-500 border-neutral-200'}`}>
            {status}
        </span>
    )
}

function OrgCard({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay }}
            className={`bg-white rounded-2xl border border-neutral-200/60 shadow-sm card-hover ${className}`}
        >
            {children}
        </motion.div>
    )
}

export default function MyOrganizationsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [ledOrgs, setLedOrgs] = useState<any[]>([])
    const [memberOrgs, setMemberOrgs] = useState<any[]>([])

    const loadData = useCallback(async () => {
        setLoading(true)
        const result = await getMyOrganizations()
        if (result.success) {
            setLedOrgs(result.led || [])
            setMemberOrgs(result.memberOf || [])
        }
        setLoading(false)
    }, [])

    useEffect(() => { loadData() }, [loadData])

    if (loading) {
        return (
            <div className="bg-[#FAFAFA] min-h-screen">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                    <div className="skeleton-shimmer h-7 w-48 rounded-lg mb-2" />
                    <div className="skeleton-shimmer h-4 w-64 rounded mb-8" />
                    <div className="space-y-4">
                        <div className="skeleton-shimmer h-20 rounded-2xl" />
                        <div className="skeleton-shimmer h-20 rounded-2xl" />
                    </div>
                </div>
            </div>
        )
    }

    const hasOrgs = ledOrgs.length > 0 || memberOrgs.length > 0

    return (
        <div className="bg-[#FAFAFA] min-h-screen">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mb-8"
                >
                    <h1 className="text-[22px] font-semibold text-neutral-900 tracking-tight">My Organizations</h1>
                    <p className="text-[14px] text-neutral-500 mt-1">Organizations you lead or belong to</p>
                </motion.div>

                {!hasOrgs ? (
                    <OrgCard className="flex flex-col items-center justify-center min-h-[300px] text-center px-6">
                        <div className="w-14 h-14 bg-neutral-50 rounded-2xl flex items-center justify-center mb-4">
                            <FolderOpen className="w-7 h-7 text-neutral-300" />
                        </div>
                        <p className="text-[15px] font-medium text-neutral-900 mb-1">No organizations yet</p>
                        <p className="text-[14px] text-neutral-500 mb-6">Browse organizations to find a team and start earning together.</p>
                        <Link href="/seller/organizations" className="h-11 px-5 inline-flex items-center bg-neutral-900 text-white rounded-xl text-[14px] font-medium hover:bg-neutral-800 transition-colors btn-press">
                            Browse organizations
                        </Link>
                    </OrgCard>
                ) : (
                    <div className="space-y-8">
                        {/* Led by me */}
                        {ledOrgs.length > 0 && (
                            <div>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center gap-2 mb-4"
                                >
                                    <Crown className="w-4 h-4 text-amber-500" />
                                    <h2 className="text-[12px] font-semibold text-neutral-400 uppercase tracking-wider">Led by me</h2>
                                </motion.div>
                                <OrgCard className="overflow-hidden">
                                    {ledOrgs.map((org, i) => (
                                        <Link
                                            key={org.id}
                                            href={org.status === 'ACTIVE' ? `/seller/manage/${org.id}` : '#'}
                                            className={org.status !== 'ACTIVE' ? 'pointer-events-none' : ''}
                                        >
                                            <div className={`group flex items-center justify-between px-5 py-4 hover:bg-neutral-50/60 transition-colors cursor-pointer ${
                                                i < ledOrgs.length - 1 ? 'border-b border-neutral-100' : ''
                                            }`}>
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                                                        <Crown className="w-5 h-5 text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[14px] font-semibold text-neutral-900 group-hover:text-neutral-700 transition-colors">{org.name}</p>
                                                        <p className="text-[12px] text-neutral-400">{org._count?.Members || 0} members · {org._count?.Missions || 0} missions</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <OrgStatusBadge status={org.status} />
                                                    {org.status === 'ACTIVE' && <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-400" />}
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </OrgCard>
                            </div>
                        )}

                        {/* Member of */}
                        {memberOrgs.length > 0 && (
                            <div>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.1 }}
                                    className="flex items-center gap-2 mb-4"
                                >
                                    <Users className="w-4 h-4 text-neutral-400" />
                                    <h2 className="text-[12px] font-semibold text-neutral-400 uppercase tracking-wider">Member of</h2>
                                </motion.div>
                                <OrgCard className="overflow-hidden" delay={0.1}>
                                    {memberOrgs.map((org: any, i: number) => (
                                        <Link key={org.id} href={`/seller/manage/${org.id}`}>
                                            <div className={`group flex items-center justify-between px-5 py-4 hover:bg-neutral-50/60 transition-colors cursor-pointer ${
                                                i < memberOrgs.length - 1 ? 'border-b border-neutral-100' : ''
                                            }`}>
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                                        <span className="text-sm font-semibold text-white">{org.name.charAt(0)}</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-[14px] font-semibold text-neutral-900 group-hover:text-neutral-700 transition-colors">{org.name}</p>
                                                        <p className="text-[12px] text-neutral-400">Led by {org.Leader?.name || org.Leader?.email} · {org._count?.Members || 0} members</p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-400" />
                                            </div>
                                        </Link>
                                    ))}
                                </OrgCard>
                            </div>
                        )}
                    </div>
                )}

                {/* Discreet create link */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-center mt-16 pb-4"
                >
                    <p className="text-[12px] text-neutral-400">
                        Want to lead your own team?{' '}
                        <Link href="/seller/organizations/apply" className="text-neutral-500 hover:text-neutral-700 underline underline-offset-2 transition-colors">
                            Apply to create an organization
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    )
}
