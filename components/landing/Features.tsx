'use client';

import { BarChart2, Link2, ShieldCheck, Zap, Globe2, Users } from 'lucide-react';

const features = [
    {
        title: "Real-time Analytics",
        description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod.",
        icon: BarChart2,
        colSpan: "lg:col-span-2",
    },
    {
        title: "Global CDN",
        description: "Ut enim ad minim veniam, quis nostrud exercitation ullamco.",
        icon: Globe2,
        colSpan: "lg:col-span-1",
    },
    {
        title: "Team Collaboration",
        description: "Duis aute irure dolor in reprehenderit in voluptate velit esse.",
        icon: Users,
        colSpan: "lg:col-span-1",
    },
    {
        title: "Advanced Security",
        description: "Excepteur sint occaecat cupidatat non proident, sunt in culpa.",
        icon: ShieldCheck,
        colSpan: "lg:col-span-2",
    },
    {
        title: "Smart Links",
        description: "Nemo enim ipsam voluptatem quia voluptas sit aspernatur.",
        icon: Link2,
        colSpan: "lg:col-span-3",
    },
];

export function Features() {
    return (
        <section id="features" className="py-24 bg-white relative overflow-hidden">
            {/* Subtle grid background */}
            <div className="absolute inset-0 bg-grid-small-black/[0.1] -z-10" />
            <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white -z-10" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-4">
                        Powerful Features for Modern Teams
                    </h2>
                    <p className="text-lg text-gray-600 font-medium">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, idx) => (
                        <div
                            key={idx}
                            className={`relative group bg-white/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${feature.colSpan}`}
                        >
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <feature.icon className="w-24 h-24" />
                            </div>

                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-50 rounded-lg flex items-center justify-center mb-6 border border-gray-100 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                                    <feature.icon className="w-6 h-6 text-gray-900" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3 tracking-tight">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-500 leading-relaxed font-medium text-sm">
                                    {feature.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
