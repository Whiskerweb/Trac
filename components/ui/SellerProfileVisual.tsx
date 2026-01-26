"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, MousePointer2 } from "lucide-react";
import Image from "next/image";

export default function SellerProfileVisual() {
    const [key, setKey] = useState(0);

    useEffect(() => {
        // Total cycle duration: ~8.5s animation + buffer
        // Resets every 11 seconds to guarantee the 2.5s "Initial Delay" happens every time
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

            {/* Scale Wrapper */}
            <div className="relative w-[300px] h-[300px] flex items-center justify-center scale-90">

                {/* Wrap in AnimatePresence with key to force full reset */}
                <React.Fragment key={key}>

                    {/* 1. The Button (Initial State) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }} // Fades in on reset
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }} // Smooth entry for new loop
                        className="absolute z-20"
                    >
                        <motion.div
                            animate={{
                                scale: [1, 0.95, 1.1, 0],
                                opacity: [1, 1, 0, 0]
                            }}
                            transition={{
                                duration: 1.5,
                                times: [0, 0.2, 0.3, 0.4],
                                delay: 2.8, // Long delay before action
                            }}
                            className="bg-slate-900 text-white px-6 py-2.5 rounded-full shadow-xl flex items-center gap-2 font-semibold text-sm whitespace-nowrap"
                        >
                            Become a Seller <ArrowRight className="w-4 h-4" />
                        </motion.div>
                    </motion.div>

                    {/* Simulated Cursor Click */}
                    <motion.div
                        initial={{ x: 40, y: 40, opacity: 0 }}
                        animate={{
                            x: [40, 0, 0],
                            y: [40, 0, 0],
                            opacity: [0, 1, 0],
                            scale: [1, 0.9, 1]
                        }}
                        transition={{
                            duration: 1,
                            times: [0, 0.5, 1],
                            delay: 2.5, // Long delay before start
                        }}
                        className="absolute z-30 text-slate-400"
                    >
                        <MousePointer2 className="w-6 h-6 fill-slate-400" />
                    </motion.div>

                    {/* 2. The Profile Card (Result State) */}
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{
                            scale: [0.5, 1, 1, 0.5],
                            opacity: [0, 1, 1, 0]
                        }}
                        transition={{
                            duration: 4,
                            times: [0, 0.1, 0.9, 1],
                            delay: 4.0, // Appears after button
                        }}
                        className="absolute z-10 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 p-5 flex flex-col items-center text-center overflow-hidden"
                    >
                        {/* Success Burst Background */}
                        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/50 to-transparent" />

                        {/* Avatar */}
                        <div className="relative w-16 h-16 mb-3">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 4.1, type: "spring" }}
                                className="w-full h-full rounded-full bg-slate-100 border-4 border-white shadow-sm flex items-center justify-center overflow-hidden relative"
                            >
                                <Image
                                    src="/Logotrac/launding/homme1.png"
                                    alt="Seller Profile"
                                    fill
                                    className="object-cover"
                                />
                            </motion.div>
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 4.3, type: "spring" }}
                                className="absolute bottom-0 right-0 bg-emerald-500 text-white p-1 rounded-full border-2 border-white"
                            >
                                <Check className="w-3 h-3" strokeWidth={3} />
                            </motion.div>
                        </div>

                        {/* Text Content */}
                        <motion.div
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 4.2 }}
                            className="relative space-y-0.5"
                        >
                            <div className="text-base font-bold text-slate-900">Thomas M.</div>
                            <div className="text-xs font-medium text-slate-500">Seller Account</div>
                        </motion.div>

                        {/* Badge */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 4.4 }}
                            className="mt-4 flex items-center gap-2 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg"
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-semibold text-slate-600">Active & Verified</span>
                        </motion.div>

                    </motion.div>

                </React.Fragment>
            </div>
        </div>
    );
}
