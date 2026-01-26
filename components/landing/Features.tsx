'use client';

const CommunityGlobe = dynamic(() => import('../ui/CommunityGlobe'), { ssr: false });
import dynamic from 'next/dynamic';

import { CutThroughTheNoise } from './CutThroughTheNoise';

import { Testimonial } from './Testimonial';
import { AdvancedFeatures, Tab } from './AdvancedFeatures';
import CertifiedAnalyticsVisual from '../ui/CertifiedAnalyticsVisual';
import NetworkingChatVisual from '../ui/NetworkingChatVisual';
import SmartPayoutsVisual from '../ui/SmartPayoutsVisual';
import ConnectionVisual from '../ui/ConnectionVisual';
import PayoutsVisual from '../ui/PayoutsVisual';

export function Features() {
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

const sellerTabs: Tab[] = [
    {
        id: 0,
        title: "Certified Analytics",
        desc: "Visualize your performance with precision. Every sale is certified by Traaaction, turning your results into a verified badge for your professional CV.",
        color: "emerald",
        visual: CertifiedAnalyticsVisual
    },
    {
        id: 1,
        title: "Direct Networking",
        desc: "Talk directly with startup founders and teams. Grow your network and build valuable connections while you sell.",
        color: "blue",
        visual: NetworkingChatVisual
    },
    {
        id: 2,
        title: "Smart Payouts",
        desc: "Your earnings, your choice. Withdraw via Stripe, store funds in your Traaaction Wallet, or convert them into gift cards.",
        color: "violet",
        visual: SmartPayoutsVisual
    }
];
