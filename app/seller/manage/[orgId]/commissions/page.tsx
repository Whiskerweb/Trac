'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, DollarSign } from 'lucide-react'
import { getOrganizationCommissions } from '@/app/actions/organization-actions'

function CommissionStatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        PENDING: 'bg-orange-50 text-orange-700',
        PROCEED: 'bg-blue-50 text-blue-700',
        COMPLETE: 'bg-green-50 text-green-700',
    }
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
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
                <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
            </div>
        )
    }

    if (commissions.length === 0) {
        return (
            <div className="text-center py-20">
                <DollarSign className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No commissions yet</p>
                <p className="text-xs text-gray-300 mt-1">Commissions will appear here when members generate sales</p>
            </div>
        )
    }

    return (
        <div>
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100">
                            <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Member</th>
                            <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Mission</th>
                            <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                            <th className="text-center px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {commissions.map((c: any) => (
                            <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                <td className="px-5 py-3">
                                    <p className="font-medium text-gray-900">{c.Seller?.name || 'Unknown'}</p>
                                    <p className="text-xs text-gray-400">{c.Seller?.email}</p>
                                </td>
                                <td className="px-5 py-3 text-gray-600">{c.missionTitle || '-'}</td>
                                <td className="px-5 py-3 text-right font-semibold text-gray-900">
                                    {(c.commission_amount / 100).toFixed(2)}€
                                </td>
                                <td className="px-5 py-3 text-center">
                                    <CommissionStatusBadge status={c.status} />
                                </td>
                                <td className="px-5 py-3 text-right text-xs text-gray-400">
                                    {new Date(c.created_at).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
