'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, LayoutDashboard } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useTranslations } from 'next-intl';
import { LanguageSelector } from '@/components/LanguageSelector';

export function Navbar() {
    const [user, setUser] = useState<User | null>(null);
    const supabase = createClient();
    const t = useTranslations();

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
    }, [supabase]);

    return (
        <nav className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4">
            <div className="w-full max-w-5xl rounded-2xl bg-white/90 backdrop-blur-md border border-gray-200/50 shadow-xl flex items-center justify-between px-6 py-3 transition-all duration-300">

                {/* Logo */}
                <Link href="/" className="flex-shrink-0 flex items-center gap-3">
                    <Image
                        src="/Logotrac/Logo5.png"
                        alt="Traaaction"
                        width={32}
                        height={32}
                        className="rounded-lg"
                    />
                    <span className="font-bold text-lg tracking-tight text-slate-900">Traaaction</span>
                </Link>

                {/* Links */}
                <div className="hidden md:flex items-center space-x-6">
                    <Link
                        href="#startups"
                        className="text-sm font-medium text-gray-500 hover:text-black transition-colors"
                    >
                        {t('auth.startup.title')}
                    </Link>
                    <Link
                        href="#sellers"
                        className="text-sm font-medium text-gray-500 hover:text-black transition-colors"
                    >
                        {t('auth.seller.title')}
                    </Link>
                    <Link
                        href="#"
                        className="text-sm font-medium text-gray-500 hover:text-black transition-colors"
                    >
                        Roadmap
                    </Link>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    {/* Language Selector */}
                    <LanguageSelector variant="minimal" />

                    {user ? (
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center justify-center px-5 py-2 text-sm font-medium text-white bg-gradient-to-b from-neutral-700 to-neutral-900 border border-neutral-700 rounded-xl hover:from-neutral-600 hover:to-neutral-800 transition-all shadow-[0px_2px_4px_rgba(0,0,0,0.2),0px_1px_0px_rgba(255,255,255,0.1)_inset] hover:shadow-[0px_4px_8px_rgba(0,0,0,0.3),0px_1px_0px_rgba(255,255,255,0.1)_inset] group"
                        >
                            <LayoutDashboard className="mr-2 w-4 h-4 text-neutral-300 group-hover:text-white transition-colors" />
                            {t('nav.dashboard')}
                        </Link>
                    ) : (
                        <>
                            <Link
                                href="/login"
                                className="text-sm font-medium text-gray-600 hover:text-black transition-colors hidden sm:block"
                            >
                                {t('common.signIn')}
                            </Link>
                            <Link
                                href="/dashboard"
                                className="inline-flex items-center justify-center px-5 py-2 text-sm font-medium text-white bg-gradient-to-b from-neutral-700 to-neutral-900 border border-neutral-700 rounded-xl hover:from-neutral-600 hover:to-neutral-800 transition-all shadow-[0px_2px_4px_rgba(0,0,0,0.2),0px_1px_0px_rgba(255,255,255,0.1)_inset] hover:shadow-[0px_4px_8px_rgba(0,0,0,0.3),0px_1px_0px_rgba(255,255,255,0.1)_inset]"
                            >
                                {t('common.getStarted')} <ArrowRight className="ml-2 w-4 h-4 text-neutral-300" />
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
