'use client';

import { Check, ArrowRight, Zap } from 'lucide-react';
import Image from 'next/image';

const features = [
    {
        title: "Revenue on Autopilot",
        description: "Set up your commission structure once, and let Traaaction handle the rest. Whether it's percentage-based, flat fee, or recurring – we automate the entire calculation process.",
        points: [
            "Flexible commission rules (Recurring, One-time)",
            "Automated invoice generation",
            "Real-time fraud detection"
        ],
        imageAlign: "right"
    },
    {
        title: "Precision Attribution",
        description: "Stop guessing where your customers come from. Our advanced fingerprinting and first-party cookie technology ensures you never miss a referral tracking event.",
        points: [
            "Server-side tracking (100% accuracy)",
            "Cross-device attribution",
            "90-day cookie life (configurable)"
        ],
        imageAlign: "left"
    },
    {
        title: "Global Payouts",
        description: "Pay your partners in 150+ currencies with a single click. We handle the tax forms, compliance, and currency conversion so you can focus on growth.",
        points: [
            "Stripe Connect integration",
            "Automated W-9/1099 collection",
            "No minimum payout thresholds"
        ],
        imageAlign: "right"
    }
];

export function ValueProps() {
    return (
        <section className="py-32 bg-white overflow-hidden relative">
            {/* Background Glow (Light) */}
            <div className="absolute top-[20%] left-0 w-[500px] h-[500px] bg-blue-50/50 rounded-full blur-[120px] pointer-events-none mix-blend-multiply" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-32 relative z-10">
                {features.map((feature, idx) => (
                    <div key={idx} className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
                        {/* Text Content */}
                        <div className={`flex-1 space-y-8 ${feature.imageAlign === 'left' ? 'lg:order-2' : 'lg:order-1'}`}>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-xs font-mono text-blue-600 font-medium">
                                <Zap className="w-3 h-3" /> FEATURE 0{idx + 1}
                            </div>
                            <h2 className="text-3xl sm:text-5xl font-display font-medium text-slate-900 tracking-tight leading-[1.1]">
                                {feature.title}
                            </h2>
                            <p className="text-lg text-gray-500 leading-relaxed">
                                {feature.description}
                            </p>

                            <ul className="space-y-4">
                                {feature.points.map((point, pIdx) => (
                                    <li key={pIdx} className="flex items-center gap-3 text-slate-700 font-medium">
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                                            <Check className="w-3.5 h-3.5 text-blue-600" />
                                        </div>
                                        {point}
                                    </li>
                                ))}
                            </ul>

                            <div className="pt-4">
                                <button className="group text-sm font-bold text-slate-900 flex items-center gap-2 hover:gap-4 transition-all">
                                    Explore Capabilities <ArrowRight className="w-4 h-4 text-blue-600 group-hover:text-blue-500" />
                                </button>
                            </div>
                        </div>

                        {/* Visual Content */}
                        <div className={`flex-1 w-full ${feature.imageAlign === 'left' ? 'lg:order-1' : 'lg:order-2'}`}>
                            <div className="relative rounded-2xl border border-gray-200 bg-gray-50 p-2 shadow-xl ring-1 ring-gray-950/5 hover:bg-white transition-colors duration-500">
                                <div className="aspect-[4/3] bg-white rounded-xl border border-gray-100 overflow-hidden relative flex items-center justify-center group bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">

                                    {/* Abstract UI Representation - Light Mode */}
                                    <div className="w-3/4 h-3/4 bg-white rounded-lg border border-gray-100 shadow-sm p-6 flex flex-col gap-4 group-hover:scale-[1.02] transition-transform duration-500 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                        <div className="h-4 w-1/3 bg-gray-100 rounded-md" />
                                        <div className="h-32 w-full bg-gray-50 rounded-md border border-gray-100 border-dashed flex items-center justify-center text-xs text-gray-400 font-mono">
                         // VISUALIZATION_LAYER
                                        </div>
                                        <div className="flex gap-2 mt-auto">
                                            <div className="h-2 w-1/4 bg-blue-100 rounded-full" />
                                            <div className="h-2 w-1/4 bg-gray-100 rounded-full" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
