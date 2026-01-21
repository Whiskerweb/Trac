'use client';

import { BarChart2, Link2, ShieldCheck, Zap, Globe2, Users, Layers } from 'lucide-react';

const features = [
    {
        title: "Real-time Tracking",
        description: "Watch clicks and conversions happen live. No more 24-hour delays.",
        icon: Zap,
        className: "lg:col-span-2",
    },
    {
        title: "Global CDN",
        description: "Links load instantly anywhere in the world.",
        icon: Globe2,
        className: "lg:col-span-1",
    },
    {
        title: "Team Management",
        description: "Invite your team and set granular permissions.",
        icon: Users,
        className: "lg:col-span-1",
    },
    {
        title: "Fraud Protection",
        description: "AI-powered detection blocks suspicious traffic and fake referrals automatically.",
        icon: ShieldCheck,
        className: "lg:col-span-2",
    },
    {
        title: "Smart Links",
        description: "Create branded short links that build trust and increase click-through rates.",
        icon: Link2,
        className: "lg:col-span-3",
    },
];

export function Features() {
    return (
        <section id="features" className="py-24 bg-gray-50 border-t border-gray-200 relative overflow-hidden">
            {/* Background Effects (Light) */}
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
            <div className="absolute -left-20 top-40 w-64 h-64 bg-blue-100/50 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl font-display font-medium tracking-tight text-slate-900 sm:text-4xl mb-4">
                        Everything you need to <span className="text-blue-600">accelerate</span>
                    </h2>
                    <p className="text-lg text-gray-500">
                        Built for speed, reliability, and scale.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, idx) => (
                        <div
                            key={idx}
                            className={`group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 transition-all hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 ${feature.className}`}
                        >
                            <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 border border-gray-100 group-hover:scale-110 transition-transform group-hover:bg-blue-50 group-hover:border-blue-100">
                                <feature.icon className="h-6 w-6 text-gray-600 group-hover:text-blue-600 transition-colors" />
                            </div>

                            <h3 className="mb-2 text-lg font-semibold text-slate-900">
                                {feature.title}
                            </h3>
                            <p className="text-gray-500 leading-relaxed text-sm">
                                {feature.description}
                            </p>

                            {/* Decorative background element */}
                            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gradient-to-br from-gray-50 to-transparent rounded-full opacity-50 blur-2xl group-hover:opacity-100 transition-opacity" />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
