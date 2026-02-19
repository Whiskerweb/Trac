'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, ExternalLink, Check, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    saveOnboardingStep1,
    saveOnboardingStep2,
    createStripeConnectAccount,
    completeOnboarding,
    getOnboardingStatus
} from '@/app/actions/seller-onboarding'
import { createGlobalSeller } from '@/app/actions/sellers'
import { TraaactionLoader } from '@/components/ui/TraaactionLoader'

const STEPS = [
    { number: 1, label: 'Profile' },
    { number: 2, label: 'Networks' },
    { number: 3, label: 'Payment' },
    { number: 4, label: 'Done' },
]

export default function SellerOnboardingPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    // Detect new signup: ?new=1 from callback OR trac_signup_role cookie from signup action
    // Cookie check is a safety net for when callback doesn't pass ?new=1 (e.g. old code on production)
    const hasNewParam = searchParams.get('new') === '1'
    const hasSignupCookie = typeof document !== 'undefined' && document.cookie.includes('trac_signup_role=seller')
    const isNewSignup = hasNewParam || hasSignupCookie
    const [currentStep, setCurrentStep] = useState(1)
    const [loading, setLoading] = useState(!isNewSignup) // If new signup, show step 1 immediately
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
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    // Load seller data — if ?new=1, this runs in the background while step 1 is already visible
    useEffect(() => {
        // Safety net: if no seller record exists, create one automatically
        // This prevents the /seller → /seller/onboarding → /seller loop
        async function autoCreateSeller() {
            try {
                const { createClient } = await import('@/utils/supabase/client')
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    console.error('[Seller Onboarding] Cannot auto-create: not authenticated')
                    return
                }
                console.log('[Seller Onboarding] Auto-creating seller for:', user.id)
                const result = await createGlobalSeller({
                    userId: user.id,
                    email: user.email || '',
                    name: user.user_metadata?.full_name || user.user_metadata?.name || ''
                })
                if (result.success) {
                    console.log('[Seller Onboarding] Seller auto-created, reloading...')
                    // Reload to pick up the new seller record
                    window.location.reload()
                } else {
                    console.error('[Seller Onboarding] Auto-create failed:', result.error)
                    setErrorMsg('Unable to create your account. Please try again.')
                    setLoading(false)
                }
            } catch (err) {
                console.error('[Seller Onboarding] Auto-create exception:', err)
                setErrorMsg('Unable to create your account. Please try again.')
                setLoading(false)
            }
        }

        async function loadStatus(retries = isNewSignup ? 10 : 5) {
            let result
            try {
                result = await getOnboardingStatus('current-user')
            } catch (err) {
                console.error('[Seller Onboarding] Error loading status:', err)
                if (retries > 0) {
                    await new Promise(r => setTimeout(r, 2000))
                    return loadStatus(retries - 1)
                }
                // All retries failed — try to auto-create the seller record
                await autoCreateSeller()
                return
            }

            if (!result.success || !result.hasSeller || !result.seller) {
                // Retry: seller may have just been created in the auth callback
                // DB replication lag (PgBouncer) can cause the read to miss the newly created record
                if (retries > 0) {
                    console.log(`[Seller Onboarding] Seller not found yet (${result.error || 'no seller'}), retrying in 2s... (${retries} left)`)
                    await new Promise(r => setTimeout(r, 2000))
                    return loadStatus(retries - 1)
                }
                // All retries exhausted — auto-create the seller record as safety net
                console.log('[Seller Onboarding] Seller not found after retries, auto-creating...')
                await autoCreateSeller()
                return
            }

            setSellerId(result.seller.id)

            // Clean up signup role cookie (seller successfully loaded)
            document.cookie = 'trac_signup_role=; path=/; max-age=0'

            const step = result.seller.onboardingStep
            if (step >= 4) {
                router.push('/seller')
                return
            }

            // Only override step/fields if NOT a new signup showing step 1 already
            if (!isNewSignup || loading) {
                setCurrentStep(step + 1)
            }

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
    }, [router, isNewSignup])

    const goToStep = (step: number) => {
        setDirection(step > currentStep ? 1 : -1)
        setCurrentStep(step)
    }

    const handleStep1Submit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        setErrorMsg(null)

        try {
            // If sellerId not yet resolved (background fetch still running for ?new=1),
            // wait for it with polling (max 20s)
            let resolvedId = sellerId
            if (!resolvedId) {
                for (let i = 0; i < 10; i++) {
                    await new Promise(r => setTimeout(r, 2000))
                    try {
                        const status = await getOnboardingStatus('current-user')
                        if (status.success && status.seller?.id) {
                            resolvedId = status.seller.id
                            setSellerId(resolvedId)
                            break
                        }
                    } catch { /* retry */ }
                }
            }

            if (!resolvedId) {
                console.error('[Seller Onboarding] Could not resolve seller ID after retries')
                setErrorMsg('Unable to load your account. Please refresh the page and try again.')
                setSubmitting(false)
                return
            }

            console.log('[Seller Onboarding] Saving step 1 for seller:', resolvedId)
            const result = await saveOnboardingStep1({ sellerId: resolvedId, name, bio })

            if (result.success) {
                console.log('[Seller Onboarding] Step 1 saved, going to step 2')
                goToStep(2)
            } else {
                console.error('[Seller Onboarding] Step 1 failed:', result.error)
                setErrorMsg(result.error || 'Failed to save. Please try again.')
            }
        } catch (err) {
            console.error('[Seller Onboarding] Step 1 exception:', err)
            setErrorMsg('An unexpected error occurred. Please try again.')
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
                    <TraaactionLoader size={20} className="text-gray-400" />
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
                                    Tell us a bit about yourself
                                </p>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-3">
                                        Name or username
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        className="w-full px-0 py-3 bg-transparent border-0 border-b border-neutral-200 text-neutral-900 text-lg focus:outline-none focus:border-neutral-900 transition-colors placeholder:text-neutral-300"
                                        placeholder="What would you like to be called?"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-3">
                                        Bio
                                        <span className="normal-case tracking-normal ml-2 text-neutral-300">optional</span>
                                    </label>
                                    <textarea
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        rows={3}
                                        className="w-full px-0 py-3 bg-transparent border-0 border-b border-neutral-200 text-neutral-900 focus:outline-none focus:border-neutral-900 transition-colors placeholder:text-neutral-300 resize-none"
                                        placeholder="Your audience, your niche..."
                                    />
                                </div>
                            </div>

                            {errorMsg && (
                                <p className="mt-6 text-sm text-red-500 text-center">{errorMsg}</p>
                            )}

                            <button
                                type="submit"
                                disabled={submitting || !name}
                                className="mt-12 w-full py-4 bg-neutral-900 text-white text-sm tracking-wide rounded-full hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        Continue
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
                                    Your networks
                                </h1>
                                <p className="text-neutral-400">
                                    Help startups get to know you
                                </p>
                            </div>

                            <div className="space-y-5">
                                {[
                                    { label: 'TikTok', value: tiktok, setter: setTiktok, placeholder: 'tiktok.com/@...' },
                                    { label: 'Instagram', value: instagram, setter: setInstagram, placeholder: 'instagram.com/...' },
                                    { label: 'X / Twitter', value: twitter, setter: setTwitter, placeholder: 'x.com/...' },
                                    { label: 'YouTube', value: youtube, setter: setYoutube, placeholder: 'youtube.com/@...' },
                                    { label: 'Website', value: website, setter: setWebsite, placeholder: 'your-website.com' },
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
                                You can skip this step and complete later
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
                                        Continue
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
                                    Your earnings
                                </h1>
                                <p className="text-neutral-400">
                                    Choose how to receive your commissions
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
                                                    Bank transfer
                                                </h3>
                                                <span className="text-[10px] uppercase tracking-wider text-neutral-400 px-2 py-0.5 bg-neutral-100 rounded">
                                                    Recommended
                                                </span>
                                            </div>
                                            <p className="text-sm text-neutral-500 mb-4">
                                                Receive your earnings automatically to your account
                                            </p>
                                            <ul className="space-y-2">
                                                {[
                                                    'Automatic transfers',
                                                    '2-3 days delay',
                                                    'Secure KYC verification'
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
                                                Traaaction Wallet
                                            </h3>
                                            <p className="text-sm text-neutral-500 mb-4">
                                                Accumulate and exchange for gift cards
                                            </p>
                                            <ul className="space-y-2">
                                                {[
                                                    'Amazon, Netflix, Spotify...',
                                                    'No verification required',
                                                    'Connect Stripe later'
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
                                        Setup Stripe
                                        <ExternalLink className="w-4 h-4" />
                                    </>
                                ) : (
                                    <>
                                        Continue
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
                                    All set
                                </h1>
                                <p className="text-neutral-400 mb-12">
                                    Your account is set up. Discover programs and start earning.
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
                                            Go to dashboard
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
