'use client'

import { useState, useEffect } from 'react'
import {
    Loader2, AlertCircle, ExternalLink, Copy, Check
} from 'lucide-react'
import Link from 'next/link'
import { getAllPartnerPrograms } from '@/app/actions/partners'

// Design System
const DS = {
    colors: {
        bg: 'bg-[#FAFAFB]',
        card: 'bg-[#FFFFFF]',
        border: 'border-[rgba(0,0,0,0.06)]',
        text: {
            primary: 'text-[#111111]',
            secondary: 'text-[#5F6368]',
            muted: 'text-[#9AA0A6]',
        },
        gradient: 'bg-gradient-to-r from-[#6D5EF6] to-[#E94BA8]'
    },
    typog: {
        h1: 'text-[24px] font-semibold tracking-tight',
        cardTitle: 'text-[16px] font-semibold',
        label: 'text-[12px] font-medium text-[#5F6368]',
        value: 'text-[24px] font-semibold text-[#111111]',
        link: 'text-[13px] text-[#5F6368] font-normal'
    }
}

interface ProgramData {
    partner: {
        id: string
        tenant_id: string
        Program?: {
            name: string
            slug: string
        } | null
    }
    stats: {
        totalEarned: number
        pendingAmount: number
        dueAmount: number
        paidAmount: number
    }
}

function ProgramCard({ data }: { data: ProgramData }) {
    const [copied, setCopied] = useState(false)
    const programName = data.partner.Program?.name || 'Programme Global'
    const link = `https://traaaction.com/p/${data.partner.tenant_id}` // Constructing a generic referral link format
    const earnings = (data.stats.totalEarned / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })

    const copyLink = () => {
        navigator.clipboard.writeText(link)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className={`${DS.colors.card} border ${DS.colors.border} rounded-[16px] p-6 hover:shadow-sm transition-shadow duration-200`}>
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                    {programName.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                    <h3 className={`${DS.typog.cardTitle} truncate`}>{programName}</h3>
                    <div
                        onClick={copyLink}
                        className="flex items-center gap-1.5 mt-0.5 cursor-pointer group"
                    >
                        <span className={`${DS.typog.link} truncate`}>
                            {link.replace('https://', '')}
                        </span>
                        {copied ?
                            <Check className="w-3 h-3 text-green-500" /> :
                            <Copy className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                        }
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="bg-[#FAFAFB] border border-[rgba(0,0,0,0.04)] rounded-[12px] p-4">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <p className={DS.typog.label}>Gains totaux</p>
                        <p className={DS.typog.value}>{earnings}</p>
                    </div>
                </div>

                {/* Visual Progress Bar (Gradient) */}
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${DS.colors.gradient}`}
                        style={{ width: data.stats.totalEarned > 0 ? '100%' : '5%' }}
                    />
                </div>
            </div>
        </div>
    )
}

export default function PartnerProgramsPage() {
    const [loading, setLoading] = useState(true)
    const [programs, setPrograms] = useState<ProgramData[]>([])
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function load() {
            try {
                const res = await getAllPartnerPrograms()
                if (res.success && res.programs) {
                    setPrograms(res.programs as unknown as ProgramData[])
                } else {
                    setError(res.error || 'Erreur de chargement')
                }
            } catch (e) {
                setError('Erreur inattendue')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    if (loading) return (
        <div className="min-h-screen bg-[#FAFAFB] flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
    )

    if (error) return (
        <div className="min-h-screen bg-[#FAFAFB] flex items-center justify-center">
            <div className="text-center">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-slate-600">{error}</p>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-[#FAFAFB]">
            <div className="max-w-[1200px] mx-auto px-8 py-10">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <h1 className={DS.typog.h1}>Mes Programmes</h1>
                    {/* Hidden sidebar trigger or other utility could go here */}
                </div>

                {/* Grid */}
                {programs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {programs.map((prog) => (
                            <ProgramCard key={prog.partner.id} data={prog} />
                        ))}
                    </div>
                ) : (
                    // Empty State
                    <div className="flex flex-col items-center justify-center py-20 bg-white border border-[rgba(0,0,0,0.06)] rounded-[16px]">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <ExternalLink className="w-5 h-5 text-slate-400" />
                        </div>
                        <h3 className="text-[16px] font-medium text-[#111111] mb-2">Aucun programme rejoint</h3>
                        <p className="text-[#5F6368] text-[14px] mb-6">Rejoignez des missions pour voir vos programmes ici.</p>
                        <Link
                            href="/marketplace"
                            className="bg-[#111111] text-white px-5 py-2.5 rounded-[10px] text-[13px] font-medium hover:bg-black transition-colors"
                        >
                            Explorer le Marketplace
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
