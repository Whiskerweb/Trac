'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, Share2, CreditCard, CheckCircle, Loader2, ExternalLink } from 'lucide-react'
import {
    saveOnboardingStep1,
    saveOnboardingStep2,
    createStripeConnectAccount,
    completeOnboarding,
    getOnboardingStatus
} from '@/app/actions/partner-onboarding'

export default function PartnerOnboardingPage() {
    const router = useRouter()
    const [currentStep, setCurrentStep] = useState(1)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [partnerId, setPartnerId] = useState<string | null>(null)

    // Step 1 state
    const [name, setName] = useState('')
    const [bio, setBio] = useState('')

    // Step 2 state
    const [tiktok, setTiktok] = useState('')
    const [instagram, setInstagram] = useState('')
    const [twitter, setTwitter] = useState('')
    const [youtube, setYoutube] = useState('')
    const [website, setWebsite] = useState('')
    const [profileScore, setProfileScore] = useState(0)

    // Step 3 state
    const [stripeUrl, setStripeUrl] = useState<string | null>(null)

    useEffect(() => {
        async function loadStatus() {
            const result = await getOnboardingStatus('current-user')

            if (!result.success || !result.hasPartner || !result.partner) {
                router.push('/auth/choice')
                return
            }

            setPartnerId(result.partner.id)

            // Resume at last incomplete step
            const step = result.partner.onboardingStep
            if (step >= 4) {
                router.push('/partner')
                return
            }

            setCurrentStep(step + 1)

            // Pre-fill existing data
            if (result.partner.name) setName(result.partner.name)
            if (result.profile) {
                setBio(result.profile.bio || '')
                setTiktok(result.profile.tiktokUrl || '')
                setInstagram(result.profile.instagramUrl || '')
                setTwitter(result.profile.twitterUrl || '')
                setYoutube(result.profile.youtubeUrl || '')
                setWebsite(result.profile.websiteUrl || '')
                setProfileScore(result.profile.profileScore || 0)
            }

            setLoading(false)
        }

        loadStatus()
    }, [router])

    const handleStep1Submit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!partnerId) return

        setSubmitting(true)
        const result = await saveOnboardingStep1({ partnerId, name, bio })

        if (result.success) {
            setCurrentStep(2)
        }
        setSubmitting(false)
    }

    const handleStep2Submit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!partnerId) return

        setSubmitting(true)
        const result = await saveOnboardingStep2({
            partnerId,
            tiktokUrl: tiktok,
            instagramUrl: instagram,
            twitterUrl: twitter,
            youtubeUrl: youtube,
            websiteUrl: website
        })

        if (result.success) {
            setProfileScore(result.profileScore || 0)
            setCurrentStep(3)
        }
        setSubmitting(false)
    }

    const handleStep3Submit = async () => {
        if (!partnerId) return

        setSubmitting(true)
        const result = await createStripeConnectAccount(partnerId)

        if (result.success && result.url) {
            setStripeUrl(result.url)
            // Redirect to Stripe
            window.location.href = result.url
        }
        setSubmitting(false)
    }

    const handleStep4Complete = async () => {
        if (!partnerId) return

        setSubmitting(true)
        await completeOnboarding(partnerId)
        router.push('/partner')
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12 px-6">
            <div className="max-w-2xl mx-auto">
                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        {[1, 2, 3, 4].map((step) => (
                            <div key={step} className="flex items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${step < currentStep
                                    ? 'bg-green-500 text-white'
                                    : step === currentStep
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-slate-200 text-slate-400'
                                    }`}>
                                    {step < currentStep ? <CheckCircle className="w-5 h-5" /> : step}
                                </div>
                                {step < 4 && (
                                    <div className={`w-16 h-1 mx-2 ${step < currentStep ? 'bg-green-500' : 'bg-slate-200'
                                        }`} />
                                )}
                            </div>
                        ))}
                    </div>
                    <p className="text-center text-slate-600 text-sm">
                        Étape {currentStep} sur 4
                    </p>
                </div>

                {/* Step Content */}
                <div className="bg-white rounded-2xl shadow-lg p-8">
                    {currentStep === 1 && (
                        <form onSubmit={handleStep1Submit}>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                    <User className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">Informations de base</h2>
                                    <p className="text-slate-600">Commençons par vous connaître</p>
                                </div>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Nom ou pseudo public
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        placeholder="Ex: Alex Martin"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Bio courte (optionnel)
                                    </label>
                                    <textarea
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        rows={4}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        placeholder="Parlez de vous, votre niche, votre audience..."
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting || !name}
                                className="mt-6 w-full py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continuer'}
                            </button>
                        </form>
                    )}

                    {currentStep === 2 && (
                        <form onSubmit={handleStep2Submit}>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                    <Share2 className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">Réseaux sociaux</h2>
                                    <p className="text-slate-600">Augmentez votre visibilité</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">TikTok</label>
                                    <input
                                        type="url"
                                        value={tiktok}
                                        onChange={(e) => setTiktok(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                                        placeholder="https://tiktok.com/@username"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Instagram</label>
                                    <input
                                        type="url"
                                        value={instagram}
                                        onChange={(e) => setInstagram(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                                        placeholder="https://instagram.com/username"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Twitter/X</label>
                                    <input
                                        type="url"
                                        value={twitter}
                                        onChange={(e) => setTwitter(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                                        placeholder="https://x.com/username"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">YouTube</label>
                                    <input
                                        type="url"
                                        value={youtube}
                                        onChange={(e) => setYoutube(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                                        placeholder="https://youtube.com/@channel"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Site web</label>
                                    <input
                                        type="url"
                                        value={website}
                                        onChange={(e) => setWebsite(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                                        placeholder="https://votre-site.com"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="mt-6 w-full py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continuer'}
                            </button>
                        </form>
                    )}

                    {currentStep === 3 && (
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                    <CreditCard className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">Paiements</h2>
                                    <p className="text-slate-600">Configurez vos versements</p>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-6 mb-6">
                                <h3 className="font-semibold text-slate-900 mb-3">Stripe Connect Express</h3>
                                <p className="text-slate-600 text-sm mb-4">
                                    Nous utilisons Stripe pour gérer les paiements en toute sécurité. Vous serez redirigé vers Stripe pour :
                                </p>
                                <ul className="space-y-2 text-sm text-slate-700">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span>Vérifier votre identité (KYC)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span>Ajouter vos coordonnées bancaires</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span>Accepter les conditions de paiement</span>
                                    </li>
                                </ul>
                            </div>

                            <button
                                onClick={handleStep3Submit}
                                disabled={submitting}
                                className="w-full py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Continuer avec Stripe
                                        <ExternalLink className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {currentStep === 4 && (
                        <div className="text-center">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-3">Configuration terminée !</h2>
                            <p className="text-slate-600 mb-8">
                                Votre compte partenaire est prêt. Vous pouvez maintenant commencer à gagner des commissions.
                            </p>

                            <button
                                onClick={handleStep4Complete}
                                disabled={submitting}
                                className="px-8 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Accéder à mon dashboard'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
