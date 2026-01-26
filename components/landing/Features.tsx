'use client';

const CommunityGlobe = dynamic(() => import('../ui/CommunityGlobe'), { ssr: false });
import dynamic from 'next/dynamic';

import { CutThroughTheNoise } from './CutThroughTheNoise';

export function Features() {
    return (
        <section id="features">
            <CommunityGlobe />
            <CutThroughTheNoise />
        </section>
    );
}
