'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, AlertTriangle, Shield, Send } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'next-intl'

const abuseTypeKeys = ['phishing', 'malware', 'spam', 'fraud', 'impersonation', 'adult', 'gambling', 'copyright', 'harassment', 'other'] as const

export default function ReportAbusePage() {
    const t = useTranslations('reportAbuse')

    const [formData, setFormData] = useState({
        reporterEmail: '',
        abuseType: '',
        url: '',
        description: '',
    })
    const [submitted, setSubmitted] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        const typeLabel = formData.abuseType ? t(`form.typeOptions.${formData.abuseType}`) : formData.abuseType
        const subject = encodeURIComponent(`[Abuse Report] ${typeLabel}`)
        const body = encodeURIComponent(
            `Abuse Report\n\n` +
            `Reporter Email: ${formData.reporterEmail}\n` +
            `Abuse Type: ${typeLabel}\n` +
            `Reported URL: ${formData.url}\n\n` +
            `Description:\n${formData.description}`
        )

        window.location.href = `mailto:abuse@traaaction.com?subject=${subject}&body=${body}`

        setTimeout(() => {
            setSubmitted(true)
            setSubmitting(false)
        }, 500)
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA] text-slate-900 selection:bg-red-500/20">
            <div className="fixed inset-0 pointer-events-none opacity-30">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-red-100/40 to-transparent rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-slate-100/50 to-transparent rounded-full blur-3xl" />
            </div>

            <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span>{t('backToHome')}</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <Image src="/Logotrac/Logo5.png" alt="Traaaction" width={24} height={24} className="rounded-md" />
                        <span className="text-sm font-medium text-slate-500">Report</span>
                    </div>
                </div>
            </header>

            <main className="pt-20">
                <div className="px-6 lg:px-16 pt-16 pb-20 bg-white border-b border-slate-200/50">
                    <div className="max-w-2xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-medium mb-8">
                            <AlertTriangle className="w-3 h-3" />
                            {t('badge')}
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
                            {t('title')}
                            <span className="block text-slate-300">{t('titleAccent')}</span>
                        </h1>
                        <p className="text-lg text-slate-500 leading-relaxed max-w-xl">
                            {t('subtitle')}
                        </p>
                    </div>
                </div>

                <div className="px-6 lg:px-16 py-16">
                    <div className="max-w-2xl mx-auto">
                        {/* Info section */}
                        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm mb-12">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                                    <Shield className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-slate-800 mb-2">{t('whatWeConsider')}</h2>
                                    <p className="text-sm text-slate-500 mb-4">{t('whatWeConsiderDesc')}</p>
                                    <div className="grid sm:grid-cols-2 gap-2">
                                        {(['phishing', 'malware', 'spam', 'fraud', 'adult', 'gambling', 'copyright', 'impersonation'] as const).map((key) => (
                                            <div key={key} className="flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                                                <span className="text-sm text-slate-600">{t(`abuseTypes.${key}`)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-4">{t('helperText')}</p>
                                </div>
                            </div>
                        </div>

                        {/* Form */}
                        {submitted ? (
                            <div className="text-center py-16">
                                <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                                    <Shield className="w-8 h-8 text-emerald-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800 mb-3">{t('success.title')}</h2>
                                <p className="text-slate-500 max-w-md mx-auto mb-8">{t('success.description')}</p>
                                <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors">
                                    {t('success.backToHome')}
                                </Link>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-8">
                                <h2 className="text-2xl font-bold text-slate-800">{t('form.title')}</h2>

                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                                        {t('form.email')} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        required
                                        value={formData.reporterEmail}
                                        onChange={(e) => setFormData({ ...formData, reporterEmail: e.target.value })}
                                        placeholder={t('form.emailPlaceholder')}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow"
                                    />
                                    <p className="text-xs text-slate-400 mt-1.5">{t('form.emailHelper')}</p>
                                </div>

                                <div>
                                    <label htmlFor="type" className="block text-sm font-medium text-slate-700 mb-2">
                                        {t('form.type')} <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="type"
                                        required
                                        value={formData.abuseType}
                                        onChange={(e) => setFormData({ ...formData, abuseType: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow appearance-none"
                                    >
                                        <option value="">{t('form.typePlaceholder')}</option>
                                        {abuseTypeKeys.map((key) => (
                                            <option key={key} value={key}>{t(`form.typeOptions.${key}`)}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="url" className="block text-sm font-medium text-slate-700 mb-2">
                                        {t('form.url')} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="url"
                                        type="url"
                                        required
                                        value={formData.url}
                                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                        placeholder={t('form.urlPlaceholder')}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow"
                                    />
                                    <p className="text-xs text-slate-400 mt-1.5">{t('form.urlHelper')}</p>
                                </div>

                                <div>
                                    <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">
                                        {t('form.description')} <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        id="description"
                                        required
                                        rows={5}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder={t('form.descriptionPlaceholder')}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow resize-none"
                                    />
                                </div>

                                <div className="flex items-center justify-between pt-4">
                                    <p className="text-xs text-slate-400 max-w-xs">{t('form.disclaimer')}</p>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-medium transition-colors"
                                    >
                                        {submitting ? t('form.submitting') : t('form.submit')}
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </main>

            <footer className="border-t border-slate-200 bg-white px-6 lg:px-16 py-12">
                <div className="max-w-2xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-slate-400">&copy; {new Date().getFullYear()} Traaaction. All rights reserved.</p>
                    <div className="flex items-center gap-6">
                        <Link href="/terms" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">Terms</Link>
                        <Link href="/privacy" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">Privacy</Link>
                        <Link href="/" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">Home</Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
