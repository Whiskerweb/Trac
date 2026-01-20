'use client'

import { useState, useEffect } from 'react'
import { DollarSign, Users, CreditCard, Check, AlertCircle, Loader2 } from 'lucide-react'
import { getUnpaidCommissions, createPaymentSession, PartnerSummary } from '@/app/actions/payouts'
import { useSearchParams } from 'next/navigation'

export default function PayoutsPage() {
    const [loading, setLoading] = useState(true)
    const [paying, setPaying] = useState(false)
    const [partnerSummary, setPartnerSummary] = useState<PartnerSummary[]>([])
    const [selectedPartners, setSelectedPartners] = useState<Set<string>>(new Set())
    const [commissionsByPartner, setCommissionsByPartner] = useState<Record<string, string[]>>({})
    const [totals, setTotals] = useState({ partnerTotal: 0, platformTotal: 0, grandTotal: 0, commissionCount: 0 })
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const searchParams = useSearchParams()

    useEffect(() => {
        loadData()
        // Check for success/cancel from Stripe
        if (searchParams.get('success') === 'true') {
            setSuccess(true)
        }
    }, [searchParams])

    async function loadData() {
        setLoading(true)
        const result = await getUnpaidCommissions()
        if (result.success && result.partnerSummary && result.totals && result.commissions) {
            setPartnerSummary(result.partnerSummary)
            setTotals(result.totals)

            // Group commission IDs by partner
            const byPartner: Record<string, string[]> = {}
            for (const c of result.commissions) {
                if (!byPartner[c.partner_id]) byPartner[c.partner_id] = []
                byPartner[c.partner_id].push(c.id)
            }
            setCommissionsByPartner(byPartner)
        } else {
            setError(result.error || 'Failed to load data')
        }
        setLoading(false)
    }

    function togglePartner(partnerId: string) {
        const newSelected = new Set(selectedPartners)
        if (newSelected.has(partnerId)) {
            newSelected.delete(partnerId)
        } else {
            newSelected.add(partnerId)
        }
        setSelectedPartners(newSelected)
    }

    function selectAll() {
        if (selectedPartners.size === partnerSummary.length) {
            setSelectedPartners(new Set())
        } else {
            setSelectedPartners(new Set(partnerSummary.map(p => p.partner_id)))
        }
    }

    // Calculate selected totals
    const selectedTotals = partnerSummary
        .filter(p => selectedPartners.has(p.partner_id))
        .reduce((acc, p) => ({
            partner: acc.partner + p.total_commission,
            platform: acc.platform + p.total_platform_fee,
            count: acc.count + p.commission_count
        }), { partner: 0, platform: 0, count: 0 })

    async function handlePay() {
        if (selectedPartners.size === 0) return
        setPaying(true)
        setError(null)

        // Get all commission IDs for selected partners
        const commissionIds: string[] = []
        for (const partnerId of selectedPartners) {
            commissionIds.push(...(commissionsByPartner[partnerId] || []))
        }

        const result = await createPaymentSession(commissionIds)
        if (result.success && result.checkoutUrl) {
            // Redirect to Stripe Checkout
            window.location.href = result.checkoutUrl
        } else {
            setError(result.error || 'Payment failed')
            setPaying(false)
        }
    }

    const formatAmount = (cents: number) => `${(cents / 100).toFixed(2)}€`

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">Paiements</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Payez les commissions dues à vos partenaires
                </p>
            </div>

            {/* Success Message */}
            {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <div>
                        <p className="font-medium text-green-800">Paiement effectué !</p>
                        <p className="text-sm text-green-600">Les commissions sont en cours de transfert aux partenaires.</p>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <p className="text-red-800">{error}</p>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Partenaires</p>
                            <p className="text-xl font-semibold text-gray-900">{partnerSummary.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-50 rounded-lg">
                            <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Commissions dues</p>
                            <p className="text-xl font-semibold text-gray-900">{formatAmount(totals.partnerTotal)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 rounded-lg">
                            <CreditCard className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Frais Traaaction (15%)</p>
                            <p className="text-xl font-semibold text-gray-900">{formatAmount(totals.platformTotal)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-50 rounded-lg">
                            <DollarSign className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total à payer</p>
                            <p className="text-xl font-semibold text-gray-900">{formatAmount(totals.grandTotal)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Partner List */}
            {partnerSummary.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">Tout est à jour !</h3>
                    <p className="text-gray-500 mt-1">Aucune commission en attente de paiement.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {/* Table Header */}
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={selectedPartners.size === partnerSummary.length}
                                onChange={selectAll}
                                className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                            />
                            <span className="text-sm font-medium text-gray-700">
                                {selectedPartners.size === 0
                                    ? 'Sélectionner tout'
                                    : `${selectedPartners.size} sélectionné${selectedPartners.size > 1 ? 's' : ''}`}
                            </span>
                        </div>
                        {selectedPartners.size > 0 && (
                            <button
                                onClick={handlePay}
                                disabled={paying}
                                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {paying ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Traitement...
                                    </>
                                ) : (
                                    <>
                                        <CreditCard className="w-4 h-4" />
                                        Payer {formatAmount(selectedTotals.partner + selectedTotals.platform)}
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Partner Rows */}
                    <div className="divide-y divide-gray-100">
                        {partnerSummary.map((partner) => (
                            <div
                                key={partner.partner_id}
                                className={`px-6 py-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors ${selectedPartners.has(partner.partner_id) ? 'bg-gray-50' : ''
                                    }`}
                                onClick={() => togglePartner(partner.partner_id)}
                            >
                                <div className="flex items-center gap-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedPartners.has(partner.partner_id)}
                                        onChange={() => togglePartner(partner.partner_id)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                                    />
                                    <div>
                                        <p className="font-medium text-gray-900">{partner.partner_name}</p>
                                        <p className="text-sm text-gray-500">
                                            {partner.commission_count} vente{partner.commission_count > 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium text-gray-900">{formatAmount(partner.total_commission)}</p>
                                    <p className="text-xs text-gray-400">
                                        + {formatAmount(partner.total_platform_fee)} frais
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Traaaction Fee Row */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-4" /> {/* Spacer for checkbox alignment */}
                                <div>
                                    <p className="font-medium text-gray-600">Frais Traaaction (15%)</p>
                                    <p className="text-sm text-gray-400">Inclus automatiquement</p>
                                </div>
                            </div>
                            <p className="font-medium text-gray-600">{formatAmount(totals.platformTotal)}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
