'use client'

import { useState } from 'react'
import { X, User, Calendar, DollarSign, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Commission {
    id: string
    saleId: string
    amount: number      // in cents
    platformFee: number // in cents
    date: string        // ISO string
}

interface SellerPayoutSummary {
    sellerId: string
    sellerName: string
    sellerEmail: string
    sellerAvatar?: string
    totalCommission: number
    totalPlatformFee: number
    commissionCount: number
    commissions: Commission[]
    meetsMinimum: boolean
}

interface Props {
    isOpen: boolean
    onClose: () => void
    seller: SellerPayoutSummary | null
    isSelected: boolean
    onToggleSelection: () => void
}

const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(cents / 100)
}

const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    })
}

export function CommissionDetailModal({ isOpen, onClose, seller, isSelected, onToggleSelection }: Props) {
    if (!seller) return null

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg bg-white rounded-2xl shadow-2xl z-50 max-h-[80vh] flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <div className="flex items-center gap-4">
                                {/* Avatar */}
                                {seller.sellerAvatar ? (
                                    <img
                                        src={seller.sellerAvatar}
                                        alt={seller.sellerName}
                                        className="w-12 h-12 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                                        {seller.sellerName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-semibold text-gray-900">{seller.sellerName}</h3>
                                    <p className="text-sm text-gray-500">{seller.sellerEmail}</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Summary Stats */}
                        <div className="grid grid-cols-3 gap-4 p-6 bg-gray-50 border-b border-gray-100">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900">{formatCurrency(seller.totalCommission)}</p>
                                <p className="text-xs text-gray-500 mt-1">Commission seller</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900">{formatCurrency(seller.totalPlatformFee)}</p>
                                <p className="text-xs text-gray-500 mt-1">Frais plateforme</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-violet-600">{seller.commissionCount}</p>
                                <p className="text-xs text-gray-500 mt-1">Ventes</p>
                            </div>
                        </div>

                        {/* Commission List */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <h4 className="text-sm font-medium text-gray-700 mb-4">Détail des commissions</h4>
                            <div className="space-y-3">
                                {seller.commissions.map((commission) => (
                                    <div
                                        key={commission.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                                <DollarSign className="w-4 h-4 text-green-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {commission.saleId.substring(0, 20)}...
                                                </p>
                                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDate(commission.date)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-gray-900">
                                                {formatCurrency(commission.amount)}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                +{formatCurrency(commission.platformFee)} frais
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer with Action */}
                        <div className="p-6 border-t border-gray-100 bg-white">
                            {seller.meetsMinimum ? (
                                <button
                                    onClick={() => {
                                        onToggleSelection()
                                        onClose()
                                    }}
                                    className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                                        isSelected
                                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            : 'bg-violet-600 text-white hover:bg-violet-700'
                                    }`}
                                >
                                    {isSelected ? (
                                        <>
                                            <Check className="w-5 h-5" />
                                            Sélectionné pour paiement
                                        </>
                                    ) : (
                                        'Ajouter au paiement'
                                    )}
                                </button>
                            ) : (
                                <div className="text-center">
                                    <p className="text-sm text-amber-600 bg-amber-50 py-3 rounded-xl">
                                        Minimum 10€ requis pour le paiement
                                        <br />
                                        <span className="text-xs text-amber-500">
                                            Il manque {formatCurrency(1000 - seller.totalCommission)}
                                        </span>
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
