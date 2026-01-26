"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link2, Users, Briefcase, CheckCircle2, Share2, Target, Handshake } from "lucide-react";

export default function MissionSelectorVisual() {
    const [selected, setSelected] = useState<number | null>(null);

    // Updated with more premium Icon concepts
    const options = [
        {
            id: 1,
            label: "Tracked Link Mission",
            icon: (props: any) => (
                <div className="relative">
                    <Link2 {...props} className="w-4 h-4 text-blue-600" />
                    <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-green-500 rounded-full border border-white"
                    />
                </div>
            ),
            bg: "bg-blue-50/80"
        },
        {
            id: 2,
            label: "Pay-per-Lead",
            icon: (props: any) => <Target {...props} className="w-4 h-4 text-purple-600" />,
            bg: "bg-purple-50/80"
        },
        {
            id: 3,
            label: "Business Intro",
            icon: (props: any) => <Handshake {...props} className="w-4 h-4 text-amber-600" />,
            bg: "bg-amber-50/80"
        },
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setSelected(0);
            setTimeout(() => setSelected(1), 2000);
            setTimeout(() => setSelected(2), 4000);
            setTimeout(() => setSelected(null), 6000);
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full h-full flex items-center justify-center p-6 select-none cursor-default font-sans">
            <div className="w-full max-w-[260px] space-y-3">
                <div className="flex items-center justify-between px-1 mb-4">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Mission Type</div>
                    <div className="flex gap-1">
                        <div className="w-1 h-1 rounded-full bg-slate-200" />
                        <div className="w-1 h-1 rounded-full bg-slate-200" />
                        <div className="w-1 h-1 rounded-full bg-slate-200" />
                    </div>
                </div>

                {options.map((opt, i) => {
                    const isSelected = selected === i;
                    const Icon = opt.icon;
                    return (
                        <motion.div
                            key={opt.id}
                            animate={{
                                scale: isSelected ? 1.02 : 1,
                                borderColor: isSelected ? "rgb(15 23 42 / 1)" : "rgb(241 245 249 / 1)", // Border slate-900 vs slate-100
                                backgroundColor: isSelected ? "white" : "rgba(255,255,255, 0.4)",
                                y: isSelected ? -2 : 0
                            }}
                            className={`
                                relative flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-300
                                ${isSelected ? "shadow-lg shadow-slate-200/50 z-10" : "hover:bg-white/60"}
                            `}
                        >
                            {/* Checkmark Animation (Left Side now for better list flow) */}
                            <div className={`
                                w-5 h-5 rounded-full border flex items-center justify-center transition-colors duration-200 shrink-0
                                ${isSelected ? "bg-slate-900 border-slate-900" : "bg-white border-slate-200"}
                            `}>
                                <motion.div animate={{ scale: isSelected ? 1 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                </motion.div>
                            </div>

                            {/* Icon Container */}
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${opt.bg}`}>
                                <Icon />
                            </div>

                            {/* Label */}
                            <span className={`text-sm font-semibold transition-colors duration-200 ${isSelected ? "text-slate-900" : "text-slate-500"}`}>
                                {opt.label}
                            </span>

                            {/* Connecting Line (Decorator) */}
                            {i < options.length - 1 && (
                                <div className="absolute left-[22px] -bottom-[14px] w-px h-[10px] bg-slate-100 -z-10" />
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
