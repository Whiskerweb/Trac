'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, ArrowRight, MousePointerClick, Link2, Coins, Users, Globe, ShieldCheck, BookOpen } from 'lucide-react'
import { useTranslations } from 'next-intl'

const cards = [
    {
        key: 'tracking',
        href: '/docs/tracking',
        Icon: MousePointerClick,
        iconBgCls: 'bg-blue-50 group-hover:bg-blue-600',
        iconCls: 'text-blue-600 group-hover:text-white',
    },
    {
        key: 'attribution',
        href: '/docs/attribution',
        Icon: Link2,
        iconBgCls: 'bg-emerald-50 group-hover:bg-emerald-600',
        iconCls: 'text-emerald-600 group-hover:text-white',
    },
    {
        key: 'commissions',
        href: '/docs/commissions',
        Icon: Coins,
        iconBgCls: 'bg-violet-50 group-hover:bg-violet-600',
        iconCls: 'text-violet-600 group-hover:text-white',
    },
    {
        key: 'organizations',
        href: '/docs/organizations',
        Icon: Users,
        iconBgCls: 'bg-sky-50 group-hover:bg-sky-600',
        iconCls: 'text-sky-600 group-hover:text-white',
    },
    {
        key: 'portal',
        href: '/docs/portal',
        Icon: Globe,
        iconBgCls: 'bg-amber-50 group-hover:bg-amber-600',
        iconCls: 'text-amber-600 group-hover:text-white',
    },
    {
        key: 'security',
        href: '/docs/security',
        Icon: ShieldCheck,
        iconBgCls: 'bg-red-50 group-hover:bg-red-600',
        iconCls: 'text-red-600 group-hover:text-white',
    },
] as const

export default function DocsIndexPage() {
    const t = useTranslations('docs.index')
    const c = useTranslations('docs.common')

    return (
        <div className="min-h-screen bg-[#FAFAFA] text-slate-900 selection:bg-slate-500/20">
            <div className="fixed inset-0 pointer-events-none opacity-30">
                <div className="absolute top-0 right-0 w-[900px] h-[900px] bg-gradient-to-bl from-slate-200/40 to-transparent rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-[700px] h-[700px] bg-gradient-to-tr from-slate-100/50 to-transparent rounded-full blur-3xl" />
            </div>

            <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span>{c('backToHome')}</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <Image src="/Logotrac/Logo5.png" alt="Traaaction" width={24} height={24} className="rounded-md" />
                        <span className="text-sm font-medium text-slate-500">{c('headerLabel')}</span>
                    </div>
                </div>
            </header>

            <main className="pt-20">
                <section className="px-6 lg:px-16 pt-20 pb-24 bg-white border-b border-slate-200/50">
                    <div className="max-w-4xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium mb-8">
                            <BookOpen className="w-3 h-3" />
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

                <section className="px-6 lg:px-16 py-24">
                    <div className="max-w-4xl mx-auto">
                        <div className="grid md:grid-cols-2 gap-6">
                            {cards.map(({ key, href, Icon, iconBgCls, iconCls }) => (
                                <Link key={key} href={href} className="group">
                                    <div className="p-6 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className={`w-10 h-10 rounded-xl ${iconBgCls} flex items-center justify-center transition-colors`}>
                                                <Icon className={`w-5 h-5 ${iconCls} transition-colors`} />
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-slate-800 mb-2">{t(`cards.${key}.title`)}</h3>
                                        <p className="text-sm text-slate-500 leading-relaxed">{t(`cards.${key}.description`)}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-slate-200 bg-white px-6 lg:px-16 py-12">
                <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-slate-400">&copy; {new Date().getFullYear()} Traaaction. {c('allRightsReserved')}</p>
                    <div className="flex items-center gap-6">
                        <Link href="/terms" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">{c('terms')}</Link>
                        <Link href="/privacy" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">{c('privacy')}</Link>
                        <Link href="/" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">{c('home')}</Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
