'use client'

import { useState, useEffect, use } from 'react'
import {
    ArrowLeft, Target, Percent, Users, Link2,
    MousePointer2, DollarSign, Copy, Check, Loader2,
    ExternalLink, Calendar, User, TrendingUp, Award
} from 'lucide-react'
import Link from 'next/link'
import { getMissionDetails } from '@/app/actions/missions'

interface MissionDetails {
    id: string
    title: string
    description: string
    target_url: string
    reward: string
    status: string
    created_at: Date
    enrollments: {
        id: string
        user_id: string
        status: string
        created_at: Date
        link: {
            id: string
            slug: string
            clicks: number
            full_url: string
        } | null
    }[]
}

// =============================================
// AFFILIATE ROW COMPONENT
// =============================================

function AffiliateRow({
    enrollment,
    index
}: {
    enrollment: MissionDetails['enrollments'][0]
    index: number
}) {
    const [copied, setCopied] = useState(false)

    async function handleCopy() {
        if (enrollment.link) {
            await navigator.clipboard.writeText(enrollment.link.full_url)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const statusColors = {
        APPROVED: 'bg-green-100 text-green-700',
        PENDING: 'bg-amber-100 text-amber-700',
        REJECTED: 'bg-red-100 text-red-700',
    }

    // Mock stats for now (would come from Tinybird)
    const mockStats = {
        sales: 0,
        revenue: 0,
    }

    return (
        <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
            {/* Rank */}
            <td className="py-4 px-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-semibold text-sm">
                    {index + 1}
                </div>
            </td>

            {/* Affiliate */}
            <td className="py-4 px-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="font-medium text-slate-900 text-sm">
                            {enrollment.user_id.slice(0, 8)}...
                        </p>
                        <p className="text-xs text-slate-500">
                            Inscrit le {new Date(enrollment.created_at).toLocaleDateString('fr-FR')}
                        </p>
                    </div>
                </div>
            </td>

            {/* Link */}
            <td className="py-4 px-4">
                {enrollment.link ? (
                    <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-slate-100 rounded text-xs text-purple-600 font-mono">
                            /s/{enrollment.link.slug}
                        </code>
                        <button
                            onClick={handleCopy}
                            className="p-1 hover:bg-slate-100 rounded transition-colors"
                            title="Copier"
                        >
                            {copied ? (
                                <Check className="w-4 h-4 text-green-600" />
                            ) : (
                                <Copy className="w-4 h-4 text-slate-400" />
                            )}
                        </button>
                    </div>
                ) : (
                    <span className="text-slate-400 text-sm">-</span>
                )}
            </td>

            {/* Clicks */}
            <td className="py-4 px-4">
                <div className="flex items-center gap-2">
                    <MousePointer2 className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-slate-900">
                        {enrollment.link?.clicks || 0}
                    </span>
                </div>
            </td>

            {/* Sales */}
            <td className="py-4 px-4">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-slate-900">
                        {mockStats.sales}
                    </span>
                </div>
            </td>

            {/* Revenue */}
            <td className="py-4 px-4">
                <span className="font-bold text-green-600">
                    €{mockStats.revenue.toFixed(2)}
                </span>
            </td>

            {/* Status */}
            <td className="py-4 px-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[enrollment.status as keyof typeof statusColors] || 'bg-slate-100 text-slate-600'}`}>
                    {enrollment.status}
                </span>
            </td>
        </tr>
    )
}

// =============================================
// MAIN PAGE COMPONENT
// =============================================

export default function MissionDetailPage({
    params
}: {
    params: Promise<{ missionId: string }>
}) {
    const { missionId } = use(params)
    const [mission, setMission] = useState<MissionDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function loadMission() {
            const result = await getMissionDetails(missionId)
            if (result.success && result.mission) {
                setMission(result.mission)
            } else {
                setError(result.error || 'Erreur de chargement')
            }
            setLoading(false)
        }
        loadMission()
    }, [missionId])

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        )
    }

    if (error || !mission) {
        return (
            <div className="min-h-screen bg-slate-50">
                <div className="max-w-6xl mx-auto px-6 py-12">
                    <Link
                        href="/dashboard/missions"
                        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-8"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Retour aux Missions
                    </Link>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                        <p className="text-red-700">{error || 'Mission introuvable'}</p>
                    </div>
                </div>
            </div>
        )
    }

    // Calculate totals
    const totalClicks = mission.enrollments.reduce((sum, e) => sum + (e.link?.clicks || 0), 0)

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-6xl mx-auto px-6 py-12">
                {/* Back Link */}
                <Link
                    href="/dashboard/missions"
                    className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-8 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Retour aux Missions
                </Link>

                {/* Header */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8">
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
                                <Target className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">
                                    {mission.title}
                                </h1>
                                <p className="text-slate-500 mt-1">
                                    {mission.description || 'Aucune description'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                            <Percent className="w-5 h-5 text-green-600" />
                            <span className="text-green-700 font-bold text-lg">
                                {mission.reward}
                            </span>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-slate-50 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                                <Users className="w-4 h-4" />
                                Affiliés
                            </div>
                            <p className="text-2xl font-bold text-slate-900">
                                {mission.enrollments.length}
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                                <MousePointer2 className="w-4 h-4" />
                                Clics totaux
                            </div>
                            <p className="text-2xl font-bold text-slate-900">
                                {totalClicks}
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                                <DollarSign className="w-4 h-4" />
                                Ventes totales
                            </div>
                            <p className="text-2xl font-bold text-slate-900">
                                0
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                                <Link2 className="w-4 h-4" />
                                URL cible
                            </div>
                            <a
                                href={mission.target_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1 truncate"
                            >
                                {mission.target_url.slice(0, 30)}...
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Affiliates Table */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-purple-500" />
                            <h2 className="text-lg font-semibold text-slate-900">
                                Leaderboard Affiliés
                            </h2>
                        </div>
                        <p className="text-slate-500 text-sm mt-1">
                            Performance de vos affiliés inscrits
                        </p>
                    </div>

                    {mission.enrollments.length === 0 ? (
                        <div className="p-12 text-center">
                            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-600 mb-2">
                                Aucun affilié inscrit
                            </h3>
                            <p className="text-slate-500 text-sm">
                                Partagez votre mission pour attirer des affiliés.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-16">
                                            #
                                        </th>
                                        <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                            Affilié
                                        </th>
                                        <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                            Lien
                                        </th>
                                        <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                            Clics
                                        </th>
                                        <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                            Ventes
                                        </th>
                                        <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                            Revenu
                                        </th>
                                        <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                            Statut
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mission.enrollments.map((enrollment, index) => (
                                        <AffiliateRow
                                            key={enrollment.id}
                                            enrollment={enrollment}
                                            index={index}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
