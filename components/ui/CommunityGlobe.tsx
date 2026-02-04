"use client";

import React, { useEffect, useRef } from 'react';
import createGlobe from 'cobe';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { Link2, MousePointer2, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

const CITY_COORDINATES = [
    { name: 'Paris', lat: 48.8566, lng: 2.3522 },
    { name: 'New York', lat: 40.7128, lng: -74.0060 },
    { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
    { name: 'London', lat: 51.5074, lng: -0.1278 },
    { name: 'Singapore', lat: 1.3521, lng: 103.8198 },
    { name: 'Sydney', lat: -33.8688, lng: 151.2093 },
    { name: 'Sao Paulo', lat: -23.5505, lng: -46.6333 },
];

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function CommunityGlobe() {
    const t = useTranslations('landing.globe');
    const { data: stats } = useSWR('/api/stats/platform', fetcher, {
        refreshInterval: 60000,
        revalidateOnFocus: false
    });

    const formatNumber = (num: number) => new Intl.NumberFormat('fr-FR').format(num);
    const formatCurrency = (num: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);

    return (
        <section className="py-24 bg-gradient-to-b from-white to-slate-50/50 border-t border-slate-200 overflow-hidden relative">
            <div className="container mx-auto px-4 max-w-6xl relative z-20 flex flex-col items-center">

                {/* 1. Centered Header */}
                <div className="text-center max-w-3xl mb-16 space-y-4">
                    <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-slate-900">
                        {t('title')}
                    </h2>
                    <p className="text-lg text-slate-500 leading-relaxed">
                        {t('subtitle')} <span className="text-violet-600 font-semibold">{t('subtitleHighlight')}</span>{t('subtitleEnd')}
                    </p>
                </div>

                {/* 2. Floating Stats Grid (Glassmorphism) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl relative z-30 mb-[-50px]">
                    <StatCard
                        label={t('linksCreated')}
                        value={stats ? formatNumber(stats.links) : "124 064 982"}
                        icon={Link2}
                        delay={0.1}
                    />
                    {/* Center Card Pops Out More */}
                    <StatCard
                        label={t('revenueTracked')}
                        value={stats ? formatCurrency(stats.revenue) : "$466,536,413.64"}
                        icon={TrendingUp}
                        delay={0.2}
                        featured
                    />
                    <StatCard
                        label={t('clicksTracked')}
                        value={stats ? formatNumber(stats.clicks) : "1 814 203 631"}
                        icon={MousePointer2}
                        delay={0.3}
                    />
                </div>

                {/* 3. The Horizon Globe */}
                <div className="hidden md:block relative w-full max-w-[1000px] h-[500px] md:h-[600px] mt-8 select-none pointer-events-none">
                    {/* Top fade to blend with stats */}
                    <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-slate-50/0 via-slate-50/0 to-transparent z-10" />
                    <Globe />
                </div>

            </div>
        </section>
    );
}

function StatCard({ label, value, icon: Icon, delay, featured }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.5 }}
            className={`
                relative flex flex-col items-center justify-center text-center p-6 rounded-2xl border
                backdrop-blur-xl transition-all duration-300
                ${featured
                    ? "bg-white/80 border-violet-100 shadow-[0_8px_30px_-5px_rgba(124,58,237,0.15)] md:-mt-6 z-10"
                    : "bg-white/60 border-slate-200/60 shadow-sm hover:bg-white/80"
                }
            `}
        >
            <div className={`p-3 rounded-xl mb-4 ${featured ? "bg-violet-50 text-violet-600" : "bg-slate-50 text-slate-500"}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div className="text-3xl font-bold text-slate-900 tracking-tight mb-1 tabular-nums">
                {value}
            </div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                {label}
            </div>
        </motion.div>
    );
}

function Globe() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const phi = useRef(0);

    useEffect(() => {
        let width = 0;
        const onResize = () => canvasRef.current && (width = canvasRef.current.offsetWidth);
        window.addEventListener('resize', onResize);
        onResize();

        if (!canvasRef.current) return;

        const globe = createGlobe(canvasRef.current, {
            devicePixelRatio: 2,
            width: width * 2,
            height: 1200 * 2, // Taller to push it down
            phi: 0,
            theta: 0.2, // Low angle for "Horizon" look
            dark: 0,
            diffuse: 1.2,
            mapSamples: 20000,
            mapBrightness: 2,
            baseColor: [1, 1, 1],
            markerColor: [0.486, 0.227, 0.929],
            glowColor: [1, 1, 1],
            opacity: 0.85,
            markers: CITY_COORDINATES.map(city => ({ location: [city.lat, city.lng], size: 0.05 })),
            onRender: (state) => {
                phi.current += 0.001;
                state.phi = phi.current;
                state.width = width * 2;
                state.height = 1200 * 2;
            }
        });

        return () => {
            globe.destroy();
            window.removeEventListener('resize', onResize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', aspectRatio: 1 }}
            className="opacity-70"
        />
    );
}
