'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Users, Briefcase, ArrowRight } from 'lucide-react'
import { getPublicOrganization } from '@/app/actions/organization-actions'
import { TraaactionLoader } from '@/components/ui/TraaactionLoader'

export default function PublicOrgPage() {
    const params = useParams()
    const router = useRouter()
    const slug = params.slug as string
    const [org, setOrg] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            const result = await getPublicOrganization(slug)
            if (result.success) {
                setOrg(result.organization)
            }
            setLoading(false)
        }
        load()
    }, [slug])

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <TraaactionLoader size={24} className="text-gray-400" />
            </div>
        )
    }

    if (!org) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center">
                <p className="text-gray-500 mb-4">Organization not found</p>
                <Link href="/" className="text-violet-600 text-sm font-medium hover:underline">Back to home</Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
            <div className="max-w-2xl mx-auto px-4 py-20 text-center">
                {/* Logo */}
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl font-bold text-white">{org.name.charAt(0)}</span>
                </div>

                <h1 className="text-3xl font-bold text-gray-900 mb-3">{org.name}</h1>

                {org.description && (
                    <p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-lg mx-auto">{org.description}</p>
                )}

                {/* Stats */}
                <div className="flex items-center justify-center gap-8 mb-10">
                    <div className="flex items-center gap-2 text-gray-600">
                        <Users className="w-5 h-5 text-gray-400" />
                        <span className="text-sm font-medium">{org.memberCount} members</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                        <Briefcase className="w-5 h-5 text-gray-400" />
                        <span className="text-sm font-medium">{org.missionCount} missions</span>
                    </div>
                </div>

                {org.leaderName && (
                    <p className="text-sm text-gray-400 mb-8">Led by <span className="text-gray-600 font-medium">{org.leaderName}</span></p>
                )}

                {/* CTA */}
                <Link
                    href={`/seller/organizations/${slug}`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                    View Organization <ArrowRight className="w-4 h-4" />
                </Link>

                <p className="text-xs text-gray-400 mt-4">
                    Sign in or create an account to join
                </p>

                {/* Branding */}
                <div className="mt-16 pt-8 border-t border-gray-100">
                    <a href="https://traaaction.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
                        <img src="/Logotrac/logo1.png" alt="Traaaction" className="w-6 h-6 rounded-lg" />
                        Propulsé par traaaction.com
                    </a>
                </div>
            </div>
        </div>
    )
}
