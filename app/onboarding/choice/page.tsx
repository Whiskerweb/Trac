'use client'

import { useState } from 'react'
import { Rocket, Wallet, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createGlobalPartner } from '@/app/actions/partners'
import { createClient } from '@/utils/supabase/client'

export default function OnboardingChoicePage() {
    const router = useRouter()
    const [loading, setLoading] = useState<'startup' | 'partner' | null>(null)

    const handleStartup = () => {
        setLoading('startup')
        router.push('/dashboard/new')
    }

    const handlePartner = async () => {
        setLoading('partner')
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user || !user.email) {
                // If auth lost, redirect to login
                router.push('/login')
                return
            }

            const result = await createGlobalPartner({
                userId: user.id,
                email: user.email,
                name: user.user_metadata?.full_name
            })

            if (result.success) {
                router.push('/partner')
            } else {
                console.error('Failed to create partner account:', result.error)
                // Fallback: stay on page or show error toast
                setLoading(null)
            }
        } catch (error) {
            console.error('Error in partner flow:', error)
            setLoading(null)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-6">
            <div className="max-w-4xl w-full">
                <div className="text-center mb-12">
                    <h1 className="text-3xl font-bold text-slate-900 mb-4">
                        Bienvenue ! Comment souhaitez-vous utiliser Traaaction ?
                    </h1>
                    <p className="text-lg text-slate-600">
                        Choisissez votre profil pour commencer. Vous pourrez toujours changer plus tard.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Startup Card */}
                    <div
                        onClick={() => !loading && handleStartup()}
                        className={`group relative bg-white border-2 border-slate-100 rounded-3xl p-8 hover:border-purple-500 hover:shadow-xl transition-all cursor-pointer ${loading === 'partner' ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                        <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Rocket className="w-8 h-8 text-purple-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-3">
                            Je suis une Startup
                        </h2>
                        <p className="text-slate-600 mb-6">
                            Créez votre programme d'affiliation, invitez des partenaires et boostez votre croissance.
                        </p>
                        <ul className="space-y-3 mb-8">
                            <li className="flex items-center gap-3 text-slate-600">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                <span>Lancer un programme d'affiliation</span>
                            </li>
                            <li className="flex items-center gap-3 text-slate-600">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                <span>Suivre les ventes en temps réel</span>
                            </li>
                            <li className="flex items-center gap-3 text-slate-600">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                <span>Payer automatiquement via Stripe</span>
                            </li>
                        </ul>
                        <div className="flex items-center text-purple-600 font-semibold group-hover:gap-2 transition-all">
                            {loading === 'startup' ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                    Création du compte...
                                </>
                            ) : (
                                <>
                                    Commencer en tant que Startup
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </>
                            )}
                        </div>
                    </div>

                    {/* Partner Card */}
                    <div
                        onClick={() => !loading && handlePartner()}
                        className={`group relative bg-white border-2 border-slate-100 rounded-3xl p-8 hover:border-indigo-500 hover:shadow-xl transition-all cursor-pointer ${loading === 'startup' ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Wallet className="w-8 h-8 text-indigo-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-3">
                            Je suis Partenaire
                        </h2>
                        <p className="text-slate-600 mb-6">
                            Rejoignez des programmes, partagez des liens et gagnez des commissions sur vos ventes.
                        </p>
                        <ul className="space-y-3 mb-8">
                            <li className="flex items-center gap-3 text-slate-600">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                <span>Accès immédiat au Marketplace</span>
                            </li>
                            <li className="flex items-center gap-3 text-slate-600">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                <span>Liens de tracking personnalisés</span>
                            </li>
                            <li className="flex items-center gap-3 text-slate-600">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                <span>Paiements rapides et sécurisés</span>
                            </li>
                        </ul>
                        <div className="flex items-center text-indigo-600 font-semibold group-hover:gap-2 transition-all">
                            {loading === 'partner' ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                    Configuration du compte...
                                </>
                            ) : (
                                <>
                                    Devenir Partenaire
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
