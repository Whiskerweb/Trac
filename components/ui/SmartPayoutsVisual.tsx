"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Gift, Building2 } from "lucide-react";

export default function SmartPayoutsVisual() {
    const [key, setKey] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setKey(prev => prev + 1);
        }, 11000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full h-full flex items-center justify-center font-sans overflow-hidden bg-slate-50/50">
            {/* Background Pattern */}
            <div className="absolute inset-0 z-0 opacity-40"
                style={{ backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}
            />

            <div className="relative w-full max-w-[340px] flex flex-col items-center gap-2 scale-90 md:scale-100">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={key}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="w-full flex flex-col items-center"
                    >
                        {/* 1. Main Balance Source */}
                        <motion.div
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            className="bg-white px-8 py-5 rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-slate-200 flex flex-col items-center text-center z-20 relative min-w-[220px]"
                        >
                            <div className="mb-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Earnings</span>
                            </div>
                            <div className="text-3xl font-bold text-slate-900 tracking-tight">€1,240.50</div>
                            <div className="flex items-center gap-1.5 mt-2 px-2 py-1 bg-emerald-50 rounded-full border border-emerald-100">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-emerald-700">Available to payout</span>
                            </div>
                        </motion.div>

                        {/* Connection Lines (SVG) */}
                        <div className="relative h-16 w-full flex justify-center -my-1 z-0">
                            <svg width="200" height="64" viewBox="0 0 200 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute top-0">
                                <motion.path
                                    d="M100 0 V20 C100 40 40 24 40 64"
                                    stroke="#CBD5E1"
                                    strokeWidth="1.5"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 0.8, delay: 0.5 }}
                                />
                                <motion.path
                                    d="M100 0 V20 C100 40 160 24 160 64"
                                    stroke="#CBD5E1"
                                    strokeWidth="1.5"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 0.8, delay: 0.5 }}
                                />
                            </svg>
                        </div>

                        {/* 2. Options Row */}
                        <div className="flex gap-4 w-full justify-center px-4 relative z-10">

                            {/* Option A: Stripe / Bank */}
                            <motion.div
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 1.2 }}
                                className="flex-1 bg-white p-4 rounded-xl border border-slate-200 hover:border-violet-500 transition-colors cursor-pointer group flex flex-col items-center gap-3 relative shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                            >
                                <div className="w-10 h-10 rounded-full bg-[#635BFF]/10 flex items-center justify-center text-[#635BFF] group-hover:bg-[#635BFF] group-hover:text-white transition-all duration-300">
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <div className="text-center">
                                    <div className="text-xs font-bold text-slate-900">Bank Transfer</div>
                                    <div className="text-[10px] font-medium text-slate-400 mt-0.5">via Stripe</div>
                                </div>
                            </motion.div>

                            {/* Option B: Gift Cards */}
                            <motion.div
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 1.4 }}
                                className="flex-1 bg-white p-4 rounded-xl border border-slate-200 hover:border-pink-500 transition-colors cursor-pointer group flex flex-col items-center gap-3 relative shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                            >
                                <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center text-pink-500 group-hover:bg-pink-500 group-hover:text-white transition-all duration-300">
                                    <Gift className="w-5 h-5" />
                                </div>
                                <div className="text-center">
                                    <div className="text-xs font-bold text-slate-900">Gift Cards</div>
                                    <div className="text-[10px] font-medium text-slate-400 mt-0.5">Instant code</div>
                                </div>
                            </motion.div>

                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
