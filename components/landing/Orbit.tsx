import React from "react";
import { cn } from "@/lib/utils";

// --- Components ---

// 1. Seller Profile Card (Compact)
const SellerCard = ({
    name,
    flag,
    revenue,
    payouts,
    initials,
    color,
    imageSrc
}: {
    name: string;
    flag: string;
    revenue: string;
    payouts: string;
    initials: string;
    color: string;
    imageSrc?: string;
}) => (
    // Compact padding and width
    <div className="bg-white p-2.5 rounded-xl shadow-lg border border-slate-100 w-[210px] flex items-center gap-2.5 select-none hover:scale-105 transition-transform z-10">
        {/* Avatar */}
        <div className={cn("w-10 h-10 rounded-lg shrink-0 overflow-hidden", color)}>
            {imageSrc ? (
                <img
                    src={imageSrc}
                    alt={name}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                    {initials}
                </div>
            )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs border border-slate-100 rounded px-1 min-w-[18px] text-center">{flag}</span>
                <span className="font-semibold text-slate-900 text-xs truncate">{name}</span>
            </div>

            <div className="flex items-center divide-x divide-slate-200">
                <div className="pr-2">
                    <div className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">Rev</div>
                    <div className="text-xs font-bold text-slate-700">{revenue}</div>
                </div>
                <div className="pl-2">
                    <div className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">Pay</div>
                    <div className="text-xs font-bold text-slate-700">{payouts}</div>
                </div>
            </div>
        </div>
    </div>
);

// 2. Startup Card (Compact)
const StartupCard = ({
    name,
    logoSrc,
    missions,
    sellers,
    logoBg
}: {
    name: string;
    logoSrc: string;
    missions: number;
    sellers: number;
    logoBg?: string;
}) => (
    // Compact padding and width
    <div className="bg-white p-3 rounded-[1.5rem] shadow-lg border border-slate-100 flex items-center gap-3 select-none hover:scale-105 transition-transform min-w-[260px] z-20">
        {/* Large Logo */}
        <div className={cn("w-12 h-12 rounded-xl shrink-0 overflow-hidden shadow-sm", logoBg || "bg-white")}>
            <img
                src={logoSrc}
                alt={name}
                className="w-full h-full object-contain p-1.5"
            />
        </div>

        {/* Info */}
        <div className="flex-1 flex flex-col gap-1">
            {/* Startup Name */}
            <h3 className="text-base font-bold text-slate-900 tracking-tight leading-none">
                {name}
            </h3>

            {/* Stats */}
            <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-medium text-slate-600 bg-slate-50/50 px-1.5 py-0.5 rounded-md border border-slate-100/50">
                    <span>{missions} missions online</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.5)]"></span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-medium text-slate-600 bg-slate-50/50 px-1.5 py-0.5 rounded-md border border-slate-100/50">
                    <span>{sellers} active sellers</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.5)]"></span>
                </div>
            </div>
        </div>
    </div>
);

export const Orbit = ({ className }: { className?: string }) => {
    return (
        <div className={cn("absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none", className)}>

            {/* Container for the rotating system */}
            <div className="relative flex items-center justify-center">

                {/* --- Outer Circle (Large): Mix of Startups & Sellers --- */}
                <div className="absolute rounded-full border-2 border-slate-300/50 dark:border-white/20 w-[800px] h-[800px] md:w-[1200px] md:h-[1200px] animate-[spin_60s_linear_infinite]">

                    {/* 1. STARTUP: Traaaction (Top Left) */}
                    <div className="absolute top-[18%] left-[18%] -translate-x-1/2 -translate-y-1/2 animate-[spin_60s_linear_infinite_reverse]">
                        <StartupCard
                            name="Traaaction"
                            logoSrc="/Logotrac/NoirPlein.png"
                            missions={3}
                            sellers={191}
                            logoBg="bg-white"
                        />
                    </div>

                    {/* 2. SELLER: Thomas (Bottom Right) */}
                    <div className="absolute top-[82%] left-[82%] -translate-x-1/2 -translate-y-1/2 animate-[spin_60s_linear_infinite_reverse]">
                        <SellerCard
                            name="Thomas Müller"
                            flag="🇩🇪"
                            revenue="€4.1K"
                            payouts="€1.2K"
                            initials="TM"
                            color="bg-amber-500"
                            imageSrc="/Logotrac/launding/homme1.png"
                        />
                    </div>

                    {/* 3. SELLER: Marie (Top Right-ish area) */}
                    <div className="absolute top-[20%] right-[20%] translate-x-1/2 -translate-y-1/2 animate-[spin_60s_linear_infinite_reverse]">
                        <SellerCard
                            name="Marie Laurent"
                            flag="🇫🇷"
                            revenue="€2.4K"
                            payouts="€850"
                            initials="ML"
                            color="bg-indigo-500"
                            imageSrc="/Logotrac/launding/femme1.png"
                        />
                    </div>
                </div>

                {/* --- Inner Circle (Medium): More mix --- */}
                <div className="absolute rounded-full border-2 border-slate-300/50 dark:border-white/20 w-[500px] h-[500px] md:w-[800px] md:h-[800px] animate-[spin_40s_linear_infinite_reverse]">

                    {/* 4. STARTUP: Beo Healthcare (Right) */}
                    <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 animate-[spin_40s_linear_infinite]">
                        <StartupCard
                            name="Beo Healthcare"
                            logoSrc="/Logotrac/logo4.jpg"
                            missions={5}
                            sellers={42}
                            logoBg="bg-white"
                        />
                    </div>

                    {/* 5. SELLER: Lucía (Bottom Left) */}
                    <div className="absolute bottom-0 left-[20%] -translate-x-1/2 translate-y-1/2 animate-[spin_40s_linear_infinite]">
                        <SellerCard
                            name="Lucía Garcia"
                            flag="🇪🇸"
                            revenue="€3.8K"
                            payouts="€950"
                            initials="LG"
                            color="bg-rose-500"
                            imageSrc="/Logotrac/launding/femme2.png"
                        />
                    </div>
                </div>

            </div>

            {/* Radial fade to blend edges */}
            <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-white/90" />
        </div>
    );
};
