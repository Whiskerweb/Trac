'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, ArrowUpRight, Eye, Zap, Sparkles, ShieldCheck, Rocket, Users, Link2, Mail } from 'lucide-react'
import { useTranslations } from 'next-intl'

const team = [
    {
        name: 'Lucas Roncey',
        image: '/Logotrac/lucasroncey.png',
        linkedin: 'https://www.linkedin.com/in/lucas-roncey/',
    },
    {
        name: 'Kate B. Masson',
        image: '/Logotrac/katemasson.png',
        linkedin: 'https://www.linkedin.com/in/catherine-kate-bourlier-masson/',
    },
    {
        name: 'Mathieu Champenois',
        image: '/Logotrac/mathieu.png',
        linkedin: 'https://www.linkedin.com/in/mathieu-champenois-b2147280/',
    },
]

const valueIcons = [Eye, Zap, Sparkles, ShieldCheck]
const valueKeys = ['transparency', 'performance', 'simplicity', 'trust'] as const

const stepIcons = [Rocket, Users, Link2]
const stepKeys = ['step1', 'step2', 'step3'] as const

export default function AboutPage() {
    const t = useTranslations('about')

    return (
        <div className="min-h-screen bg-[#FAFAFA] text-slate-900 selection:bg-amber-500/20">
            <div className="fixed inset-0 pointer-events-none opacity-30">
                <div className="absolute top-0 right-0 w-[900px] h-[900px] bg-gradient-to-bl from-amber-100/40 to-transparent rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-[700px] h-[700px] bg-gradient-to-tr from-slate-100/50 to-transparent rounded-full blur-3xl" />
            </div>

            <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span>{t('backToHome')}</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <Image src="/Logotrac/Logo5.png" alt="Traaaction" width={24} height={24} className="rounded-md" />
                        <span className="text-sm font-medium text-slate-500">About</span>
                    </div>
                </div>
            </header>

            <main className="pt-20">
                {/* Hero */}
                <section className="px-6 lg:px-16 pt-20 pb-24 bg-white border-b border-slate-200/50">
                    <div className="max-w-4xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium mb-8">
                            <Users className="w-3 h-3" />
                            {t('badge')}
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
                            {t('title')}
                            <span className="block text-slate-300">{t('titleAccent')}</span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-2xl">
                            {t('subtitle')}
                        </p>
                    </div>
                </section>

                {/* Mission */}
                <section className="px-6 lg:px-16 py-24">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-4 mb-10">
                            <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 shadow-lg shadow-slate-900/25 flex items-center justify-center text-white font-mono text-sm font-bold">
                                {t('mission.number')}
                            </span>
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{t('mission.title')}</h2>
                        </div>
                        <div className="grid md:grid-cols-2 gap-12 md:gap-16">
                            <div className="space-y-6 text-slate-600 leading-relaxed">
                                <p className="text-lg">
                                    {t.rich('mission.p1', { highlight: () => <span className="text-slate-900 font-medium">{t('mission.p1Highlight')}</span> })}
                                </p>
                                <p>{t('mission.p2')}</p>
                            </div>
                            <div className="space-y-6 text-slate-600 leading-relaxed">
                                <p>{t('mission.p3')}</p>
                                <p>{t('mission.p4')}</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* How it Works */}
                <section className="px-6 lg:px-16 py-24 bg-white border-y border-slate-200/50">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-4 mb-10">
                            <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 shadow-lg shadow-slate-900/25 flex items-center justify-center text-white font-mono text-sm font-bold">
                                {t('howItWorks.number')}
                            </span>
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{t('howItWorks.title')}</h2>
                        </div>
                        <div className="grid md:grid-cols-3 gap-8">
                            {stepKeys.map((key, i) => {
                                const Icon = stepIcons[i]
                                return (
                                    <div key={key} className="relative group">
                                        <div className="p-6 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all">
                                            <div className="flex items-center gap-3 mb-5">
                                                <span className="text-xs font-mono text-slate-400 tracking-wider">{String(i + 1).padStart(2, '0')}</span>
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-slate-900 flex items-center justify-center transition-colors">
                                                    <Icon className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                                                </div>
                                            </div>
                                            <h3 className="text-lg font-semibold text-slate-800 mb-2">{t(`howItWorks.${key}Title`)}</h3>
                                            <p className="text-sm text-slate-500 leading-relaxed">{t(`howItWorks.${key}Desc`)}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </section>

                {/* Values */}
                <section className="px-6 lg:px-16 py-24">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-4 mb-10">
                            <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 shadow-lg shadow-slate-900/25 flex items-center justify-center text-white font-mono text-sm font-bold">
                                {t('values.number')}
                            </span>
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{t('values.title')}</h2>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-6">
                            {valueKeys.map((key, i) => {
                                const Icon = valueIcons[i]
                                return (
                                    <div key={key} className="p-6 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all group">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-slate-900 flex items-center justify-center mb-4 transition-colors">
                                            <Icon className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-slate-800 mb-2">{t(`values.${key}`)}</h3>
                                        <p className="text-sm text-slate-500 leading-relaxed">{t(`values.${key}Desc`)}</p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </section>

                {/* Team */}
                <section className="px-6 lg:px-16 py-24 bg-white border-y border-slate-200/50">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-4 mb-4">
                            <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 shadow-lg shadow-slate-900/25 flex items-center justify-center text-white font-mono text-sm font-bold">
                                {t('team.number')}
                            </span>
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{t('team.title')}</h2>
                        </div>
                        <p className="text-slate-500 mb-12 max-w-lg">{t('team.subtitle')}</p>
                        <div className="grid sm:grid-cols-3 gap-8">
                            {team.map((member) => (
                                <div key={member.name} className="group text-center">
                                    <div className="relative w-40 h-40 mx-auto mb-5 rounded-2xl overflow-hidden border-2 border-slate-200 group-hover:border-slate-400 transition-colors">
                                        <Image src={member.image} alt={member.name} fill className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-800">{member.name}</h3>
                                    <p className="text-sm text-slate-500 mb-3">{t('team.cofounder')}</p>
                                    <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors">
                                        LinkedIn
                                        <ArrowUpRight className="w-3 h-3" />
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="px-6 lg:px-16 py-24">
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">{t('cta.title')}</h2>
                        <p className="text-slate-500 mb-10 max-w-md mx-auto">{t('cta.subtitle')}</p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <a href="https://calendly.com/contact-traaaction/30min" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors">
                                {t('cta.bookDemo')}
                                <ArrowUpRight className="w-4 h-4" />
                            </a>
                            <a href="mailto:contact@traaaction.com" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors">
                                <Mail className="w-4 h-4" />
                                {t('cta.contactUs')}
                            </a>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-slate-200 bg-white px-6 lg:px-16 py-12">
                <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-slate-400">&copy; {new Date().getFullYear()} Traaaction. All rights reserved.</p>
                    <div className="flex items-center gap-6">
                        <Link href="/terms" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">{t('footer.terms')}</Link>
                        <Link href="/privacy" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">{t('footer.privacy')}</Link>
                        <Link href="/" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">{t('footer.home')}</Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
