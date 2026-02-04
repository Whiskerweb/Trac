"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Shield, Star, Award, User } from "lucide-react";

export default function CertifiedAnalyticsVisual() {
    const [key, setKey] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setKey(prev => prev + 1);
        }, 11000); // Sync with other visuals rhythm
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full h-full flex items-center justify-center font-sans overflow-hidden bg-slate-50/50">
            {/* Background Pattern */}
            <div className="absolute inset-0 z-0 opacity-40"
                style={{ backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}
            />

            <div className="relative w-[320px] h-[320px] flex items-center justify-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={key}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.5 } }}
                        className="relative z-10 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 overflow-hidden"
                    >
                        {/* Shimmer Effect */}
                        <motion.div
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: "linear" }}
                            className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
                        />

                        {/* Card Content */}
                        <div className="relative z-10 space-y-5">
                            {/* Header: Profile + Badge */}
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-white shadow-sm overflow-hidden grayscale">
                                        <img
                                            src="/Logotrac/launding/femme1.png"
                                            alt="Seller Profile"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="space-y-0.5">
                                        <div className="text-[10px] font-bold text-violet-500 uppercase tracking-widest">Certified Seller</div>
                                        <div className="text-sm font-bold text-slate-900 leading-tight">Marie Laurent</div>
                                    </div>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center text-violet-600 shadow-sm border border-violet-100">
                                    <Award className="w-5 h-5" />
                                </div>
                            </div>

                            {/* Skill Title - Moved down slightly */}
                            <div className="px-1">
                                <div className="text-base font-bold text-slate-800 tracking-tight">Elite Sales Specialist</div>
                            </div>

                            {/* Verification Stats */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase">Sales Volume</div>
                                    <div className="text-sm font-bold text-slate-900">$12,450.00</div>
                                </div>
                                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase">Success Rate</div>
                                    <div className="text-sm font-bold text-slate-900">98.5%</div>
                                </div>
                            </div>

                            {/* Progress Section */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Verification Progress</span>
                                    <motion.span
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-[10px] font-bold text-emerald-600"
                                    >
                                        Next Level: Specialist
                                    </motion.span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: "30%" }}
                                        animate={{ width: ["30%", "100%"] }}
                                        transition={{
                                            duration: 3,
                                            delay: 0.5,
                                            ease: "easeInOut"
                                        }}
                                        className="h-full bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                                    />
                                </div>
                            </div>

                            {/* The Stamp (Invisible at first) */}
                            <motion.div
                                initial={{ scale: 3, opacity: 0, rotate: -15 }}
                                animate={{
                                    scale: [3, 0.9, 1],
                                    opacity: [0, 1, 1],
                                    rotate: [-15, -12, -12]
                                }}
                                transition={{
                                    duration: 0.4,
                                    delay: 3.5,
                                    times: [0, 0.7, 1],
                                    ease: "easeOut"
                                }}
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
                            >
                                <div className="relative">
                                    {/* Stamp Body */}
                                    <div className="bg-emerald-50 text-emerald-600 border-4 border-emerald-500/30 font-black px-4 py-2 rounded-xl text-xl uppercase tracking-tighter transform-gpu shadow-xl flex items-center gap-2">
                                        <Shield className="w-5 h-5 fill-emerald-600/10" />
                                        Certified
                                    </div>

                                    {/* Impact Debris/Sparks */}
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: [0, 1.5, 2], opacity: [0, 1, 0] }}
                                        transition={{ delay: 3.5, duration: 0.6 }}
                                        className="absolute inset-0 bg-emerald-400/20 rounded-full blur-xl"
                                    />
                                </div>
                            </motion.div>

                            {/* Badge/Seal Glow after certification */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0, 1, 0] }}
                                transition={{ delay: 3.6, duration: 1 }}
                                className="absolute inset-x-0 bottom-0 h-1 bg-emerald-400 blur-sm z-30"
                            />
                        </div>

                        {/* Verified Footer */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 4.2 }}
                            className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-center gap-2"
                        >
                            <div className="flex -space-x-1">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-4 h-4 rounded-full bg-slate-100 border border-white" />
                                ))}
                            </div>
                            <span className="text-[9px] font-bold text-slate-400">Verified by 24 Startups</span>
                        </motion.div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
