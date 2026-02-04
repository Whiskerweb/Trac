"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useState, createElement } from "react";
import { useTranslations } from "next-intl";
import EuropeMap from "../ui/EuropeMap";
import ConnectionVisual from "../ui/ConnectionVisual";
import PayoutsVisual from "../ui/PayoutsVisual";

export interface Tab {
    id: number;
    title: string;
    desc: string;
    color: string;
    visual: React.ComponentType;
}

export const AdvancedFeatures = ({
    tabs,
    initialTab = 0
}: {
    tabs: Tab[];
    initialTab?: number
}) => {
    const t = useTranslations('landing');
    const [activeTab, setActiveTab] = useState(initialTab);

    return (
        <div className="flex flex-col gap-12">
            {/* 1. Large Visual Display Area (Top) */}
            <div className="w-full min-h-[400px] md:h-[500px] bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden relative shadow-[inset_0_0_40px_rgba(0,0,0,0.02)]">
                {/* Subtle Grid Background */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] opacity-50" />

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="absolute inset-0 flex items-center justify-center p-4 md:p-8"
                    >
                        {createElement(tabs[activeTab].visual)}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* 2. Tab Navigation (Bottom Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {tabs.map((tab, i) => {
                    const isActive = activeTab === i;
                    const borderColor = isActive
                        ? tab.color === "emerald" ? "border-emerald-500" : tab.color === "blue" ? "border-blue-500" : "border-violet-500"
                        : "border-transparent";

                    const titleColor = isActive ? "text-slate-900" : "text-slate-500";
                    const linkColor = tab.color === "emerald" ? "text-emerald-600" : tab.color === "blue" ? "text-blue-600" : "text-violet-600";

                    return (
                        <button
                            key={i}
                            onClick={() => setActiveTab(i)}
                            className={`flex flex-col text-left group pl-6 border-l-[3px] transition-all duration-300 ${borderColor} hover:border-slate-200`}
                        >
                            <h3 className={`text-lg font-bold mb-2 transition-colors ${titleColor} group-hover:text-slate-700`}>
                                {tab.title}
                            </h3>
                            <p className="text-sm text-slate-500 leading-relaxed mb-3">
                                {tab.desc}
                            </p>
                            <div className={`text-sm font-semibold flex items-center gap-1 ${isActive ? linkColor : "text-slate-400"} group-hover:${linkColor} transition-colors`}>
                                {t('learnMore')} <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    );
};
