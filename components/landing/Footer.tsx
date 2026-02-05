'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Linkedin, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LanguageSelector } from '@/components/LanguageSelector';

export function Footer() {
    const t = useTranslations('landing.footer');

    const footerLinks = {
        product: [
            { labelKey: 'features', href: '#' },
            { labelKey: 'integrations', href: '#' },
            { labelKey: 'pricing', href: '#' },
        ],
        company: [
            { labelKey: 'aboutUs', href: '/about' },
            { labelKey: 'reportAbuse', href: '/report-abuse' },
        ],
        legal: [
            { labelKey: 'privacy', href: '/privacy' },
            { labelKey: 'terms', href: '/terms' },
            { labelKey: 'sellerTerms', href: '/seller-terms' },
            { labelKey: 'startupTerms', href: '/startup-terms' },
        ],
    };

    return (
        <footer className="bg-white border-t border-gray-100 pt-16 pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
                    <div className="col-span-2 lg:col-span-2">
                        <Link href="/" className="flex items-center gap-2 mb-4">
                            <Image
                                src="/Logotrac/Logo5.png"
                                alt="Traaaction"
                                width={32}
                                height={32}
                                className="rounded-lg"
                            />
                            <span className="font-bold text-xl tracking-tight text-slate-900">Traaaction</span>
                        </Link>
                        <p className="text-gray-500 text-sm max-w-sm mb-6 leading-relaxed">
                            {t('description')}
                        </p>
                        <div className="flex gap-3">
                            <a
                                href="https://www.linkedin.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors cursor-pointer border border-gray-100 flex items-center justify-center"
                            >
                                <Linkedin className="w-4 h-4 text-gray-500" />
                            </a>
                            <a
                                href="mailto:contact@traaaction.com"
                                className="w-8 h-8 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors cursor-pointer border border-gray-100 flex items-center justify-center"
                            >
                                <Mail className="w-4 h-4 text-gray-500" />
                            </a>
                        </div>
                    </div>

                    {/* Product Links */}
                    <div>
                        <h3 className="font-semibold text-slate-900 text-sm mb-4">{t('product')}</h3>
                        <ul className="space-y-3">
                            {footerLinks.product.map((link) => (
                                <li key={link.labelKey}>
                                    <Link href={link.href} className="text-gray-500 hover:text-black text-sm transition-colors flex items-center gap-1 group">
                                        {t(link.labelKey)}
                                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity -translate-y-1 group-hover:translate-y-0" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Company Links */}
                    <div>
                        <h3 className="font-semibold text-slate-900 text-sm mb-4">{t('company')}</h3>
                        <ul className="space-y-3">
                            {footerLinks.company.map((link) => (
                                <li key={link.labelKey}>
                                    <Link href={link.href} className="text-gray-500 hover:text-black text-sm transition-colors flex items-center gap-1 group">
                                        {t(link.labelKey)}
                                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity -translate-y-1 group-hover:translate-y-0" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal Links */}
                    <div>
                        <h3 className="font-semibold text-slate-900 text-sm mb-4">{t('legal')}</h3>
                        <ul className="space-y-3">
                            {footerLinks.legal.map((link) => (
                                <li key={link.labelKey}>
                                    <Link href={link.href} className="text-gray-500 hover:text-black text-sm transition-colors flex items-center gap-1 group">
                                        {t(link.labelKey)}
                                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity -translate-y-1 group-hover:translate-y-0" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-gray-400">
                        {t('copyright', { year: new Date().getFullYear() })}
                    </p>
                    <div className="flex items-center gap-6">
                        <LanguageSelector variant="minimal" openDirection="up" />
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-sm text-slate-600 font-medium">All systems operational</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
