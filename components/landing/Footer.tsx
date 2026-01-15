'use client';

import Link from 'next/link';

const footerLinks = {
    Product: ['Features', 'Integrations', 'Pricing', 'Changelog'],
    Company: ['About', 'Blog', 'Careers', 'Contact'],
    Resources: ['Documentation', 'Help Center', 'API Reference', 'Status'],
    Legal: ['Privacy', 'Terms', 'Security'],
};

export function Footer() {
    return (
        <footer className="bg-white border-t border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
                    <div className="col-span-2 lg:col-span-2">
                        <Link href="/" className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold">
                                T
                            </div>
                            <span className="font-bold text-xl tracking-tight">Traaaction</span>
                        </Link>
                        <p className="text-gray-500 text-sm max-w-sm mb-6">
                            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.
                        </p>
                        <div className="flex gap-4">
                            {/* Social Icons placeholders */}
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="w-8 h-8 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors cursor-pointer" />
                            ))}
                        </div>
                    </div>

                    {Object.entries(footerLinks).map(([category, links]) => (
                        <div key={category}>
                            <h3 className="font-semibold text-gray-900 text-sm mb-4">{category}</h3>
                            <ul className="space-y-3">
                                {links.map((link) => (
                                    <li key={link}>
                                        <Link href="#" className="text-gray-500 hover:text-black text-sm transition-colors">
                                            {link}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
                <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-gray-500">
                        © {new Date().getFullYear()} Traaaction Inc. All rights reserved.
                    </p>
                    <div className="flex gap-6">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        <span className="text-sm text-gray-500">All systems normal</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
