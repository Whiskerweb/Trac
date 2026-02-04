"use client";

import { ArrowRight, Check } from "lucide-react";
import { useTranslations } from 'next-intl';
import SellerProfileVisual from "../ui/SellerProfileVisual";
import MissionJoinVisual from "../ui/MissionJoinVisual";
import SellerEarningsVisual from "../ui/SellerEarningsVisual";

export const CutThroughTheNoise = () => {
    const t = useTranslations('landing.sellerSteps');

    return (
        <section id="sellers" className="bg-white border-y border-slate-200">
            <div className="container mx-auto px-4 max-w-5xl py-24">

                {/* Header - Centered per reference */}
                <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 border border-violet-100 text-violet-600 text-xs font-bold uppercase tracking-wide mb-2">
                        {t('badge')}
                    </div>
                    <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-slate-900">
                        {t('title')}
                    </h2>
                    <p className="text-lg text-slate-500 leading-relaxed font-medium">
                        {t('subtitle')} <span className="text-slate-900 font-semibold">Traaaction</span>.
                    </p>
                </div>

                {/* Grid with Dividers */}
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 border-t border-slate-200">

                    {/* Step 1 */}
                    <FeatureColumn
                        step="01"
                        title={t('step1.title')}
                        description={t('step1.description')}
                        delay={0}
                    >
                        <SellerProfileVisual />
                    </FeatureColumn>

                    {/* Step 2 */}
                    <FeatureColumn
                        step="02"
                        title={t('step2.title')}
                        description={t('step2.description')}
                        delay={0.1}
                    >
                        <MissionJoinVisual />
                    </FeatureColumn>

                    {/* Step 3 */}
                    <FeatureColumn
                        step="03"
                        title={t('step3.title')}
                        description={t('step3.description')}
                        delay={0.2}
                    >
                        <SellerEarningsVisual />
                    </FeatureColumn>

                </div>
            </div>
        </section>
    );
};

// Local Helper Component
const FeatureColumn = ({
    step,
    title,
    description,
    children,
    delay
}: {
    step: string;
    title: string;
    description: string;
    children: React.ReactNode;
    delay: number;
}) => (
    <div className="flex flex-col pt-12 pb-8 px-6 md:px-8 group bg-white h-full relative">
        {/* Step Indicator - Floating/Prominent */}
        <div className="absolute top-0 left-8 -translate-y-1/2 bg-white border border-slate-100 shadow-sm text-lg font-bold text-violet-600 w-12 h-12 flex items-center justify-center rounded-2xl rotate-3 group-hover:rotate-6 transition-transform z-10">
            {step}
        </div>

        {/* Visual Container - Clean white space */}
        <div className="h-[280px] w-full flex items-start justify-center mb-8 relative">
            {children}
        </div>

        {/* Content */}
        <div className="mt-auto relative">
            <h3 className="text-xl font-bold text-slate-900 mb-3 bg-transparent">{title}</h3>
            <p className="text-base text-slate-500 leading-relaxed mb-6">
                {description}
            </p>
        </div>
    </div>
);
