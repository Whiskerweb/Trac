'use client';

import Link from 'next/link';
import { ArrowRight, ChevronRight, BarChart3, Globe } from 'lucide-react';

export function Hero() {
    return (
        <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-24 overflow-hidden">
            {/* Background Gradient & Grid */}
            <div className="absolute inset-0 bg-white bg-grid-small-black/[0.2] -z-20" />
            <div className="absolute inset-0 bg-gradient-to-b from-white via-white/40 to-white -z-10" />

            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none z-[-1]">
                <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-[100px] mix-blend-multiply opacity-70 animate-fade-in" />
                <div className="absolute top-[10%] right-[10%] w-[500px] h-[500px] bg-purple-100/40 rounded-full blur-[100px] mix-blend-multiply opacity-70 animate-fade-in animation-delay-500" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                {/* Badge */}
                <div className="animate-slide-up opacity-0 flex justify-center" style={{ animationDelay: '0.1s' }}>
                    <Link
                        href="/updates"
                        className="group relative inline-flex items-center rounded-full border border-gray-200 bg-white/80 backdrop-blur-sm px-3 py-1 text-sm text-gray-600 hover:border-gray-300 transition-all shadow-sm overflow-hidden ring-1 ring-black/5"
                    >
                        <div className="absolute inset-0 flex translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-black/5 to-transparent z-10" />
                        <span className="flex items-center gap-2 relative z-20">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            <span className="font-medium tracking-tight">New: Advanced Analytics 2.0</span>
                        </span>
                        <ChevronRight className="ml-1 h-3 w-3 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                </div>

                {/* Heading */}
                <h1 className="animate-slide-up opacity-0 mx-auto max-w-4xl text-5xl font-extrabold tracking-tighter text-slate-900 sm:text-7xl mb-6 drop-shadow-sm" style={{ animationDelay: '0.2s', lineHeight: '1.1' }}>
                    Traaaction for <br />
                    <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-600 bg-clip-text text-transparent">
                        Modern SaaS Growth
                    </span>
                </h1>

                <p className="animate-slide-up opacity-0 mx-auto max-w-2xl text-lg text-gray-600 mb-10 leading-relaxed font-medium" style={{ animationDelay: '0.3s' }}>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.
                </p>

                {/* CTA Buttons */}
                <div className="animate-slide-up opacity-0 flex flex-col sm:flex-row items-center justify-center gap-4" style={{ animationDelay: '0.4s' }}>
                    <Link
                        href="/dashboard"
                        className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white bg-black rounded-full hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 ring-offset-2 focus:ring-2 ring-black"
                    >
                        Start Tracking Free
                        <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                    <Link
                        href="/demo"
                        className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 text-base font-medium text-gray-700 bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm hover:shadow-md"
                    >
                        <Globe className="mr-2 w-4 h-4 text-gray-500" />
                        Live Demo
                    </Link>
                </div>

                {/* Hero Image / Dashboard Preview */}
                <div className="animate-slide-up opacity-0 mt-16 sm:mt-24 relative perspective-1000" style={{ animationDelay: '0.6s' }}>
                    <div className="relative rounded-2xl border border-gray-200/60 bg-white/50 p-2 shadow-2xl backdrop-blur-xl ring-1 ring-gray-950/5 transform transition-transform duration-700 hover:scale-[1.01]">
                        <div className="rounded-xl overflow-hidden bg-white/90 border border-gray-100 aspect-[16/9] flex items-center justify-center text-gray-400 relative group">
                            <div className="absolute inset-0 bg-grid-small-black/[0.1] opacity-50" />
                            <BarChart3 className="w-24 h-24 opacity-10 group-hover:scale-110 transition-transform duration-500" />
                            <span className="absolute inset-0 flex items-center justify-center text-lg font-medium opacity-40">
                                High-Fidelity Dashboard Preview (Placeholder)
                            </span>
                        </div>
                    </div>
                    <div className="absolute -z-10 -bottom-10 -right-10 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl opacity-60"></div>
                    <div className="absolute -z-10 -top-10 -left-10 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl opacity-60"></div>
                </div>
            </div>
        </section>
    );
}
