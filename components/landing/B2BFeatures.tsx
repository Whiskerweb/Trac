"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Users, Globe, ArrowUpRight, Link as LinkIcon, Briefcase, UserPlus, Check, X, Star, ArrowRight, MousePointer2, Zap, BarChart3, ShoppingBag } from "lucide-react";
import { useState, useEffect, createElement } from "react";
import EuropeMap from "../ui/EuropeMap";
import ConnectionVisual from "../ui/ConnectionVisual";
import PayoutsVisual from "../ui/PayoutsVisual";
import DetailedAnalyticsChart from "../ui/DetailedAnalyticsChart";
import MissionSelectorVisual from "../ui/MissionSelectorVisual";
import SellerCardsVisual from "../ui/SellerCardsVisual";
import { AdvancedFeatures, Tab } from "./AdvancedFeatures";
import { useTranslations } from 'next-intl';

export const B2BFeatures = () => {
    const t = useTranslations('landing');
    const tCommon = useTranslations('common');

    const managementTabs: Tab[] = [
        {
            id: 0,
            title: t('b2b.connectionDomains.title'),
            desc: t('b2b.connectionDomains.description'),
            color: "emerald",
            visual: ConnectionVisual
        },
        {
            id: 1,
            title: t('b2b.crossBorder.title'),
            desc: t('b2b.crossBorder.description'),
            color: "blue",
            visual: EuropeMap
        },
        {
            id: 2,
            title: t('b2b.globalPayouts.title'),
            desc: t('b2b.globalPayouts.description'),
            color: "violet",
            visual: PayoutsVisual
        }
    ];

    return (
        <section id="startups" className="bg-white border-y border-slate-200">
            <div className="container mx-auto px-4 max-w-5xl pt-16">

                {/* Header - Centered per reference */}
                <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
                    <h2 className="text-4xl md:text-6xl font-medium tracking-tight text-slate-900">
                        {t('b2b.title')}
                    </h2>
                    <p className="text-lg text-slate-500 leading-relaxed font-medium">
                        {t('b2b.subtitle')}
                    </p>
                </div>

                {/* Grid with Dividers */}
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 border-t border-slate-200">

                    {/* Column 1 */}
                    <FeatureColumn
                        title={t('features.analytics.title')}
                        description={t('features.analytics.description')}
                        buttonText={tCommon('learnMore')}
                        delay={0}
                    >
                        <DetailedAnalyticsChart />
                    </FeatureColumn>

                    {/* Column 2 */}
                    <FeatureColumn
                        title={t('features.madeForYou.title')}
                        description={t('features.madeForYou.description')}
                        buttonText={tCommon('learnMore')}
                        delay={0.1}
                    >
                        <MissionSelectorVisual />
                    </FeatureColumn>

                    {/* Column 3 */}
                    <FeatureColumn
                        title={t('features.chooseSellers.title')}
                        description={t('features.chooseSellers.description')}
                        buttonText={tCommon('learnMore')}
                        delay={0.2}
                    >
                        <SellerCardsVisual />
                    </FeatureColumn>

                </div>
            </div>


            {/* Testimonial Section - Kate B. Masson */}
            <div className="border-t border-slate-200 bg-white relative overflow-hidden">
                {/* Dot Grid Background */}
                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-60" />

                <div className="container mx-auto px-4 max-w-5xl py-24 relative z-10">
                    <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-12 md:gap-20">

                        {/* Left: Quote */}
                        <blockquote className="flex-1 text-xl md:text-2xl font-medium text-slate-900 leading-tight tracking-tight text-center md:text-left">
                            &quot;{t('testimonial.kate.quote')}&quot;
                        </blockquote>

                        {/* Right: Profile Stack */}
                        <div className="flex flex-col items-center md:items-end gap-6 shrink-0">
                            <div className="text-center md:text-right">
                                <div className="font-bold text-slate-900 text-lg">{t('testimonial.kate.name')}</div>
                                <div className="text-sm text-slate-500 font-medium">{t('testimonial.kate.role')}</div>
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
                                    alt={t('testimonial.kate.name')}
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
