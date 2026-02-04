"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, MessageSquare, CheckCheck } from "lucide-react";

export default function NetworkingChatVisual() {
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

            <div className="relative w-full max-w-[300px] flex flex-col gap-6 scale-90 md:scale-100">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={key}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-6"
                    >
                        {/* 1. Seller Message (Marie) */}
                        <motion.div
                            initial={{ opacity: 0, x: 20, scale: 0.8 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            transition={{ delay: 1, duration: 0.4 }}
                            className="flex flex-col items-end gap-2"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Marie L.</span>
                                <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden">
                                    <img src="/Logotrac/launding/femme1.png" alt="Marie" className="w-full h-full object-cover grayscale" />
                                </div>
                            </div>
                            <div className="bg-violet-600 text-white p-4 rounded-3xl rounded-tr-none shadow-xl max-w-[90%]">
                                <p className="text-sm font-medium leading-relaxed">
                                    Just closed a deal for the Premium Plan! 🚀
                                </p>
                            </div>
                            <div className="flex items-center gap-1 pr-1">
                                <span className="text-[9px] text-slate-400">10:42 AM</span>
                                <CheckCheck className="w-3.5 h-3.5 text-violet-500" />
                            </div>
                        </motion.div>

                        {/* Typing Indicator (Briefly) */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{
                                opacity: [0, 1, 1, 0]
                            }}
                            transition={{
                                times: [0, 0.1, 0.9, 1],
                                delay: 2.2,
                                duration: 0.8
                            }}
                            className="flex gap-1.5 pl-2"
                        >
                            {[0, 1, 2].map(i => (
                                <motion.div
                                    key={i}
                                    animate={{ y: [0, -3, 0] }}
                                    transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                                    className="w-1.5 h-1.5 rounded-full bg-slate-300"
                                />
                            ))}
                        </motion.div>

                        {/* 2. Startup Reply */}
                        <motion.div
                            initial={{ opacity: 0, x: -20, scale: 0.8 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            transition={{ delay: 3, duration: 0.4 }}
                            className="flex flex-col items-start gap-2"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-[11px] text-white font-bold border-2 border-white shadow-sm">
                                    T
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Startup Team</span>
                            </div>
                            <div className="bg-white text-slate-700 p-4 rounded-3xl rounded-tl-none shadow-xl border border-slate-100 max-w-[90%]">
                                <p className="text-sm font-medium leading-relaxed">
                                    Amazing work Marie! That brings you to the top of the leaderboard. Keep it up! 👏
                                </p>
                            </div>
                            <span className="text-[9px] text-slate-400 pl-2">10:43 AM</span>
                        </motion.div>

                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
