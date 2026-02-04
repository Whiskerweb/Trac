"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Users, Globe, ArrowUpRight, Link as LinkIcon, Briefcase, UserPlus, Check, X, Star, ArrowRight, MousePointer2, Zap, BarChart3, ShoppingBag } from "lucide-react";
import { useState, useEffect, createElement } from "react";
import EuropeMap from "../ui/EuropeMap";
import ConnectionVisual from "../ui/ConnectionVisual";
import PayoutsVisual from "../ui/PayoutsVisual";
import DetailedAnalyticsChart from "../ui/DetailedAnalyticsChart";
// ... (skipping other lines for brevity in thought, but tool needs exact target)
import MissionSelectorVisual from "../ui/MissionSelectorVisual";
import SellerCardsVisual from "../ui/SellerCardsVisual";
import { AdvancedFeatures, Tab } from "./AdvancedFeatures";

export const B2BFeatures = () => {
    return (
        <section id="startups" className="bg-white border-y border-slate-200">
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
            {/* Testimonial Section - Kate B. Masson */}
            <div className="border-t border-slate-200 bg-white relative overflow-hidden">
                {/* Dot Grid Background */}
                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-60" />

                <div className="container mx-auto px-4 max-w-5xl py-24 relative z-10">
                    <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-12 md:gap-20">

                        {/* Left: Quote */}
                        <blockquote className="flex-1 text-xl md:text-2xl font-medium text-slate-900 leading-tight tracking-tight text-center md:text-left">
                            &quot;Traaaction is solving a major painpoint in Europe and in the rest of the world: start-ups need sales traction to raise money. Young professionals are keen to work on sales missions to kick-off their careers and generate revenue. Traaaction is there to connect start-ups and young professionals for the best!&quot;
                        </blockquote>

                        {/* Right: Profile Stack */}
                        <div className="flex flex-col items-center md:items-end gap-6 shrink-0">
                            <div className="text-center md:text-right">
                                <div className="font-bold text-slate-900 text-lg">Kate B. Masson</div>
                                <div className="text-sm text-slate-500 font-medium">Co-founder Traaaction</div>
                            </div>

                            {/* Avatar at bottom right like reference */}
                            <a
                                href="https://www.linkedin.com/in/catherine-kate-bourlier-masson/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden border border-slate-200 shadow-sm grayscale hover:grayscale-0 transition-all duration-500 block"
                            >
                                <img
                                    src="/Logotrac/katemasson.png"
                                    alt="Kate B. Masson"
                                    className="w-full h-full object-cover"
                                />
                            </a>
                        </div>

                    </div>
                </div>
            </div>

            {/* Secondary Features Switcher (Dub.co Analytics/Insights Style) */}
            <div className="bg-white border-t border-slate-200">
                <div className="container mx-auto px-4 max-w-5xl py-24">
                    <AdvancedFeatures tabs={managementTabs} />
                </div>
            </div>
        </section >
    );
};

const managementTabs: Tab[] = [
    {
        id: 0,
        title: "Connection domains",
        desc: "Bypass ad-blockers and ensure every click is counted with our advanced link infrastructure.",
        color: "emerald",
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
