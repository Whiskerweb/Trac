'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ExternalLink, Check, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    saveOnboardingStep1,
    saveOnboardingStep2,
    createStripeConnectAccount,
    completeOnboarding,
    getOnboardingStatus
} from '@/app/actions/seller-onboarding'

const STEPS = [
    { number: 1, label: 'Profil' },
    { number: 2, label: 'Reseaux' },
    { number: 3, label: 'Paiement' },
    { number: 4, label: 'Termine' },
]

export default function SellerOnboardingPage() {
    const router = useRouter()
    const [currentStep, setCurrentStep] = useState(1)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [sellerId, setSellerId] = useState<string | null>(null)
    const [direction, setDirection] = useState(1)

    // Step 1 state
    const [name, setName] = useState('')
    const [bio, setBio] = useState('')

    // Step 2 state
    const [tiktok, setTiktok] = useState('')
    const [instagram, setInstagram] = useState('')
    const [twitter, setTwitter] = useState('')
    const [youtube, setYoutube] = useState('')
    const [website, setWebsite] = useState('')

    // Step 3 state
    const [payoutChoice, setPayoutChoice] = useState<'stripe' | 'wallet' | null>(null)

    useEffect(() => {
        async function loadStatus() {
            const result = await getOnboardingStatus('current-user')

            if (!result.success || !result.hasSeller || !result.seller) {
                router.push('/auth/choice')
                return
            }

            setSellerId(result.seller.id)

            const step = result.seller.onboardingStep
            if (step >= 4) {
                router.push('/seller')
                return
            }

            setCurrentStep(step + 1)

            if (result.seller.name) setName(result.seller.name)
            if (result.profile) {
                setBio(result.profile.bio || '')
                setTiktok(result.profile.tiktokUrl || '')
                setInstagram(result.profile.instagramUrl || '')
                setTwitter(result.profile.twitterUrl || '')
                setYoutube(result.profile.youtubeUrl || '')
                setWebsite(result.profile.websiteUrl || '')
            }

            setLoading(false)
        }

        loadStatus()
    }, [router])

    const goToStep = (step: number) => {
        setDirection(step > currentStep ? 1 : -1)
        setCurrentStep(step)
    }

    const handleStep1Submit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!sellerId) return

        setSubmitting(true)
        const result = await saveOnboardingStep1({ sellerId, name, bio })

        if (result.success) {
            goToStep(2)
        }
        setSubmitting(false)
    }

    const handleStep2Submit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!sellerId) return

        setSubmitting(true)
        const result = await saveOnboardingStep2({
            sellerId,
            tiktokUrl: tiktok,
            instagramUrl: instagram,
            twitterUrl: twitter,
            youtubeUrl: youtube,
            websiteUrl: website
        })

        if (result.success) {
            goToStep(3)
        }
        setSubmitting(false)
    }

    const handleStep3Submit = async () => {
        if (!sellerId || !payoutChoice) return

        setSubmitting(true)

        try {
            if (payoutChoice === 'stripe') {
                const result = await createStripeConnectAccount(sellerId)
                if (result.success && result.url) {
                    window.location.href = result.url
                }
            } else {
                const { updatePayoutMethod } = await import('@/app/actions/sellers')
                const result = await updatePayoutMethod(sellerId, 'PLATFORM')
                if (result.success) {
                    goToStep(4)
                }
            }
        } catch (error) {
            console.error('[Onboarding] Error:', error)
        } finally {
            setSubmitting(false)
        }
    }

    const handleStep4Complete = async () => {
        if (!sellerId) return

        setSubmitting(true)
        await completeOnboarding(sellerId)
        router.push('/seller')
    }

    const slideVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 100 : -100,
            opacity: 0
        }),
        center: {
            x: 0,
            opacity: 1
        },
        exit: (direction: number) => ({
            x: direction < 0 ? 100 : -100,
            opacity: 0
        })
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-4"
                >
                    <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                    <span className="text-xs text-neutral-400 tracking-wide">Loading</span>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Progress bar */}
            <div className="fixed top-0 left-0 right-0 h-0.5 bg-neutral-100 z-50">
                <motion.div
                    className="h-full bg-neutral-900"
                    initial={{ width: '0%' }}
                    animate={{ width: `${(currentStep / 4) * 100}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                />
            </div>

            <div className="max-w-lg mx-auto px-6 py-16">
                {/* Step indicator */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-center gap-8 mb-16"
                >
                    {STEPS.map((step, index) => (
                        <div key={step.number} className="flex items-center">
                            <div className="flex flex-col items-center">
                                <span className={`text-sm tabular-nums transition-colors duration-300 ${
                                    currentStep >= step.number
                                        ? 'text-neutral-900 font-medium'
                                        : 'text-neutral-300'
                                }`}>
                                    {step.number}
                                </span>
                                <span className={`text-[10px] uppercase tracking-wider mt-1 transition-colors duration-300 ${
                                    currentStep >= step.number
                                        ? 'text-neutral-500'
                                        : 'text-neutral-300'
                                }`}>
                                    {step.label}
                                </span>
                            </div>
                            {index < STEPS.length - 1 && (
                                <div className={`w-12 h-px mx-4 transition-colors duration-300 ${
                                    currentStep > step.number
                                        ? 'bg-neutral-900'
                                        : 'bg-neutral-200'
                                }`} />
                            )}
                        </div>
                    ))}
                </motion.div>

                {/* Content */}
                <AnimatePresence mode="wait" custom={direction}>
                    {currentStep === 1 && (
                        <motion.form
                            key="step1"
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            onSubmit={handleStep1Submit}
                        >
                            <div className="text-center mb-12">
                                <h1 className="text-3xl font-light text-neutral-900 mb-3">
                                    Welcome
                                </h1>
                                <p className="text-neutral-400">
                                    Presentez-vous en quelques mots
                                </p>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-3">
                                        Nom ou pseudo
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        className="w-full px-0 py-3 bg-transparent border-0 border-b border-neutral-200 text-neutral-900 text-lg focus:outline-none focus:border-neutral-900 transition-colors placeholder:text-neutral-300"
                                        placeholder="Comment souhaitez-vous etre appele ?"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-3">
                                        Bio
                                        <span className="normal-case tracking-normal ml-2 text-neutral-300">optionnel</span>
                                    </label>
                                    <textarea
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        rows={3}
                                        className="w-full px-0 py-3 bg-transparent border-0 border-b border-neutral-200 text-neutral-900 focus:outline-none focus:border-neutral-900 transition-colors placeholder:text-neutral-300 resize-none"
                                        placeholder="Votre audience, votre niche..."
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting || !name}
                                className="mt-12 w-full py-4 bg-neutral-900 text-white text-sm tracking-wide rounded-full hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        Continuer
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </motion.form>
                    )}

                    {currentStep === 2 && (
                        <motion.form
                            key="step2"
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            onSubmit={handleStep2Submit}
                        >
                            <div className="text-center mb-12">
                                <h1 className="text-3xl font-light text-neutral-900 mb-3">
                                    Vos reseaux
                                </h1>
                                <p className="text-neutral-400">
                                    Aidez les startups a vous connaitre
                                </p>
                            </div>

                            <div className="space-y-5">
                                {[
                                    { label: 'TikTok', value: tiktok, setter: setTiktok, placeholder: 'tiktok.com/@...' },
                                    { label: 'Instagram', value: instagram, setter: setInstagram, placeholder: 'instagram.com/...' },
                                    { label: 'X / Twitter', value: twitter, setter: setTwitter, placeholder: 'x.com/...' },
                                    { label: 'YouTube', value: youtube, setter: setYoutube, placeholder: 'youtube.com/@...' },
                                    { label: 'Site web', value: website, setter: setWebsite, placeholder: 'votre-site.com' },
                                ].map((field) => (
                                    <div key={field.label}>
                                        <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-2">
                                            {field.label}
                                        </label>
                                        <input
                                            type="url"
                                            value={field.value}
                                            onChange={(e) => field.setter(e.target.value)}
                                            className="w-full px-0 py-2.5 bg-transparent border-0 border-b border-neutral-200 text-neutral-900 focus:outline-none focus:border-neutral-900 transition-colors placeholder:text-neutral-300 text-sm"
                                            placeholder={field.placeholder}
                                        />
                                    </div>
                                ))}
                            </div>

                            <p className="text-xs text-neutral-400 text-center mt-8">
                                Vous pouvez passer cette etape et completer plus tard
                            </p>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="mt-6 w-full py-4 bg-neutral-900 text-white text-sm tracking-wide rounded-full hover:bg-neutral-800 disabled:bg-neutral-200 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        Continuer
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </motion.form>
                    )}

                    {currentStep === 3 && (
                        <motion.div
                            key="step3"
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                        >
                            <div className="text-center mb-12">
                                <h1 className="text-3xl font-light text-neutral-900 mb-3">
                                    Vos gains
                                </h1>
                                <p className="text-neutral-400">
                                    Choisissez comment recevoir vos commissions
                                </p>
                            </div>

                            <div className="space-y-4">
                                {/* Stripe Option */}
                                <button
                                    onClick={() => setPayoutChoice('stripe')}
                                    className={`w-full p-6 rounded-2xl border text-left transition-all duration-300 ${
                                        payoutChoice === 'stripe'
                                            ? 'border-neutral-900 bg-neutral-50'
                                            : 'border-neutral-200 hover:border-neutral-300'
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-medium text-neutral-900">
                                                    Virement bancaire
                                                </h3>
                                                <span className="text-[10px] uppercase tracking-wider text-neutral-400 px-2 py-0.5 bg-neutral-100 rounded">
                                                    Recommande
                                                </span>
                                            </div>
                                            <p className="text-sm text-neutral-500 mb-4">
                                                Recevez automatiquement vos gains sur votre compte
                                            </p>
                                            <ul className="space-y-2">
                                                {[
                                                    'Transferts automatiques',
                                                    'Delai 2-3 jours',
                                                    'Verification KYC securisee'
                                                ].map((item) => (
                                                    <li key={item} className="flex items-center gap-2 text-xs text-neutral-600">
                                                        <span className="w-1 h-1 rounded-full bg-neutral-400" />
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                            payoutChoice === 'stripe'
                                                ? 'border-neutral-900 bg-neutral-900'
                                                : 'border-neutral-300'
                                        }`}>
                                            {payoutChoice === 'stripe' && (
                                                <Check className="w-3 h-3 text-white" />
                                            )}
                                        </div>
                                    </div>
                                </button>

                                {/* Wallet Option */}
                                <button
                                    onClick={() => setPayoutChoice('wallet')}
                                    className={`w-full p-6 rounded-2xl border text-left transition-all duration-300 ${
                                        payoutChoice === 'wallet'
                                            ? 'border-neutral-900 bg-neutral-50'
                                            : 'border-neutral-200 hover:border-neutral-300'
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-medium text-neutral-900 mb-2">
                                                Wallet Traaaction
                                            </h3>
                                            <p className="text-sm text-neutral-500 mb-4">
                                                Accumulez et echangez contre des cartes cadeaux
                                            </p>
                                            <ul className="space-y-2">
                                                {[
                                                    'Amazon, Netflix, Spotify...',
                                                    'Pas de verification requise',
                                                    'Connectez Stripe plus tard'
                                                ].map((item) => (
                                                    <li key={item} className="flex items-center gap-2 text-xs text-neutral-600">
                                                        <span className="w-1 h-1 rounded-full bg-neutral-400" />
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                            payoutChoice === 'wallet'
                                                ? 'border-neutral-900 bg-neutral-900'
                                                : 'border-neutral-300'
                                        }`}>
                                            {payoutChoice === 'wallet' && (
                                                <Check className="w-3 h-3 text-white" />
                                            )}
                                        </div>
                                    </div>
                                </button>
                            </div>

                            <button
                                onClick={handleStep3Submit}
                                disabled={submitting || !payoutChoice}
                                className="mt-8 w-full py-4 bg-neutral-900 text-white text-sm tracking-wide rounded-full hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : payoutChoice === 'stripe' ? (
                                    <>
                                        Configurer Stripe
                                        <ExternalLink className="w-4 h-4" />
                                    </>
                                ) : (
                                    <>
                                        Continuer
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </motion.div>
                    )}

                    {currentStep === 4 && (
                        <motion.div
                            key="step4"
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="text-center"
                        >
                            {/* Animated checkmark */}
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
                                className="w-20 h-20 rounded-full bg-neutral-900 flex items-center justify-center mx-auto mb-8"
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    <Check className="w-10 h-10 text-white" strokeWidth={1.5} />
                                </motion.div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                            >
                                <h1 className="text-3xl font-light text-neutral-900 mb-3">
                                    Tout est pret
                                </h1>
                                <p className="text-neutral-400 mb-12">
                                    Votre compte est configure. Decouvrez les programmes et commencez a gagner.
                                </p>

                                <button
                                    onClick={handleStep4Complete}
                                    disabled={submitting}
                                    className="px-8 py-4 bg-neutral-900 text-white text-sm tracking-wide rounded-full hover:bg-neutral-800 disabled:bg-neutral-200 disabled:cursor-not-allowed transition-all inline-flex items-center gap-2"
                                >
                                    {submitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            Acceder au dashboard
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
