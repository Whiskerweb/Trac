"use client";

import React, { useState, useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { Wallet, Bell, DollarSign, ArrowUpRight } from "lucide-react";
import Image from "next/image";

export default function SellerEarningsVisual() {
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

            <div className="relative w-[300px] h-[300px] flex items-center justify-center scale-90">
                <React.Fragment key={key}>

                    {/* Device Interface (The Wallet) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="absolute z-10 w-64 h-[220px] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="h-14 border-b border-slate-100 flex items-center justify-between px-5 bg-slate-50/50">
                            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                                <Wallet className="w-4 h-4 text-slate-500" />
                                <span>Wallet</span>
                            </div>
                            <div className="relative">
                                <Bell className="w-4 h-4 text-slate-400" />
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 2.8, type: "spring", stiffness: 200, damping: 20 }}
                                    className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border border-white"
                                />
                            </div>
                        </div>

                        {/* Balance Area */}
                        <div className="flex-1 p-5 flex flex-col items-center justify-center relative">
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Total Balance</div>

                            <div className="text-3xl font-bold text-slate-900 tabular-nums flex items-center">
                                $
                                <SmoothCounter target={165.50} delay={2.6} />
                            </div>

                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 5.0, duration: 0.6, ease: "easeOut" }}
                                className="mt-4 flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg"
                            >
                                <span>Withdraw Funds</span>
                                <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                            </motion.div>
                        </div>
                    </motion.div>

                    {/* iOS Style Notifications (Sliding from top) */}
                    {/* Note: y: -120 is the start position (off-canvas top) */}
                    <IOSNotification
                        title="Traaaction"
                        message="New commission: +$45.00"
                        delay={2.6}
                        x={0}
                        y={-140} // Target position
                    />

                    <IOSNotification
                        title="Traaaction"
                        message="New commission: +$120.50"
                        delay={3.8}
                        x={0}
                        y={-90} // Target position (stacks slightly differently or same area)
                    />

                </React.Fragment>
            </div>
        </div>
    );
}

function SmoothCounter({ target, delay }: { target: number, delay: number }) {
    const spring = useSpring(0, { stiffness: 50, damping: 20 });
    const display = useTransform(spring, (current) => current.toFixed(2));

    useEffect(() => {
        const t1 = setTimeout(() => {
            spring.set(45.00);
        }, delay * 1000);

        const t2 = setTimeout(() => {
            spring.set(target);
        }, (delay + 1.2) * 1000);

        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [delay, target, spring]);

    return <motion.span>{display}</motion.span>;
}

function IOSNotification({ title, message, delay, x, y }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -200, x: x - 100 }} // Start much higher
            animate={{
                opacity: [0, 1, 1, 0],
                y: [-200, y, y, -200], // Slide down to Y, then slide back up
                x: [x - 104, x - 104, x - 104, x - 104] // Maintain centered X
            }}
            transition={{
                duration: 4,
                times: [0, 0.15, 0.85, 1],
                delay: delay,
                ease: [0.16, 1, 0.3, 1] // Apple-style quintic ease out
            }}
            className="absolute z-40 w-52 bg-white/80 backdrop-blur-md rounded-[20px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-white/50 p-3.5 flex flex-col gap-1"
            style={{ left: "50%" }}
        >
            {/* Header: App Name + Icon */}
            <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                    <div className="w-4.5 h-4.5 rounded-[5px] bg-slate-900 flex items-center justify-center p-0.5 relative overflow-hidden">
                        <Image
                            src="/Logotrac/favicon.png"
                            alt="Logo"
                            width={14}
                            height={14}
                            className="object-contain"
                        />
                    </div>
                    <span className="text-[10px] font-bold text-slate-800 tracking-tight uppercase">{title}</span>
                </div>
                <span className="text-[9px] font-medium text-slate-400">now</span>
            </div>

            {/* Body */}
            <div className="text-[12px] font-semibold text-slate-900 leading-tight">
                {message}
            </div>
        </motion.div>
    );
}
