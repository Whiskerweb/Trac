"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, Wallet, ArrowDown, Check, Zap } from "lucide-react";

// Types
interface Payee {
    id: string;
    name: string;
    country: string;
    amount: number;
    type: "lead" | "sale";
}

const PAYEES: Payee[] = [
    { id: "1", name: "Lucia Gonzalez", country: "🇦🇷", amount: 0.10, type: "lead" },
    { id: "2", name: "Samantha Johnson", country: "🇺🇸", amount: 1.13, type: "sale" },
    { id: "3", name: "Derek Forbes", country: "🇬🇧", amount: 0.18, type: "lead" },
    { id: "4", name: "Marvin Ta", country: "🇨🇦", amount: 0.46, type: "sale" },
    { id: "5", name: "Oliver Hawthorne", country: "🇬🇧", amount: 0.08, type: "lead" },
    { id: "6", name: "Diego Alvarez", country: "🇪🇸", amount: 0.84, type: "sale" },
    { id: "7", name: "Sarah Miller", country: "🇺🇸", amount: 2.50, type: "sale" },
    { id: "8", name: "Yuki Tanaka", country: "🇯🇵", amount: 0.35, type: "lead" }
];

export default function PayoutsVisual() {
    const [payoutsTotal, setPayoutsTotal] = useState(195.00);
    const [revenueTotal, setRevenueTotal] = useState(1600.00); // 1.6k starting
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPulsing, setIsPulsing] = useState(false);

    // Current active payee
    const currentPayee = PAYEES[currentIndex];
    const prevPayee = PAYEES[(currentIndex - 1 + PAYEES.length) % PAYEES.length];
    const nextPayee = PAYEES[(currentIndex + 1) % PAYEES.length];

    useEffect(() => {
        const interval = setInterval(() => {
            triggerPayout();
        }, 2200);

        return () => clearInterval(interval);
    }, [currentIndex]);

    const triggerPayout = () => {
        setIsPulsing(true);
        setTimeout(() => {
            setPayoutsTotal(prev => prev + currentPayee.amount);
            // Simulate revenue roughly 10x payout (not realistic spread but good visual)
            setRevenueTotal(prev => prev + (currentPayee.amount * 8));

            setTimeout(() => {
                setIsPulsing(false);
                setCurrentIndex(prev => (prev + 1) % PAYEES.length);
            }, 600);
        }, 500);
    };

    return (
        <div className="w-full h-full flex items-center justify-center p-4 md:p-8 bg-slate-50/50 font-sans">
            <div className="flex flex-col items-center w-full max-w-[340px] relative">

                {/* 1. Top Stats - SPLIT CARDS (Distinct from Dub) */}
                <div className="flex gap-3 w-full relative z-20 mb-8">
                    <div className="flex-1 bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-slate-200 p-3 flex flex-col items-center justify-center text-center">
                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Revenue</div>
                        <div className="text-lg font-bold text-slate-900 tabular-nums">
                            {revenueTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                        </div>
                    </div>
                    {/* Active Payout Card */}
                    <div className="flex-1 bg-slate-900 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-slate-800 p-3 flex flex-col items-center justify-center text-center">
                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Paid Out</div>
                        <div className="text-lg font-bold text-white tabular-nums">
                            {payoutsTotal.toFixed(2)} $US
                        </div>
                    </div>
                </div>

                {/* Connecting Logic & Pulse */}
                <div className="absolute top-[80px] bottom-[180px] w-full flex justify-center z-10 pointer-events-none">
                    {/* Dashed Background Line */}
                    <div className="w-px h-full border-l border-dashed border-slate-300" />

                    {/* Pulsing "Coin" Effect */}
                    <AnimatePresence>
                        {isPulsing && (
                            <motion.div
                                initial={{ y: 0, opacity: 1, scale: 1 }}
                                animate={{ y: 140, opacity: 0, scale: 0.5 }}
                                transition={{ duration: 0.5, ease: "easeIn" }}
                                className="absolute top-0 w-3 h-3 rounded-full bg-slate-900 shadow-lg z-30"
                            />
                        )}
                    </AnimatePresence>

                    {/* Central Gateway Icon (Instead of text pill) */}
                    <div className="absolute top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full border-4 border-slate-50 shadow-sm flex items-center justify-center z-20">
                        <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${isPulsing ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 'bg-slate-300'}`} />
                    </div>
                </div>


                {/* 3. Infinite List Area */}
                <div className="w-full mt-20 relative h-[180px] overflow-hidden mask-linear-gradient">
                    {/* Gradient Masks */}
                    <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-slate-50/50 to-transparent z-20 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slate-50/50 to-transparent z-20 pointer-events-none" />

                    <div className="relative w-full h-full flex flex-col items-center justify-start pt-2">
                        <AnimatePresence mode="popLayout">
                            {[currentPayee, nextPayee, PAYEES[(currentIndex + 2) % PAYEES.length]].map((payee, i) => {
                                const isActive = i === 0;
                                return (
                                    <motion.div
                                        key={`${payee.id}-${currentIndex}`}
                                        layout
                                        initial={{ opacity: 0, y: 30, scale: 0.9 }}
                                        animate={{
                                            opacity: isActive ? 1 : 0.4,
                                            y: 0,
                                            scale: isActive ? 1 : 0.9,
                                        }}
                                        exit={{ opacity: 0, y: -20, scale: 0.8 }}
                                        transition={{ duration: 0.4, ease: "backOut" }}
                                        className={`w-full rounded-xl border p-3.5 flex items-center justify-between shadow-sm mb-2 relative z-10 transition-colors duration-500
                                            ${isActive
                                                ? "bg-slate-900 border-slate-900 shadow-xl" // Bold Brand Style
                                                : "bg-white border-slate-100"
                                            }
                                        `}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border 
                                                    ${isActive
                                                        ? "bg-slate-700 border-slate-600 text-slate-200"
                                                        : (payee.type === "sale" ? "bg-amber-100 text-amber-700 border-amber-100" : "bg-blue-100 text-blue-700 border-blue-100")
                                                    }`}>
                                                    {payee.name.split(" ").map(n => n[0]).join("")}
                                                </div>
                                                <div className={`absolute -bottom-0.5 -right-0.5 text-[10px] rounded-full border w-4 h-4 flex items-center justify-center shadow-sm
                                                     ${isActive ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-slate-100 text-slate-500"}
                                                `}>
                                                    {payee.country}
                                                </div>
                                            </div>
                                            <span className={`text-sm font-bold ${isActive ? "text-white" : "text-slate-400"}`}>
                                                {payee.name}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {/* Gateway Status replaced 1099 */}
                                            {isActive && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.5 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800/50 border border-slate-700"
                                                >
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                    <span className="text-[10px] font-bold text-slate-300">Paid</span>
                                                </motion.div>
                                            )}

                                            <span className={`text-sm font-mono font-medium ${isActive ? "text-white" : "text-slate-400"}`}>
                                                ${payee.amount.toFixed(2)}
                                            </span>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>

            </div>
        </div>
    );
}
