'use client'

import Link from 'next/link'
import { ArrowRight, ChevronDown, Users, Zap, Shield, Clock, TrendingUp, Share2, UserPlus, ShoppingBag, Coins } from 'lucide-react'
import { useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'
import { useTranslations } from 'next-intl'

// =============================================
// ANIMATED SECTION WRAPPER
// =============================================

function AnimatedSection({ children, className = '', delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true, margin: '-80px' })
    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.5, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

// =============================================
// FAQ ITEM
// =============================================

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
    const [open, setOpen] = useState(false)
    return (
        <div className="border-b border-slate-200 last:border-0">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between py-5 text-left group"
            >
                <div className="flex items-center gap-4 pr-4">
                    <span className="text-xs font-medium text-slate-300 tabular-nums w-5">{String(index + 1).padStart(2, '0')}</span>
                    <span className="text-[15px] font-medium text-slate-900 group-hover:text-slate-700 transition-colors">{q}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-96 pb-5' : 'max-h-0'}`}>
                <p className="text-sm text-slate-500 leading-relaxed pl-9">{a}</p>
            </div>
        </div>
    )
}

// =============================================
// NETWORK VISUAL — Illustrative SVG
// =============================================

function PyramidNode({ img, label, rate, size, delay }: { img: string; label: string; rate: string; size: 'lg' | 'md' | 'sm'; delay: number }) {
    const sizes = { lg: 'w-16 h-16 md:w-20 md:h-20', md: 'w-14 h-14 md:w-16 md:h-16', sm: 'w-10 h-10 md:w-12 md:h-12' }
    return (
        <motion.div
            className="flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay }}
        >
            <div className={`${sizes[size]} rounded-full overflow-hidden ring-[3px] ring-white shadow-lg`}>
                <img src={img} alt={label} className="w-full h-full object-cover" />
            </div>
            <span className="mt-2 text-xs md:text-sm font-medium text-slate-600">{label}</span>
            <span className="mt-1 text-[11px] md:text-xs font-semibold text-blue-500 bg-blue-50/80 border border-blue-100 px-2 md:px-2.5 py-0.5 rounded-full">{rate}</span>
        </motion.div>
    )
}

function TreeConnector({ className = '' }: { className?: string }) {
    return <div className={`absolute bg-slate-200 ${className}`} />
}

function NetworkVisual({ t }: { t: (key: string) => string }) {
    return (
        <div className="w-full max-w-[540px] mx-auto mt-4">
            {/* ─── ROW 0 : YOU ─── */}
            <div className="flex justify-center">
                <PyramidNode img="/Logotrac/launding/homme1.png" label={t('network.you')} rate="5%" size="lg" delay={0.2} />
            </div>

            {/* ─── CONNECTOR: You → Gen1 ─── */}
            <div className="relative h-12 md:h-16">
                {/* Vertical line down from You */}
                <div className="absolute left-1/2 top-0 w-px h-1/2 bg-slate-200 -translate-x-1/2" />
                {/* Horizontal bar */}
                <div className="absolute top-1/2 left-[25%] right-[25%] h-px bg-slate-200" />
                {/* Two vertical lines down to Gen1 */}
                <div className="absolute left-[25%] top-1/2 w-px h-1/2 bg-slate-200 -translate-x-1/2" />
                <div className="absolute left-[75%] top-1/2 w-px h-1/2 bg-slate-200 -translate-x-1/2" />
            </div>

            {/* ─── ROW 1 : GEN 1 (2 nodes) ─── */}
            <div className="flex justify-around px-[10%]">
                <PyramidNode img="/Logotrac/launding/femme1.png" label={t('network.gen1')} rate="3%" size="md" delay={0.5} />
                <PyramidNode img="/Logotrac/launding/femme2.png" label={t('network.gen1')} rate="3%" size="md" delay={0.65} />
            </div>

            {/* ─── CONNECTOR: Gen1 → Gen2 ─── */}
            <div className="flex">
                {/* Left subtree connector */}
                <div className="relative flex-1 h-12 md:h-16">
                    <div className="absolute left-[50%] top-0 w-px h-1/2 bg-slate-200 -translate-x-1/2" />
                    <div className="absolute top-1/2 left-[20%] right-[20%] h-px bg-slate-200" />
                    <div className="absolute left-[20%] top-1/2 w-px h-1/2 bg-slate-200 -translate-x-1/2" />
                    <div className="absolute left-[80%] top-1/2 w-px h-1/2 bg-slate-200 -translate-x-1/2" />
                </div>
                {/* Right subtree connector */}
                <div className="relative flex-1 h-12 md:h-16">
                    <div className="absolute left-[50%] top-0 w-px h-1/2 bg-slate-200 -translate-x-1/2" />
                    <div className="absolute top-1/2 left-[20%] right-[20%] h-px bg-slate-200" />
                    <div className="absolute left-[20%] top-1/2 w-px h-1/2 bg-slate-200 -translate-x-1/2" />
                    <div className="absolute left-[80%] top-1/2 w-px h-1/2 bg-slate-200 -translate-x-1/2" />
                </div>
            </div>

            {/* ─── ROW 2 : GEN 2 (4 nodes) ─── */}
            <div className="grid grid-cols-4 gap-2">
                <div className="flex justify-center">
                    <PyramidNode img="/Logotrac/launding/femme3.jpg" label={t('network.gen2')} rate="2%" size="sm" delay={0.9} />
                </div>
                <div className="flex justify-center">
                    <PyramidNode img="/Logotrac/launding/homme2.jpg" label={t('network.gen2')} rate="2%" size="sm" delay={1.0} />
                </div>
                <div className="flex justify-center">
                    <PyramidNode img="/Logotrac/launding/femme4.jpg" label={t('network.gen2')} rate="2%" size="sm" delay={1.05} />
                </div>
                <div className="flex justify-center">
                    <PyramidNode img="/Logotrac/launding/homme3.jpg" label={t('network.gen2')} rate="2%" size="sm" delay={1.15} />
                </div>
            </div>
        </div>
    )
}

