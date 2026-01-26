"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import { Check, ArrowRight, Zap, Globe, Building2, User, TrendingUp, ArrowDown } from "lucide-react";

function Counter({ value, prefix = "", className }: { value: number, prefix?: string, className?: string }) {
    const spring = useSpring(0, { bounce: 0, duration: 2000 });
    const display = useTransform(spring, (current) =>
        prefix + new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(current)
    );

    useEffect(() => {
        spring.set(value);
    }, [spring, value]);

    return <motion.span className={className}>{display}</motion.span>;
}

export default function PayoutsVisual() {
    const [revenue, setRevenue] = useState(420500.00);
    const [payouts, setPayouts] = useState(42050.00);

    useEffect(() => {
        const interval = setInterval(() => {
            const increment = Math.random() * 1000;
            setRevenue(prev => prev + increment);
            setPayouts(prev => prev + (increment * 0.1));
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full h-full flex items-center justify-center font-sans overflow-hidden bg-slate-50/50">
            {/* Background Grid */}
            <div className="absolute inset-0 z-0 opacity-30"
                style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '24px 24px' }}
            />

            {/* ==============================================
                MOBILE LAYOUT (Vertical Stack) - Visible < md
               ============================================== */}
            <div className="md:hidden w-full h-full p-4 flex flex-col items-center justify-center gap-6 relative z-10">

                {/* Mobile Hub */}
                <motion.div
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="w-full max-w-sm bg-white rounded-xl shadow-lg border border-slate-200 p-4 relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500" />
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                                <Building2 className="w-4 h-4 text-slate-600" />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-slate-800 uppercase">Live Settlement</div>
                                <div className="flex items-center gap-1">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                    </span>
                                    <span className="text-[10px] font-medium text-emerald-600">Processing</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center gap-1.5 mb-1">
                                <TrendingUp className="w-3 h-3 text-emerald-500" />
                                <div className="text-[10px] text-emerald-600 font-bold uppercase">Revenue</div>
                            </div>
                            <Counter value={revenue} prefix="$" className="text-2xl font-bold text-slate-900 leading-none block" />
                        </div>
                        <div className="pt-3 border-t border-slate-100">
                            <div className="flex items-center gap-1.5 mb-1">
                                <Zap className="w-3 h-3 text-violet-500" />
                                <div className="text-[10px] text-violet-600 font-bold uppercase">Payouts</div>
                            </div>
                            <Counter value={payouts} prefix="$" className="text-xl font-bold text-violet-600 leading-none block" />
                        </div>
                    </div>
                </motion.div>

                {/* Mobile Connection Line */}
                <div className="h-6 w-px bg-slate-300 relative">
                    <motion.div
                        className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-violet-500"
                        animate={{ y: [0, 24], opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    />
                </div>

                {/* Mobile Partners List (Compact) */}
                <div className="w-full max-w-sm grid grid-cols-1 gap-3">
                    <MobilePartnerRow name="Sarah K." amount="$4,200.00" status="Sent" delay={0.2} />
                    <MobilePartnerRow name="Marc D." amount="€2,850.00" status="Paid" delay={0.4} />
                    <MobilePartnerRow name="Yuki T." amount="¥450,000" status="Sent" delay={0.6} />
                </div>
            </div>


            {/* ==============================================
                DESKTOP LAYOUT (Diagram) - Hidden < md
               ============================================== */}
            <div className="hidden md:flex relative w-[800px] h-[500px] items-center justify-center">

                {/* Central Hub: The "Engine" */}
                {/* Same desktop layout as before but removed scaling because now we toggle layouts */}
                <div className="absolute z-20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <motion.div
                        className="w-72 bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-slate-200/60 p-5 flex flex-col gap-4 relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500" />
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                                    <Building2 className="w-4 h-4 text-slate-600" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-800 uppercase tracking-wide">Live Settlement</div>
                                    <div className="text-[10px] font-medium text-slate-400">Real-time processing</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-100">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="text-[10px] font-semibold text-emerald-600">Syncing</span>
                            </div>
                        </div>

                        <div className="space-y-3 pt-2">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                                    <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide">Revenue Generated</div>
                                </div>
                                <Counter value={revenue} prefix="$" className="text-2xl font-bold text-slate-900 tabular-nums leading-none block" />
                            </div>
                            <div className="pt-3 border-t border-slate-100">
                                <div className="flex items-center gap-2 mb-1">
                                    <Zap className="w-3 h-3 text-violet-500" />
                                    <div className="text-[10px] text-violet-600 font-bold uppercase tracking-wide">Commissions Paid</div>
                                </div>
                                <Counter value={payouts} prefix="$" className="text-xl font-bold text-violet-600 tabular-nums leading-none block" />
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Connecting Rails */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
                    <defs>
                        <linearGradient id="rail-gradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="1" />
                        </linearGradient>
                    </defs>
                    <PaymentRail from={{ x: 400, y: 250 }} to={{ x: 120, y: 80 }} delay={0} />
                    <PaymentRail from={{ x: 400, y: 250 }} to={{ x: 680, y: 80 }} delay={0.4} />
                    <PaymentRail from={{ x: 400, y: 250 }} to={{ x: 120, y: 420 }} delay={0.8} />
                    <PaymentRail from={{ x: 400, y: 250 }} to={{ x: 680, y: 420 }} delay={1.2} />
                </svg>

                {/* Nodes (Updated Positions for 800x500 box) */}
                <PartnerNode
                    name="Sarah K."
                    email="sarah@mail.com"
                    amount="$4,200.00"
                    status="Sent"
                    position="top-10 left-0"
                    delay={0.8}
                />
                <PartnerNode
                    name="Marc Dubois"
                    email="marc@agency.fr"
                    amount="€2,850.00"
                    status="Paid"
                    position="top-10 right-0"
                    delay={1.2}
                />
                <PartnerNode
                    name="Hans Weber"
                    email="hans.w@berlin.de"
                    amount="€1,200.00"
                    status="Paid"
                    position="bottom-10 left-0"
                    delay={1.6}
                />
                <PartnerNode
                    name="Yuki Tanaka"
                    email="yuki.t@jp.co"
                    amount="¥450,000"
                    status="Sent"
                    position="bottom-10 right-0"
                    delay={2.0}
                />
            </div>
        </div>
    );
}

function PaymentRail({ from, to, delay }: any) {
    return (
        <>
            <path
                d={`M ${from.x} ${from.y} L ${to.x} ${to.y}`}
                stroke="#e2e8f0"
                strokeWidth="1"
                fill="none"
            />
            <motion.circle
                r="3"
                fill="#8b5cf6"
                initial={{ offsetDistance: "0%" }}
                animate={{ offsetDistance: "100%" }}
                style={{ offsetPath: `path("M ${from.x} ${from.y} L ${to.x} ${to.y}")` }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear", repeatDelay: 1, delay }}
            />
        </>
    );
}

function PartnerNode({ name, email, amount, status, position, delay }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay, duration: 0.5 }}
            className={`absolute ${position} w-48 bg-white rounded-xl shadow-lg border border-slate-100 p-3 group hover:border-violet-200 transition-colors cursor-default`}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                        <User className="w-3 h-3 text-slate-500" />
                    </div>
                    <div className="text-xs font-semibold text-slate-700">{name}</div>
                </div>
                {status === "Paid" ? (
                    <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">PAID</div>
                ) : (
                    <div className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">SENT</div>
                )}
            </div>
            <div className="pl-8">
                <div className="text-sm font-mono font-bold text-slate-900 group-hover:text-violet-600 transition-colors">{amount}</div>
                <div className="text-[10px] text-slate-400 truncate">{email}</div>
            </div>
        </motion.div>
    );
}

function MobilePartnerRow({ name, amount, status, delay }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay }}
            className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100 shadow-sm"
        >
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                    <User className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                    <div className="text-sm font-bold text-slate-900">{amount}</div>
                    <div className="text-xs text-slate-500">{name}</div>
                </div>
            </div>
            {status === "Paid" ? (
                <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">PAID</div>
            ) : (
                <div className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">SENT</div>
            )}
        </motion.div>
    )
}
