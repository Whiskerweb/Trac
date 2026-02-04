'use client';

const CommunityGlobe = dynamic(() => import('../ui/CommunityGlobe'), { ssr: false });
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

import { CutThroughTheNoise } from './CutThroughTheNoise';

import { Testimonial } from './Testimonial';
import { AdvancedFeatures, Tab } from './AdvancedFeatures';
import CertifiedAnalyticsVisual from '../ui/CertifiedAnalyticsVisual';
import NetworkingChatVisual from '../ui/NetworkingChatVisual';
import SmartPayoutsVisual from '../ui/SmartPayoutsVisual';
import ConnectionVisual from '../ui/ConnectionVisual';
import PayoutsVisual from '../ui/PayoutsVisual';

export function Features() {
    const t = useTranslations('landing.sellers');

    const sellerTabs: Tab[] = [
        {
            id: 0,
            title: t('certifiedAnalytics.title'),
            desc: t('certifiedAnalytics.description'),
            color: "emerald",
            visual: CertifiedAnalyticsVisual
        },
        {
            id: 1,
            title: t('networking.title'),
            desc: t('networking.description'),
            color: "blue",
            visual: NetworkingChatVisual
        },
        {
            id: 2,
            title: t('smartPayouts.title'),
            desc: t('smartPayouts.description'),
            color: "violet",
            visual: SmartPayoutsVisual
        }
    ];

    return (
        <section id="features">
            <CommunityGlobe />
            <CutThroughTheNoise />
            <Testimonial />
            <div className="bg-white border-t border-slate-200">
                <div className="container mx-auto px-4 max-w-5xl py-24">
                    <AdvancedFeatures tabs={sellerTabs} initialTab={0} />
                </div>
            </div>
        </section>
    );
}