// =============================================
// PAGE
// =============================================

export default function AffiliatePage() {
    const t = useTranslations('affiliate')

    const faqs = [
        { q: t('faq.q1.q'), a: t('faq.q1.a') },
        { q: t('faq.q2.q'), a: t('faq.q2.a') },
        { q: t('faq.q3.q'), a: t('faq.q3.a') },
        { q: t('faq.q4.q'), a: t('faq.q4.a') },
        { q: t('faq.q5.q'), a: t('faq.q5.a') },
        { q: t('faq.q6.q'), a: t('faq.q6.a') },
        { q: t('faq.q7.q'), a: t('faq.q7.a') },
    ]

    const tiers = [
        { ...tierData('gen1'), icon: UserPlus, delay: 0 },
        { ...tierData('gen2'), icon: Users, delay: 0.1 },
        { ...tierData('gen3'), icon: Share2, delay: 0.2 },
    ]

    function tierData(key: string) {
        return {
            rate: t(`tiers.${key}.rate`),
            label: t(`tiers.${key}.label`),
            tag: t(`tiers.${key}.tag`),
            desc: t(`tiers.${key}.desc`),
        }
    }

    const steps = [
        { step: '01', icon: Zap, title: t('howItWorks.step1.title'), desc: t('howItWorks.step1.desc') },
        { step: '02', icon: Share2, title: t('howItWorks.step2.title'), desc: t('howItWorks.step2.desc') },
        { step: '03', icon: ShoppingBag, title: t('howItWorks.step3.title'), desc: t('howItWorks.step3.desc') },
        { step: '04', icon: Coins, title: t('howItWorks.step4.title'), desc: t('howItWorks.step4.desc') },
    ]

    return (
        <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-500/10">
            <Navbar />

            <main className="pt-28">

                {/* ========================================
                    HERO
                ======================================== */}
                <section className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-40" />

                    <div className="container mx-auto px-4 max-w-5xl relative z-10 pt-16 pb-24 md:pt-24 md:pb-32">
                        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
                            {/* Left — Text */}
                            <AnimatedSection className="flex-1 text-center lg:text-left">
                                <div className="inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-500 backdrop-blur-md mb-8">
                                    <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2 animate-pulse" />
                                    {t('badge')}
                                </div>

                                <h1 className="flex flex-col lg:items-start items-center font-display tracking-tight text-slate-900 mb-8">
                                    <span className="text-4xl md:text-5xl lg:text-6xl font-medium mb-3 block">
                                        {t('hero.title1')}
                                    </span>
                                    <span
                                        className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-slate-500 to-slate-950 mt-2 select-none"
                                        style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.1))' }}
                                    >
                                        {t('hero.title2')}
                                    </span>
                                </h1>

                                <p className="text-lg md:text-xl text-slate-600 max-w-lg mb-10 leading-relaxed lg:mx-0 mx-auto">
                                    {t('hero.subtitle')}
                                </p>

                                <div className="flex flex-col sm:flex-row items-center lg:justify-start justify-center gap-4">
                                    <Link
                                        href="/login?role=seller"
                                        className="inline-flex items-center justify-center h-12 px-8 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors shadow-lg hover:shadow-xl shadow-blue-900/20"
                                    >
                                        {t('hero.cta')}
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                    <a
                                        href="#how-it-works"
                                        className="inline-flex items-center justify-center h-12 px-8 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium hover:bg-slate-50 transition-colors"
                                    >
                                        {t('hero.ctaSecondary')}
                                    </a>
                                </div>
                            </AnimatedSection>

                            {/* Right — Pyramid */}
                            <AnimatedSection delay={0.3} className="flex-1 w-full lg:w-auto">
                                <NetworkVisual t={t} />
                            </AnimatedSection>
                        </div>
                    </div>
                </section>

                {/* ========================================
                    COMMISSION TIERS
                ======================================== */}
                <section className="bg-white border-y border-slate-200">
                    <div className="container mx-auto px-4 max-w-5xl">
                        <AnimatedSection>
                            <div className="text-center max-w-2xl mx-auto pt-20 pb-12 space-y-3">
                                <h2 className="text-4xl md:text-6xl font-medium tracking-tight text-slate-900">
                                    {t('tiers.title')}
                                </h2>
                                <p className="text-lg text-slate-500 leading-relaxed font-medium">
                                    {t('tiers.subtitle')}
                                </p>
                            </div>
                        </AnimatedSection>

                        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 border-t border-slate-200">
                            {tiers.map((tier) => (
                                <AnimatedSection key={tier.label} delay={tier.delay}>
                                    <div className="flex flex-col pt-12 pb-8 px-6 md:px-8 group">
                                        <div className="h-[160px] w-full flex flex-col items-center justify-center mb-8 relative">
                                            <span className="text-7xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-slate-400 to-slate-900 select-none">
                                                {tier.rate}
                                            </span>
                                            <span className="text-xs font-medium text-blue-500 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full mt-3">
                                                {tier.tag}
                                            </span>
                                        </div>
                                        <div className="mt-auto">
                                            <h3 className="text-xl font-bold text-slate-900 mb-3">{tier.label}</h3>
                                            <p className="text-base text-slate-500 leading-relaxed mb-6">{tier.desc}</p>
                                            <div className="text-sm font-semibold text-slate-900 flex items-center gap-1">
                                                {t('tiers.htLabel')}
                                            </div>
                                        </div>
                                    </div>
                                </AnimatedSection>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ========================================
                    EXAMPLE
                ======================================== */}
                <section className="relative overflow-hidden border-b border-slate-200">
                    <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-60" />

                    <div className="container mx-auto px-4 max-w-5xl py-24 relative z-10">
                        <AnimatedSection>
                            <div className="flex flex-col md:flex-row items-start justify-between gap-12 md:gap-20">
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">{t('example.label')}</p>
                                    <h2 className="text-2xl md:text-3xl font-medium text-slate-900 leading-tight tracking-tight mb-6">
                                        {t('example.title')}
                                    </h2>
                                    <p className="text-sm text-slate-500 leading-relaxed">
                                        {t('example.note')}
                                    </p>
                                </div>

                                <div className="shrink-0 w-full md:w-[340px]">
                                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                        <div className="divide-y divide-slate-100">
                                            <div className="flex items-center justify-between px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center">
                                                        <span className="text-[9px] font-bold text-white">G1</span>
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-900">{t('example.g1')}</span>
                                                </div>
                                                <span className="text-sm font-bold text-slate-900 tabular-nums">5,00&euro;</span>
                                            </div>
                                            <div className="flex items-center justify-between px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center">
                                                        <span className="text-[9px] font-bold text-white">G2</span>
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-900">{t('example.g2')}</span>
                                                </div>
                                                <span className="text-sm font-bold text-slate-900 tabular-nums">3,00&euro;</span>
                                            </div>
                                            <div className="flex items-center justify-between px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-7 h-7 rounded-full bg-slate-500 flex items-center justify-center">
                                                        <span className="text-[9px] font-bold text-white">G3</span>
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-900">{t('example.g3')}</span>
                                                </div>
                                                <span className="text-sm font-bold text-slate-900 tabular-nums">2,00&euro;</span>
                                            </div>
                                            <div className="flex items-center justify-between px-5 py-4 bg-slate-50">
                                                <span className="text-sm text-slate-500">{t('example.seller')}</span>
                                                <span className="text-xs text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">{t('example.sellerNote')}</span>
                                            </div>
                                        </div>
                                        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-900 text-white">
                                            <span className="text-xs font-medium">{t('example.platformKeeps')}</span>
                                            <span className="text-sm font-bold tabular-nums">5,00&euro; <span className="text-xs text-slate-400 font-normal">/ 15&euro;</span></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </AnimatedSection>
                    </div>
                </section>

                {/* ========================================
                    HOW IT WORKS
                ======================================== */}
                <section id="how-it-works" className="bg-white border-b border-slate-200">
                    <div className="container mx-auto px-4 max-w-5xl py-24">
                        <AnimatedSection>
                            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
                                <h2 className="text-4xl md:text-6xl font-medium tracking-tight text-slate-900">
                                    {t('howItWorks.title')}
                                </h2>
                                <p className="text-lg text-slate-500 leading-relaxed font-medium">
                                    {t('howItWorks.subtitle')}
                                </p>
                            </div>
                        </AnimatedSection>

                        <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                            {steps.map((item, i) => (
                                <AnimatedSection key={item.step} delay={i * 0.1}>
                                    <div className="p-6 md:p-8 bg-white flex flex-col h-full">
                                        <div className="flex items-center justify-between mb-6">
                                            <span className="text-xs font-bold text-slate-300 tabular-nums">{item.step}</span>
                                            <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                                                <item.icon className="w-4 h-4 text-slate-600" />
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                                        <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                                    </div>
                                </AnimatedSection>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ========================================
                    KEY BENEFITS
                ======================================== */}
                <section className="bg-white border-b border-slate-200 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-40" />

                    <div className="container mx-auto px-4 max-w-5xl py-24 relative z-10">
                        <AnimatedSection>
                            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
                                <h2 className="text-4xl md:text-6xl font-medium tracking-tight text-slate-900">
                                    {t('benefits.title')}
                                </h2>
                            </div>
                        </AnimatedSection>

                        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 divide-slate-200">
                            <div className="sm:border-r sm:border-b border-slate-200">
                                <AnimatedSection delay={0}>
                                    <div className="p-8 md:p-10">
                                        <Shield className="w-5 h-5 text-slate-400 mb-5" />
                                        <h3 className="text-lg font-bold text-slate-900 mb-2">{t('benefits.zeroImpact.title')}</h3>
                                        <p className="text-sm text-slate-500 leading-relaxed">{t('benefits.zeroImpact.desc')}</p>
                                    </div>
                                </AnimatedSection>
                            </div>
                            <div className="sm:border-b border-slate-200">
                                <AnimatedSection delay={0.1}>
                                    <div className="p-8 md:p-10">
                                        <Clock className="w-5 h-5 text-slate-400 mb-5" />
                                        <h3 className="text-lg font-bold text-slate-900 mb-2">{t('benefits.lifetime.title')}</h3>
                                        <p className="text-sm text-slate-500 leading-relaxed">{t('benefits.lifetime.desc')}</p>
                                    </div>
                                </AnimatedSection>
                            </div>
                            <div className="sm:border-r border-slate-200">
                                <AnimatedSection delay={0.15}>
                                    <div className="p-8 md:p-10">
                                        <TrendingUp className="w-5 h-5 text-slate-400 mb-5" />
                                        <h3 className="text-lg font-bold text-slate-900 mb-2">{t('benefits.generations.title')}</h3>
                                        <p className="text-sm text-slate-500 leading-relaxed">{t('benefits.generations.desc')}</p>
                                    </div>
                                </AnimatedSection>
                            </div>
                            <div>
                                <AnimatedSection delay={0.2}>
                                    <div className="p-8 md:p-10">
                                        <Zap className="w-5 h-5 text-slate-400 mb-5" />
                                        <h3 className="text-lg font-bold text-slate-900 mb-2">{t('benefits.automatic.title')}</h3>
                                        <p className="text-sm text-slate-500 leading-relaxed">{t('benefits.automatic.desc')}</p>
                                    </div>
                                </AnimatedSection>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ========================================
                    FAQ
                ======================================== */}
                <section className="bg-white border-b border-slate-200">
                    <div className="container mx-auto px-4 max-w-3xl py-24">
                        <AnimatedSection>
                            <div className="text-center mb-14 space-y-3">
                                <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-slate-900">
                                    {t('faq.title')}
                                </h2>
                            </div>
                        </AnimatedSection>

                        <AnimatedSection delay={0.1}>
                            <div>
                                {faqs.map((faq, i) => (
                                    <FaqItem key={i} q={faq.q} a={faq.a} index={i} />
                                ))}
                            </div>
                        </AnimatedSection>
                    </div>
                </section>

                {/* ========================================
                    CTA
                ======================================== */}
                <section className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-40" />

                    <div className="container mx-auto px-4 max-w-5xl py-24 md:py-32 relative z-10">
                        <AnimatedSection>
                            <div className="text-center max-w-2xl mx-auto">
                                <h2 className="text-4xl md:text-6xl font-medium tracking-tight text-slate-900 mb-6">
                                    {t('cta.title')}
                                </h2>
                                <p className="text-lg text-slate-500 leading-relaxed font-medium mb-10">
                                    {t('cta.subtitle')}
                                </p>
                                <Link
                                    href="/login?role=seller"
                                    className="inline-flex items-center justify-center h-12 px-8 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors shadow-lg hover:shadow-xl shadow-blue-900/20"
                                >
                                    {t('cta.button')}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                                <p className="text-xs text-slate-400 mt-6 font-medium">
                                    {t('cta.note')}
                                </p>
                            </div>
                        </AnimatedSection>
                    </div>
                </section>

            </main>

            <Footer />
        </div>
    )
}
