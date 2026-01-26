"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link2, Target, Handshake, Check } from "lucide-react";

export default function MissionSelectorVisual() {
    const [selected, setSelected] = useState<number | null>(null);

    const options = [
        {
            id: 1,
            label: "Tracked Link Mission",
            icon: Link2,
            color: "text-blue-600"
        },
        {
            id: 2,
            label: "Pay-per-Lead",
            icon: Target,
            color: "text-violet-600"
        },
        {
            id: 3,
            label: "Business Intro",
            icon: Handshake,
            color: "text-amber-600"
        },
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setSelected(0);
            setTimeout(() => setSelected(1), 2500);
            setTimeout(() => setSelected(2), 5000);
            setTimeout(() => setSelected(null), 7500);
        }, 9000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full h-full flex items-center justify-center p-6 select-none cursor-default font-sans bg-slate-50/20">
            <div className="w-full max-w-[280px]">
                {/* Header - Minimal & Clean */}
                <div className="flex items-center justify-between mb-4 px-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Mission Type</span>
                </div>

                <div className="flex flex-col gap-2.5">
                    {options.map((opt, i) => {
                        const isSelected = selected === i;
                        const Icon = opt.icon;
                        return (
                            <motion.div
                                key={opt.id}
                                animate={{
                                    scale: isSelected ? 1 : 0.98,
                                    opacity: selected === null || isSelected ? 1 : 0.6,
                                }}
                                className={`
                                    relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 box-border
                                    ${isSelected
                                        ? "bg-white border-slate-900/10 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)]"
                                        : "bg-white border-transparent hover:border-slate-200"
                                    }
                                `}
                            >
                                {/* Custom Radio/Checkbox */}
                                <div className={`
                                    w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200 shrink-0
                                    ${isSelected ? "bg-slate-900 border-slate-900" : "bg-slate-50 border-slate-200"}
                                `}>
                                    {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                </div>

                                {/* Icon Box - Clean White Look */}
                                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                                    <Icon className={`w-4 h-4 ${opt.color}`} />
                                </div>

                                {/* Text */}
                                <span className={`text-sm font-semibold ${isSelected ? "text-slate-900" : "text-slate-500"}`}>
                                    {opt.label}
                                </span>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
