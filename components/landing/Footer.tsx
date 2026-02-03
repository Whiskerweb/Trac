'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';

// Links with their actual URLs
const footerLinks: Record<string, Array<{ label: string; href: string }>> = {
    Product: [
        { label: 'Features', href: '#' },
        { label: 'Integrations', href: '#' },
        { label: 'Pricing', href: '#' },
        { label: 'Changelog', href: '#' },
    ],
    Company: [
        { label: 'About', href: '#' },
        { label: 'Blog', href: '#' },
        { label: 'Careers', href: '#' },
        { label: 'Contact', href: '#' },
    ],
    Resources: [
        { label: 'Documentation', href: '#' },
        { label: 'Help Center', href: '#' },
        { label: 'API Reference', href: '#' },
        { label: 'Status', href: '#' },
    ],
    Legal: [
        { label: 'Privacy', href: '/privacy' },
        { label: 'Terms', href: '/terms' },
        { label: 'Security', href: '#' },
    ],
};

export function Footer() {
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
                            The modern infrastructure for SaaS partner programs. Track, manage, and payout your affiliates on autopilot.
                        </p>
                        <div className="flex gap-4">
                            {/* Social Icons placeholders */}
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="w-8 h-8 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors cursor-pointer border border-gray-100" />
                            ))}
                        </div>
                    </div>

                    {Object.entries(footerLinks).map(([category, links]) => (
                        <div key={category}>
                            <h3 className="font-semibold text-slate-900 text-sm mb-4">{category}</h3>
                            <ul className="space-y-3">
                                {links.map((link) => (
                                    <li key={link.label}>
                                        <Link href={link.href} className="text-gray-500 hover:text-black text-sm transition-colors flex items-center gap-1 group">
                                            {link.label}
                                            <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity -translate-y-1 group-hover:translate-y-0" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
                <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-gray-400">
                        © {new Date().getFullYear()} Traaaction Inc. All rights reserved.
                    </p>
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-sm text-slate-600 font-medium">All systems operational</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
