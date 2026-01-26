"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Users, Globe, ArrowUpRight, Link as LinkIcon, Briefcase, UserPlus, Check, X, Star, ArrowRight, MousePointer2, Zap, BarChart3, ShoppingBag } from "lucide-react";
import Image from "next/image";
import { useState, useEffect, createElement } from "react";
import EuropeMap from "../ui/EuropeMap";
import ConnectionVisual from "../ui/ConnectionVisual";
import PayoutsVisual from "../ui/PayoutsVisual";
import DetailedAnalyticsChart from "../ui/DetailedAnalyticsChart";
// ... (skipping other lines for brevity in thought, but tool needs exact target)
import MissionSelectorVisual from "../ui/MissionSelectorVisual";
import SellerCardsVisual from "../ui/SellerCardsVisual";

export const B2BFeatures = () => {
    return (
        <section className="bg-white border-y border-slate-200">
            <div className="container mx-auto px-4 max-w-5xl pt-16">

                {/* Header - Centered per reference */}
                <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
                    <h2 className="text-4xl md:text-6xl font-medium tracking-tight text-slate-900">
                        Cut through the noise
                    </h2>
                    <p className="text-lg text-slate-500 leading-relaxed font-medium">
                        Our platform gives partner startups a complete dashboard to track and truly control their <span className="text-slate-900">Traaaction</span>.
                    </p>
                </div>

                {/* Grid with Dividers */}
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 border-t border-slate-200">

                    {/* Column 1 */}
                    <FeatureColumn
                        title="Detailed Analytics"
                        description="Stop flying blind. Access powerful, actionable insights to guide your growth."
                        buttonText="Learn more"
                        delay={0}
                    >
                        <DetailedAnalyticsChart />
                    </FeatureColumn>

                    {/* Column 2 */}
                    <FeatureColumn
                        title="Made for you"
                        description="Generate tracked links for e-stores, launch referral programs, or use pay-per-lead."
                        buttonText="Learn more"
                        delay={0.1}
                    >
                        <MissionSelectorVisual />
                    </FeatureColumn>

                    {/* Column 3 */}
                    <FeatureColumn
                        title="Choose your Sellers"
                        description="Public, private, or invite-only: You decide exactly who represents your brand."
                        buttonText="Learn more"
                        delay={0.2}
                    >
                        <SellerCardsVisual />
                    </FeatureColumn>

                </div>
            </div>


            {/* Testimonial Section - Kate B. Masson */}
            <div className="border-t border-slate-200 bg-slate-50/50">
                <div className="container mx-auto px-4 max-w-4xl py-20">
                    <div className="flex flex-col items-center text-center space-y-6">
                        <div className="w-16 h-16 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
                            <Image src="/Logotrac/katemasson.png" alt="Kate B. Masson" width={64} height={64} className="object-cover w-full h-full" />
                        </div>
                        <blockquote className="text-xl md:text-2xl font-medium text-slate-900 leading-relaxed max-w-2xl">
                            &quot;Traaaction is solving a major painpoint in Europe and in the rest of the world: start-ups need sales traction to raise money. Young professionals are keen to work on sales missions to kick-off their careers and generate revenue. Traaaction is there to connect start-ups and young professionals for the best!&quot;
                        </blockquote>
                        <div>
                            <div className="font-bold text-slate-900">Kate B. Masson</div>
                            <div className="text-sm text-slate-500">Co-founder Traaaction</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Secondary Features Switcher (Dub.co Analytics/Insights Style) */}
            <div className="bg-white border-t border-slate-200">
                <div className="container mx-auto px-4 max-w-5xl py-24">
                    <SecondaryFeatures />
                </div>
            </div>
        </section >
    );
};

// --- Secondary Features Component (Bottom Nav + Top Visual) ---

const SecondaryFeatures = () => {
    const [activeTab, setActiveTab] = useState(0);

    const tabs = [
        {
            id: 0,
            title: "Connection domains",
            desc: "Bypass ad-blockers and ensure every click is counted with our advanced link infrastructure.",
            color: "emerald", // Green like provided screenshot
            visual: ConnectionVisual
        },
        {
            id: 1,
            title: "Cross-border Expansion",
            desc: "Scale across Europe. Select and manage local experts in France, Germany, or Spain directly.",
            color: "blue",
            visual: EuropeMap
        },
        {
            id: 2,
            title: "Global Payouts",
            desc: "Pay all your partners instantly and simultaneously, anywhere in the world.",
            color: "violet",
            visual: PayoutsVisual
        }
    ];

    return (
        <div className="flex flex-col gap-12">
            {/* 1. Large Visual Display Area (Top) */}
            <div className="w-full aspect-[16/10] md:h-[500px] bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden relative shadow-[inset_0_0_40px_rgba(0,0,0,0.02)]">
                {/* Subtle Grid Background */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] opacity-50" />

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="absolute inset-0 flex items-center justify-center p-4 md:p-8"
                    >
                        {createElement(tabs[activeTab].visual)}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* 2. Tab Navigation (Bottom Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {tabs.map((tab, i) => {
                    const isActive = activeTab === i;
                    // Dynamic border color class
                    const borderColor = isActive
                        ? tab.color === "emerald" ? "border-emerald-500" : tab.color === "blue" ? "border-blue-500" : "border-violet-500"
                        : "border-transparent";

                    const titleColor = isActive ? "text-slate-900" : "text-slate-500";
                    const linkColor = tab.color === "emerald" ? "text-emerald-600" : tab.color === "blue" ? "text-blue-600" : "text-violet-600";

                    return (
                        <button
                            key={i}
                            onClick={() => setActiveTab(i)}
                            className={`flex flex-col text-left group pl-6 border-l-[3px] transition-all duration-300 ${borderColor} hover:border-slate-200`}
                        >
                            <h3 className={`text-lg font-bold mb-2 transition-colors ${titleColor} group-hover:text-slate-700`}>
                                {tab.title}
                            </h3>
                            <p className="text-sm text-slate-500 leading-relaxed mb-3">
                                {tab.desc}
                            </p>
                            <div className={`text-sm font-semibold flex items-center gap-1 ${isActive ? linkColor : "text-slate-400"} group-hover:${linkColor} transition-colors`}>
                                Learn more <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

// --- Sub-components ---

const FeatureColumn = ({
    title,
    description,
    buttonText,
    children,
    delay
}: {
    title: string;
    description: string;
    buttonText: string;
    children: React.ReactNode;
    delay: number;
}) => (
    <div className="flex flex-col pt-12 pb-8 px-6 md:px-8 group bg-white">
        {/* Visual Container - Clean white space */}
        <div className="h-[240px] w-full flex items-start justify-center mb-8 relative">
            {children}
        </div>

        {/* Content */}
        <div className="mt-auto">
            <h3 className="text-xl font-bold text-slate-900 mb-3 bg-transparent">{title}</h3>
            <p className="text-base text-slate-500 leading-relaxed mb-6">
                {description}
            </p>
            <button className="text-sm font-semibold text-slate-900 flex items-center gap-1 group-hover:gap-2 transition-all">
                {buttonText} <ArrowRight className="w-4 h-4" />
            </button>
        </div>
    </div>
);
