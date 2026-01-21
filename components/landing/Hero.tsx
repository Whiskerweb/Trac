'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';

export function Hero() {
    const [user, setUser] = useState<User | null>(null);
    const supabase = createClient();

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
    }, [supabase]);
    return (
        <section className="relative pt-32 pb-8 sm:pt-48 sm:pb-12 overflow-hidden bg-white text-slate-900">
            {/* Light Kinetic Background Elements - Keeping subtle bg effects as they are 'sober' */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">

                {/* Typographic Hero Layout */}
                <div className="flex flex-col items-center justify-center mb-12 animate-slide-up">

                    {/* Top Line */}
                    <h1 className="font-display text-4xl sm:text-6xl font-medium tracking-tight text-slate-900 leading-tight">
                        Connect Startups & Sellers
                    </h1>

                    {/* Bridge Line - Smaller, stylized */}
                    <span className="font-serif italic text-2xl sm:text-3xl text-gray-400 my-4 sm:my-6 relative">
                        <span className="absolute inset-x-0 top-1/2 h-px bg-gray-200 -z-10 scale-x-125"></span>
                        <span className="bg-white px-4">to create</span>
                    </span>

                    {/* Main Brand Impact - "Stylish but sober" */}
                    <div className="relative">
                        <h1 className="font-display text-6xl sm:text-9xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-slate-900 to-slate-600 drop-shadow-sm">
                            Traaaction
                        </h1>
                        {/* Subtle underline/accent */}
                        <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent blur-sm" />
                    </div>

                </div>

                {/* Subheading */}
                <p className="mx-auto max-w-2xl text-lg sm:text-xl text-gray-500 mb-12 leading-relaxed animate-slide-up opacity-0" style={{ animationDelay: '0.1s' }}>
                    Stop playing solo. Plug into the modern ecosystem where ambitious startups recruit top-tier sellers instantly.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-slide-up opacity-0" style={{ animationDelay: '0.2s' }}>
                    <Link
                        href={user ? "/dashboard" : "/login"}
                        className="group w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-sm font-bold text-white bg-gradient-to-b from-neutral-700 to-neutral-900 border border-neutral-700 rounded-xl hover:from-neutral-600 hover:to-neutral-800 transition-all shadow-[0px_2px_4px_rgba(0,0,0,0.2),0px_1px_0px_rgba(255,255,255,0.1)_inset] hover:shadow-[0px_4px_8px_rgba(0,0,0,0.3),0px_1px_0px_rgba(255,255,255,0.1)_inset]"
                    >
                        {user ? "Go to Dashboard" : "Start the Engine"}
                        <ArrowRight className="ml-2 w-4 h-4 text-neutral-300 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </Link>
                    <Link
                        href="/demo"
                        className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-sm font-medium text-slate-700 bg-gradient-to-b from-white to-gray-50 border border-gray-200 rounded-xl hover:from-gray-50 hover:to-gray-100 transition-all shadow-[0px_2px_4px_rgba(0,0,0,0.05),0px_1px_0px_rgba(255,255,255,1)_inset] hover:shadow-[0px_4px_8px_rgba(0,0,0,0.1),0px_1px_0px_rgba(255,255,255,1)_inset]"
                    >
                        <Sparkles className="mr-2 w-4 h-4 text-emerald-500" />
                        View Demo
                    </Link>
                </div>

                {/* Powering Text */}
                <p className="text-center text-xs font-mono text-gray-400 uppercase tracking-widest animate-slide-up opacity-0" style={{ animationDelay: '0.3s' }}>
                    Powering the Next Generation
                </p>

            </div>
        </section>
    );
}
