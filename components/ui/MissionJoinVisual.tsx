"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link2, Copy, ArrowRight, MousePointer2, Check } from "lucide-react";
import Image from "next/image";

export default function MissionJoinVisual() {
    const [key, setKey] = useState(0);

    useEffect(() => {
        // Reset every 11s to match the rhythm of the first visual
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

            <div className="relative w-[300px] h-[300px] flex items-center justify-center scale-90">
                <React.Fragment key={key}>

                    {/* 1. Mission Card (Initial State) */}
                    <motion.div
                        initial={{ opacity: 1, scale: 1, y: 0 }}
                        animate={{
                            opacity: [1, 1, 0],
                            scale: [1, 1, 0.9],
                            y: [0, 0, 10]
                        }}
                        transition={{
                            duration: 0.5,
                            times: [0, 0.9, 1],
                            delay: 3.8 // Disappears after click
                        }}
                        className="absolute z-20 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-5"
                    >
                        {/* Brand Header */}
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex gap-3">
                                <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden relative">
                                    {/* Using Traaaction Logo/Favicon */}
                                    <Image
                                        src="/Logotrac/favicon.png"
                                        alt="Traaaction"
                                        width={24}
                                        height={24}
                                        className="object-contain"
                                    />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-900">Traaaction</div>
                                    <div className="text-xs text-slate-500">SaaS B2B</div>
                                </div>
                            </div>
                            <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                                20% OFFER
                            </div>
                        </div>

                        <div className="h-px w-full bg-slate-100 mb-4" />

                        {/* Join Button */}
                        <div className="w-full bg-slate-900 text-white rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-2">
                            Join Mission
                        </div>
                    </motion.div>

                    {/* Simulated Cursor Click */}
                    <motion.div
                        initial={{ x: 60, y: 60, opacity: 0 }}
                        animate={{
                            x: [60, 20, 20],
                            y: [60, 40, 40],
                            opacity: [0, 1, 0],
                            scale: [1, 0.9, 1]
                        }}
                        transition={{
                            duration: 1.5,
                            times: [0, 0.5, 1],
                            delay: 2.5, // Matches the 2.5s wait of previous visual
                        }}
                        className="absolute z-30 text-slate-400"
                    >
                        <MousePointer2 className="w-6 h-6 fill-slate-400" />
                    </motion.div>

                    {/* 2. Link Card (Result State) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: 4.0 }} // Appears after Mission Card vanishes
                        className="absolute z-20 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 pt-8 text-center"
                    >
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500" />

                        <div className="mb-4">
                            <div className="w-12 h-12 rounded-full bg-violet-100 mx-auto flex items-center justify-center mb-2">
                                <Link2 className="w-6 h-6 text-violet-600" />
                            </div>
                            <div className="text-sm font-bold text-slate-900">Link Generated!</div>
                            <div className="text-xs text-slate-500">Ready to share</div>
                        </div>

                        {/* The Link */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center gap-2 mb-2">
                            <div className="flex-1 text-xs font-mono text-slate-600 truncate text-left pl-1">
                                traaaction.com/u/thomas
                            </div>
                        </div>

                        {/* Copy Toast */}
                        <motion.div
                            initial={{ y: 5, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 4.5 }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 text-white rounded-full text-[10px] font-medium"
                        >
                            <Check className="w-3 h-3" /> Copied to clipboard
                        </motion.div>
                    </motion.div>

                </React.Fragment>
            </div>
        </div>
    );
}
