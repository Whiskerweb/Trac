'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, DollarSign } from 'lucide-react'
import { motion } from 'framer-motion'
import { getOrganizationCommissions } from '@/app/actions/organization-actions'
import { TraaactionLoader } from '@/components/ui/TraaactionLoader'

function CommissionStatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        PENDING: 'bg-orange-50 text-orange-700',
        PROCEED: 'bg-blue-50 text-blue-700',
        COMPLETE: 'bg-green-50 text-green-700',
    }
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${styles[status] || 'bg-neutral-100 text-neutral-500'}`}>
            {status}
        </span>
    )
}

export default function ManageOrgCommissions() {
    const params = useParams()
    const orgId = params.orgId as string
    const [commissions, setCommissions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            const result = await getOrganizationCommissions(orgId)
            if (result.success) setCommissions(result.commissions || [])
            setLoading(false)
        }
        load()
    }, [orgId])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <TraaactionLoader size={20} className="text-gray-400" />
            </div>
        )
    }

    if (commissions.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-2xl border border-neutral-200/60 shadow-sm py-20 text-center"
            >
                <DollarSign className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <p className="text-[14px] text-neutral-400">No commissions yet</p>
                <p className="text-[12px] text-neutral-300 mt-1">Commissions will appear here when members generate sales</p>
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl border border-neutral-200/60 shadow-sm overflow-hidden"
        >
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-neutral-100">
                        <th className="text-left px-5 py-3 text-[12px] font-medium text-neutral-400 uppercase tracking-wider bg-neutral-50/50">Member</th>
                        <th className="text-left px-5 py-3 text-[12px] font-medium text-neutral-400 uppercase tracking-wider bg-neutral-50/50">Mission</th>
                        <th className="text-right px-5 py-3 text-[12px] font-medium text-neutral-400 uppercase tracking-wider bg-neutral-50/50">Amount</th>
                        <th className="text-center px-5 py-3 text-[12px] font-medium text-neutral-400 uppercase tracking-wider bg-neutral-50/50">Status</th>
                        <th className="text-right px-5 py-3 text-[12px] font-medium text-neutral-400 uppercase tracking-wider bg-neutral-50/50">Date</th>
                    </tr>
                </thead>
                <tbody>
                    {commissions.map((c: any) => (
                        <tr key={c.id} className="border-b border-neutral-100 hover:bg-neutral-50/50 transition-colors">
                            <td className="px-5 py-3">
                                <p className="text-[14px] font-medium text-neutral-900">{c.Seller?.name || 'Unknown'}</p>
                                <p className="text-[12px] text-neutral-400">{c.Seller?.email}</p>
                            </td>
                            <td className="px-5 py-3 text-[14px] text-neutral-600">{c.missionTitle || '-'}</td>
                            <td className="px-5 py-3 text-right text-[14px] font-semibold text-neutral-900">
                                {(c.commission_amount / 100).toFixed(2)}€
                            </td>
                            <td className="px-5 py-3 text-center">
                                <CommissionStatusBadge status={c.status} />
                            </td>
                            <td className="px-5 py-3 text-right text-[12px] text-neutral-400">
                                {new Date(c.created_at).toLocaleDateString()}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </motion.div>
    )
}
