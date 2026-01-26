"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check, X, Instagram, Linkedin, Link as LinkIcon, Star, TrendingUp } from "lucide-react";
import Image from "next/image";

const SELLERS = [
    {
        id: 1,
        name: "Marie L.",
        role: "Influencer",
        stats: "24k followers",
        img: "/Logotrac/launding/femme1.png",
        icon: Instagram,
        color: "text-pink-600 bg-pink-50 border-pink-100",
        initialY: 0,
        duration: 8
    },
    {
        id: 2,
        name: "Thomas D.",
        role: "Affiliate Pro",
        stats: "+12% Conv.",
        img: "/Logotrac/launding/homme1.png",
        icon: Linkedin,
        color: "text-blue-600 bg-blue-50 border-blue-100",
        initialY: -15,
        duration: 9
    },
    {
        id: 3,
        name: "Sarah C.",
        role: "Networker",
        stats: "50+ Intros",
        img: "/Logotrac/launding/femme2.png",
        icon: LinkIcon,
        color: "text-amber-600 bg-amber-50 border-amber-100",
        initialY: 10,
        duration: 8.5
    },
];

export default function SellerCardsVisual() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none bg-slate-50/20">
            {/* Subtle light effects behind */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-blue-100/30 blur-[60px] rounded-full pointer-events-none" />

            <div className="relative w-full max-w-[300px] h-[220px] flex items-center justify-center">
                {SELLERS.map((seller, i) => {
                    const Icon = seller.icon;
                    return (
                        <motion.div
                            key={seller.id}
                            initial={{ y: seller.initialY, x: 0, scale: 0.9 }}
                            animate={{
                                y: [seller.initialY, seller.initialY - 5, seller.initialY],
                                rotate: [0, i === 1 ? 0 : i === 0 ? -1 : 1, 0] // Subtle localized rotation 
                            }}
                            transition={{
                                duration: seller.duration,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className={`absolute left-0 right-0 mx-auto w-full bg-white/95 backdrop-blur-sm rounded-xl border border-slate-100 p-3 shadow-[0_8px_30px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5 transition-all duration-700
                                ${i === 1
                                    ? 'z-30 translate-y-0 scale-100 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-slate-200'
                                    : i === 0
                                        ? 'z-20 -translate-y-5 scale-95 opacity-80 blur-[0.5px]' // Even tighter spacing (20px)
                                        : 'z-10 translate-y-5 scale-95 opacity-80 blur-[0.5px]'
                                }
                            `}
                            style={{
                                top: 'auto',
                                bottom: 'auto'
                            }}
                        >
                            <div className="flex items-stretch gap-3">
                                {/* Left: Avatar Pro Style */}
                                <div className="relative">
                                    <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-100 shadow-sm">
                                        <Image
                                            src={seller.img}
                                            alt={seller.name}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded bg-white shadow-sm border border-slate-50 flex items-center justify-center ${seller.color}`}>
                                        <Icon className="w-3 h-3" />
                                    </div>
                                </div>

                                {/* Center: Info Hierarchy */}
                                <div className="flex-1 flex flex-col justify-center min-w-0">
                                    <h4 className="text-sm font-bold text-slate-900 leading-tight mb-0.5">{seller.name}</h4>
                                    <span className="text-[11px] font-medium text-slate-500 mb-1.5">{seller.role}</span>

                                    <div className="flex items-center gap-1.5">
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-50 border border-slate-100">
                                            <TrendingUp className="w-3 h-3 text-slate-400" />
                                            <span className="text-[10px] font-semibold text-slate-700">{seller.stats}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Integrated Action Strip */}
                                <div className="flex flex-col gap-1 shrink-0 pl-3 border-l border-slate-50 justify-center">
                                    <button className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center hover:bg-black transition-colors shadow-sm group">
                                        <Check className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    </button>
                                    <button className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-slate-50 hover:text-red-500 hover:border-red-100 transition-colors group">
                                        <X className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
