'use client';

import Link from 'next/link';
import { LayoutDashboard, ArrowRight } from 'lucide-react';

export function Navbar() {
    return (
        <nav className="fixed top-0 w-full z-50 glass-nav transition-all duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex-shrink-0 flex items-center gap-2">
                        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold">
                            T
                        </div>
                        <span className="font-bold text-xl tracking-tight">Traaaction</span>
                    </div>

                    <div className="hidden md:flex items-center space-x-8">
                        <Link href="#features" className="text-sm font-medium text-gray-500 hover:text-black transition-colors">
                            Features
                        </Link>
                        <Link href="#pricing" className="text-sm font-medium text-gray-500 hover:text-black transition-colors">
                            Pricing
                        </Link>
                        <Link href="#about" className="text-sm font-medium text-gray-500 hover:text-black transition-colors">
                            About
                        </Link>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link
                            href="/login"
                            className="text-sm font-medium text-gray-600 hover:text-black transition-colors hidden sm:block"
                        >
                            Log in
                        </Link>
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-black rounded-full hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                        >
                            Get Started <ArrowRight className="ml-2 w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
