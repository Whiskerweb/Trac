'use client'

import { useState, useEffect } from 'react'
import { Check, Loader2, Settings, LogOut, Eye, EyeOff, AlertTriangle, X, CreditCard, ExternalLink, Unlink, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { getMySellerProfile, getMyStripeAccountInfo, getStripeAccountLink, disconnectStripeAccount, createNewStripeAccount, type StripeAccountInfo } from '@/app/actions/sellers'
import { logout } from '@/app/login/actions'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { fadeInUp, staggerContainer, springGentle, modalOverlayVariants, modalContentVariants } from '@/lib/animations'
import { TraaactionLoader } from '@/components/ui/TraaactionLoader'

// Reusable card component
function SettingsCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <motion.div
            variants={fadeInUp}
            transition={springGentle}
            className={`bg-white rounded-2xl border border-neutral-200/60 shadow-sm card-hover ${className}`}
        >
            {children}
        </motion.div>
    )
}

export default function SettingsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showPasswordForm, setShowPasswordForm] = useState(false)
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [savingPassword, setSavingPassword] = useState(false)
    const [passwordError, setPasswordError] = useState('')
    const [passwordSuccess, setPasswordSuccess] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState('')
    const [stripeAccount, setStripeAccount] = useState<StripeAccountInfo | null>(null)
    const [loadingStripe, setLoadingStripe] = useState(false)
    const [stripeAction, setStripeAction] = useState<'connecting' | 'disconnecting' | 'dashboard' | null>(null)
    const [showDisconnectModal, setShowDisconnectModal] = useState(false)
    const [email, setEmail] = useState('')

    useEffect(() => {
        async function loadProfile() {
            try {
                const result = await getMySellerProfile()
                if (result.success && result.profile) {
                    setEmail(result.profile.email || '')
                } else {
                    setError(result.error || 'Failed to load')
                }
            } catch (err) {
                setError('Failed to load')
            } finally {
                setLoading(false)
            }
        }
        loadProfile()
        loadStripeInfo()
    }, [])

    async function loadStripeInfo() {
        setLoadingStripe(true)
        try {
            const result = await getMyStripeAccountInfo()
            if (result.success && result.account) setStripeAccount(result.account)
        } catch (err) {
            console.error('Error loading Stripe info:', err)
        } finally {
            setLoadingStripe(false)
        }
    }

    async function handleStripeAction(action: 'connect' | 'dashboard' | 'onboarding') {
        if (action === 'connect') {
            setStripeAction('connecting')
            try {
                const result = await createNewStripeAccount()
                if (result.success && result.onboardingUrl) window.location.href = result.onboardingUrl
                else setError(result.error || 'Failed to create Stripe account')
            } catch (err) {
                setError('Failed to connect Stripe')
            }
            setStripeAction(null)
        } else if (action === 'dashboard') {
            setStripeAction('dashboard')
            try {
                const result = await getStripeAccountLink('dashboard')
                if (result.success && result.url) window.open(result.url, '_blank')
                else setError(result.error || 'Failed to open dashboard')
            } catch (err) {
                setError('Failed to open Stripe dashboard')
            }
            setStripeAction(null)
        } else if (action === 'onboarding') {
            setStripeAction('connecting')
            try {
                const result = await getStripeAccountLink('onboarding')
                if (result.success && result.url) window.location.href = result.url
                else setError(result.error || 'Failed to continue setup')
            } catch (err) {
                setError('Failed to continue Stripe setup')
            }
            setStripeAction(null)
        }
    }

    async function handleDisconnectStripe() {
        setStripeAction('disconnecting')
        try {
            const result = await disconnectStripeAccount()
            if (result.success) {
                setStripeAccount({ connected: false, payoutsEnabled: false, chargesEnabled: false, detailsSubmitted: false, requiresAction: false, pendingVerification: false })
                setShowDisconnectModal(false)
            } else {
                setError(result.error || 'Failed to disconnect')
            }
        } catch (err) {
            setError('Failed to disconnect Stripe')
        }
        setStripeAction(null)
    }

    async function handleChangePassword() {
        setPasswordError('')
        setPasswordSuccess(false)
        if (newPassword.length < 6) { setPasswordError('Password must be at least 6 characters'); return }
        if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match'); return }
        setSavingPassword(true)
        try {
            const supabase = createClient()
            const { error } = await supabase.auth.updateUser({ password: newPassword })
            if (error) setPasswordError(error.message)
            else {
                setPasswordSuccess(true)
                setNewPassword('')
                setConfirmPassword('')
                setShowPasswordForm(false)
                setTimeout(() => setPasswordSuccess(false), 3000)
            }
        } catch (e) {
            setPasswordError('Failed to change password')
        }
        setSavingPassword(false)
    }

    async function handleDeleteAccount() {
        if (deleteConfirmText !== 'DELETE') { setDeleteError('Please type DELETE to confirm'); return }
        setDeleting(true)
        setDeleteError('')
        try {
            const response = await fetch('/api/seller/delete-account', { method: 'DELETE' })
            const data = await response.json()
            if (data.success) {
                const supabase = createClient()
                await supabase.auth.signOut()
                router.push('/login?deleted=true')
            } else {
                setDeleteError(data.error || 'Failed to delete account')
            }
        } catch (e) {
            setDeleteError('Failed to delete account')
        }
        setDeleting(false)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FAFAFA]">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                    <div className="space-y-6">
                        <div>
                            <div className="h-7 w-40 rounded-lg skeleton-shimmer" />
                            <div className="h-4 w-72 rounded-lg skeleton-shimmer mt-2" />
                        </div>
                        <div className="h-48 rounded-2xl skeleton-shimmer" />
                        <div className="h-56 rounded-2xl skeleton-shimmer" />
                        <div className="h-28 rounded-2xl skeleton-shimmer" />
                        <div className="h-28 rounded-2xl skeleton-shimmer" />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="min-h-screen bg-[#FAFAFA]">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

                {/* Header */}
                <motion.div
                    variants={fadeInUp}
                    transition={springGentle}
                    className="mb-8"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center">
                            <Settings className="w-5 h-5 text-neutral-600" />
                        </div>
                        <h1 className="text-[28px] font-semibold text-neutral-900 tracking-tight">
                            Settings
                        </h1>
                    </div>
                    <p className="text-[15px] text-neutral-500">
                        Manage your account and payment settings
                    </p>
                </motion.div>

                {/* Error Message */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -10, height: 0 }}
                            className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-[14px] text-red-600 flex items-center gap-3"
                        >
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            {error}
                            <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 rounded-lg transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="space-y-6">
                    {/* Email & Password */}
                    <SettingsCard>
                        <div className="p-6">
                            <h2 className="text-[15px] font-semibold text-neutral-900 mb-6">Account settings</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[13px] font-medium text-neutral-700 mb-2">Email</label>
                                    <input type="email" value={email} disabled className="w-full h-11 px-4 bg-neutral-100 border border-neutral-200 rounded-xl text-[15px] text-neutral-500 cursor-not-allowed" />
                                </div>

                                <div>
                                    <label className="block text-[13px] font-medium text-neutral-700 mb-2">Password</label>
                                    {!showPasswordForm ? (
                                        <button onClick={() => setShowPasswordForm(true)} className="h-11 px-5 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-[14px] font-medium text-neutral-700 transition-colors btn-press">
                                            Change password
                                        </button>
                                    ) : (
                                        <div className="space-y-3 max-w-sm">
                                            {passwordError && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[13px] text-red-600">{passwordError}</div>}
                                            <div className="relative">
                                                <input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" className="w-full h-11 px-4 pr-11 bg-neutral-50/50 border border-neutral-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-neutral-900/5 focus:border-neutral-300" />
                                                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                                                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                            <div className="relative">
                                                <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" className="w-full h-11 px-4 pr-11 bg-neutral-50/50 border border-neutral-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-neutral-900/5 focus:border-neutral-300" />
                                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                            <div className="flex gap-2 pt-1">
                                                <button onClick={handleChangePassword} disabled={savingPassword} className="h-10 px-4 bg-neutral-900 text-white rounded-xl text-[13px] font-medium hover:bg-neutral-800 disabled:opacity-70 transition-colors flex items-center gap-2 btn-press">
                                                    {savingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                                                    Update
                                                </button>
                                                <button onClick={() => { setShowPasswordForm(false); setNewPassword(''); setConfirmPassword(''); setPasswordError('') }} className="h-10 px-4 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-[13px] font-medium text-neutral-700 transition-colors btn-press">
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {passwordSuccess && <p className="mt-2 text-[13px] text-emerald-600 flex items-center gap-1"><Check className="w-4 h-4" /> Password updated</p>}
                                </div>
                            </div>
                        </div>
                    </SettingsCard>

                    {/* Payment Method */}
                    <SettingsCard>
                        <div className="p-6">
                            <h2 className="text-[15px] font-semibold text-neutral-900 mb-1">Payment method</h2>
                            <p className="text-[13px] text-neutral-500 mb-6">Connect Stripe to receive payouts to your bank</p>

                            {loadingStripe ? (
                                <div className="flex items-center gap-3 py-6">
                                    <TraaactionLoader size={20} className="text-gray-400" />
                                    <span className="text-[14px] text-neutral-500">Loading...</span>
                                </div>
                            ) : stripeAccount?.connected ? (
                                <div>
                                    <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stripeAccount.payoutsEnabled ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                                                {stripeAccount.payoutsEnabled ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <Clock className="w-5 h-5 text-amber-600" />}
                                            </div>
                                            <div>
                                                <p className="text-[14px] font-medium text-neutral-900">Stripe Connect</p>
                                                <p className="text-[13px] text-neutral-500">{stripeAccount.email || 'Connected'}</p>
                                            </div>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-[12px] font-medium badge-pop ${stripeAccount.payoutsEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {stripeAccount.payoutsEnabled ? 'Active' : 'Pending'}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {!stripeAccount.payoutsEnabled && (
                                            <button onClick={() => handleStripeAction('onboarding')} disabled={stripeAction === 'connecting'} className="h-10 px-4 bg-neutral-900 text-white rounded-xl text-[13px] font-medium hover:bg-neutral-800 disabled:opacity-70 transition-colors flex items-center gap-2 btn-press">
                                                {stripeAction === 'connecting' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                                Complete setup
                                            </button>
                                        )}
                                        <button onClick={() => handleStripeAction('dashboard')} disabled={stripeAction === 'dashboard'} className="h-10 px-4 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-[13px] font-medium text-neutral-700 transition-colors flex items-center gap-2 btn-press">
                                            {stripeAction === 'dashboard' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                                            Dashboard
                                        </button>
                                        <button onClick={() => setShowDisconnectModal(true)} className="h-10 px-4 text-red-600 hover:bg-red-50 rounded-xl text-[13px] font-medium transition-colors flex items-center gap-2 btn-press">
                                            <Unlink className="w-4 h-4" />
                                            Disconnect
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-neutral-900 rounded-2xl p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                            <CreditCard className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-[14px] font-medium text-white">Connect Stripe</h3>
                                            <p className="text-[13px] text-neutral-400">Get paid to your bank</p>
                                        </div>
                                    </div>
                                    <ul className="space-y-2 mb-5">
                                        {['Auto payouts at €10', 'Direct bank transfers', 'Secure & fast'].map((item, i) => (
                                            <li key={i} className="flex items-center gap-2 text-[13px] text-neutral-300">
                                                <Check className="w-4 h-4 text-emerald-400" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                    <button onClick={() => handleStripeAction('connect')} disabled={stripeAction === 'connecting'} className="w-full h-11 bg-white text-neutral-900 rounded-xl text-[14px] font-semibold hover:bg-neutral-100 disabled:opacity-70 transition-colors flex items-center justify-center gap-2 btn-press">
                                        {stripeAction === 'connecting' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                                        {stripeAction === 'connecting' ? 'Connecting...' : 'Connect Stripe'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </SettingsCard>

                    {/* Sign Out */}
                    <SettingsCard>
                        <div className="p-6">
                            <h2 className="text-[15px] font-semibold text-neutral-900 mb-1">Sign out</h2>
                            <p className="text-[13px] text-neutral-500 mb-4">Sign out of your account on this device</p>
                            <form action={logout}>
                                <button type="submit" className="h-10 px-4 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-[13px] font-medium text-neutral-700 transition-colors flex items-center gap-2 btn-press">
                                    <LogOut className="w-4 h-4" />
                                    Sign out
                                </button>
                            </form>
                        </div>
                    </SettingsCard>

                    {/* Danger Zone */}
                    <SettingsCard className="border-red-200/60">
                        <div className="p-6">
                            <h2 className="text-[15px] font-semibold text-red-600 mb-1">Danger zone</h2>
                            <p className="text-[13px] text-neutral-500 mb-4">Irreversible actions</p>
                            <button onClick={() => setShowDeleteModal(true)} className="h-10 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[13px] font-medium transition-colors btn-press">
                                Delete account
                            </button>
                        </div>
                    </SettingsCard>
                </div>

                {/* Delete Modal */}
                <AnimatePresence>
                    {showDeleteModal && (
                        <motion.div
                            variants={modalOverlayVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                            onClick={() => !deleting && setShowDeleteModal(false)}
                        >
                            <motion.div
                                variants={modalContentVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
                            >
                                <div className="p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                            <AlertTriangle className="w-5 h-5 text-red-600" />
                                        </div>
                                        <h2 className="text-[17px] font-semibold text-neutral-900">Delete account</h2>
                                    </div>
                                    <p className="text-[14px] text-neutral-600 mb-4">This action cannot be undone. All your data will be permanently deleted.</p>
                                    {deleteError && <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-[13px] text-red-600">{deleteError}</div>}
                                    <div className="mb-4">
                                        <label className="block text-[13px] font-medium text-neutral-700 mb-2">Type <span className="font-mono bg-neutral-100 px-1.5 py-0.5 rounded text-red-600">DELETE</span> to confirm</label>
                                        <input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="DELETE" className="w-full h-11 px-4 bg-neutral-50/50 border border-neutral-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300" disabled={deleting} />
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); setDeleteError('') }} disabled={deleting} className="flex-1 h-11 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-[14px] font-medium text-neutral-700 transition-colors disabled:opacity-50">Cancel</button>
                                        <button onClick={handleDeleteAccount} disabled={deleting || deleteConfirmText !== 'DELETE'} className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[14px] font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                            {deleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : 'Delete'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Disconnect Stripe Modal */}
                <AnimatePresence>
                    {showDisconnectModal && (
                        <motion.div
                            variants={modalOverlayVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                            onClick={() => stripeAction !== 'disconnecting' && setShowDisconnectModal(false)}
                        >
                            <motion.div
                                variants={modalContentVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
                            >
                                <div className="p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                            <Unlink className="w-5 h-5 text-red-600" />
                                        </div>
                                        <h2 className="text-[17px] font-semibold text-neutral-900">Disconnect Stripe</h2>
                                    </div>
                                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-4">
                                        <p className="text-[13px] text-amber-800">Future earnings will go to your wallet. Current balance is not affected.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => setShowDisconnectModal(false)} disabled={stripeAction === 'disconnecting'} className="flex-1 h-11 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-[14px] font-medium text-neutral-700 transition-colors disabled:opacity-50">Cancel</button>
                                        <button onClick={handleDisconnectStripe} disabled={stripeAction === 'disconnecting'} className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[14px] font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                            {stripeAction === 'disconnecting' ? <><Loader2 className="w-4 h-4 animate-spin" /> Disconnecting...</> : 'Disconnect'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}
