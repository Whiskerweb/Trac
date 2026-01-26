'use client';

const CommunityGlobe = dynamic(() => import('../ui/CommunityGlobe'), { ssr: false });
import dynamic from 'next/dynamic';

export function Features() {
    return (
        <section id="features">
            <CommunityGlobe />
        </section>
    );
}
