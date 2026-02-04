"use client";

import { useState } from "react";
import { ArrowRight, Bitcoin, Rocket, Check, Store, Users, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export const MissionSelector = () => {
    const [activeTab, setActiveTab] = useState<"startup" | "seller">("startup");
    const [missionName, setMissionName] = useState("");
    const [sellerName, setSellerName] = useState("");
    const router = useRouter();

    const handleStart = () => {
        const params = new URLSearchParams();
        params.set("type", activeTab);
        if (activeTab === "startup" && missionName) {
            params.set("mission", missionName);
        } else if (activeTab === "seller" && sellerName) {
            params.set("username", sellerName);
        }
        router.push(`/login?${params.toString()}`);
    };

    return (
        <section className="py-12 relative overflow-hidden">
            {/* Ambient background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-slate-100/50 rounded-full blur-[100px] -z-10" />

            <div className="container mx-auto px-4 relative z-10 flex flex-col items-center">

                <div className="text-center mb-6">
                    <h2 className="text-4xl md:text-6xl font-medium tracking-tight text-slate-900 mb-3">
                        One platform, two ways to grow.
                    </h2>

                    {/* Compact Toggle */}
                    <div className="inline-flex p-1 bg-slate-100 rounded-full border border-slate-200 shadow-sm relative">
                        <motion.div
                            className="absolute h-[calc(100%-8px)] rounded-full bg-white shadow-sm ring-1 ring-black/5"
                            layoutId="activeTabIndicator"
                            initial={false}
                            animate={{
                                left: activeTab === "startup" ? 4 : "50%",
                                width: "calc(50% - 4px)",
                            }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                        <button
                            onClick={() => setActiveTab("startup")}
                            className={cn(
                                "relative px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-colors duration-200 flex items-center gap-1.5 z-10 min-w-[110px] justify-center",
                                activeTab === "startup" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Startup <Rocket className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => setActiveTab("seller")}
                            className={cn(
                                "relative px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-colors duration-200 flex items-center gap-1.5 z-10 min-w-[110px] justify-center",
                                activeTab === "seller" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Seller <Bitcoin className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Horizontal Card Layout - Slim */}
                <motion.div
                    layout
                    className="w-full max-w-4xl bg-white rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden"
                >
                    <div className="flex flex-col md:flex-row min-h-[260px]">
                        {/* Left Content Area */}
                        <div className="flex-1 px-6 py-6 md:p-8 flex flex-col justify-center relative z-10">
                            <AnimatePresence mode="wait">
                                {activeTab === "startup" ? (
                                    <motion.div
                                        key="startup-content"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-4"
                                    >
                                        <h3 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">
                                            Startup? Start selling now!
                                        </h3>
                                        <p className="text-slate-500 text-sm md:text-base leading-relaxed max-w-md">
                                            Boost your sales today—free for life! Launch your program in seconds.
                                        </p>

                                        <div className="pt-0">
                                            <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-lg border border-slate-200 focus-within:ring-2 focus-within:ring-slate-900/10 transition-all max-w-md">
                                                <div className="pl-3 pr-1 text-slate-400 font-medium select-none text-xs md:text-sm">
                                                    traaaction.com/
                                                </div>
                                                <input
                                                    type="text"
                                                    value={missionName}
                                                    onChange={(e) => setMissionName(e.target.value)}
                                                    placeholder="mission"
                                                    className="flex-1 bg-transparent border-none text-sm font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-0 p-1 min-w-0"
                                                />
                                                <button
                                                    onClick={handleStart}
                                                    className="bg-slate-900 text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-slate-800 transition-all whitespace-nowrap shadow-sm"
                                                >
                                                    Start Now
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="seller-content"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-4"
                                    >
                                        <h3 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">
                                            Seller? Start earning now!
                                        </h3>
                                        <p className="text-slate-500 text-sm md:text-base leading-relaxed max-w-md">
                                            Monetize your network instantly. Join campaigns and track earnings in real-time.
                                        </p>

                                        <div className="pt-0">
                                            <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-lg border border-slate-200 focus-within:ring-2 focus-within:ring-slate-900/10 transition-all max-w-md">
                                                <div className="pl-3 pr-1 text-slate-400 font-medium select-none flex items-center">
                                                    <span className="bg-slate-200 text-slate-600 rounded px-1.5 py-0.5 text-[10px] mr-1 font-bold">@</span>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={sellerName}
                                                    onChange={(e) => setSellerName(e.target.value)}
                                                    placeholder="username"
                                                    className="flex-1 bg-transparent border-none text-sm font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-0 p-1 min-w-0"
                                                />
                                                <button
                                                    onClick={handleStart}
                                                    className="bg-slate-900 text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-slate-800 transition-all whitespace-nowrap shadow-sm"
                                                >
                                                    Start Now
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Right Visual Area - Specific Visuals - ANIMATED */}
                        <div className="w-full md:w-[40%] bg-slate-50 border-t md:border-t-0 md:border-l border-slate-100 relative overflow-hidden flex items-center justify-center p-4">
                            {/* Background Pattern */}
                            <div className="absolute inset-0 opacity-[0.4] bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]" />

                            <AnimatePresence mode="wait">
                                {activeTab === "startup" ? (
                                    <motion.div
                                        key="startup-visual"
                                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                        animate={{
                                            opacity: 1,
                                            scale: 1,
                                            y: 0,
                                            rotate: 2
                                        }}
                                        exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                        transition={{ duration: 0.4, type: "spring" }}
                                        style={{ transformOrigin: "center center" }}
                                        className="relative w-full max-w-[200px]"
                                    >
                                        {/* Floating Animation Wrapper */}
                                        <motion.div
                                            animate={{ y: [0, -6, 0] }}
                                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                            className="relative z-10"
                                        >
                                            {/* Startups see a Seller Profile (Target Audience) */}
                                            <div className="bg-white p-2.5 rounded-xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.08)] border border-slate-100 flex flex-col gap-2.5 select-none hover:rotate-0 transition-transform duration-300">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-indigo-500 shrink-0 shadow-sm">
                                                        <img
                                                            src="/Logotrac/launding/femme1.png"
                                                            alt="Seller"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 mb-0.5">
                                                            <span className="text-[10px] border border-slate-100 rounded px-1 flex items-center justify-center bg-slate-50">🇫🇷</span>
                                                            <span className="font-bold text-slate-900 text-xs truncate">Marie Laurent</span>
                                                        </div>
                                                        <div className="text-[10px] text-green-600 font-bold bg-green-50 inline-block px-1.5 rounded-sm">+€2.4K this month</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center divide-x divide-slate-100 bg-slate-50 rounded-lg p-1.5 border border-slate-100/50">
                                                    <div className="flex-1 text-center pr-2">
                                                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Revenue</div>
                                                        <div className="text-[10px] font-bold text-slate-700">€24,500</div>
                                                    </div>
                                                    <div className="flex-1 text-center pl-2">
                                                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Payouts</div>
                                                        <div className="text-[10px] font-bold text-slate-700">€4,900</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Badge - Active Now - Pulsing */}
                                            <motion.div
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{ delay: 0.2 }}
                                                className="absolute -right-2 -top-2 bg-white p-1 rounded-lg shadow-md border border-slate-100 flex items-center gap-1"
                                            >
                                                <span className="relative flex h-1.5 w-1.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                                                </span>
                                                <span className="text-[8px] font-bold text-slate-600">Active</span>
                                            </motion.div>
                                        </motion.div>

                                        {/* Background glow effect */}
                                        <div className="absolute inset-0 bg-blue-500/20 blur-[40px] rounded-full -z-10 opacity-50 block" />

                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="seller-visual"
                                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                        animate={{
                                            opacity: 1,
                                            scale: 1,
                                            y: 0,
                                            rotate: -2
                                        }}
                                        exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                        transition={{ duration: 0.4, type: "spring" }}
                                        style={{ transformOrigin: "center center" }}
                                        className="relative w-full max-w-[220px]"
                                    >
                                        {/* Floating Animation Wrapper */}
                                        <motion.div
                                            animate={{ y: [0, -6, 0] }}
                                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} // Staggered float
                                            className="relative z-10"
                                        >
                                            {/* Sellers see a Startup Card (Target Opportunity) - Traaaction */}
                                            <div className="bg-white p-3 rounded-[1.25rem] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.08)] border border-slate-100 flex flex-col gap-2.5 select-none hover:rotate-0 transition-transform duration-300">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 overflow-hidden p-1 shadow-sm shrink-0">
                                                        <img
                                                            src="/Logotrac/NoirPlein.png"
                                                            alt="Traaaction"
                                                            className="w-full h-full object-contain"
                                                        />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-bold text-slate-900 leading-none">Traaaction</h3>
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-100 text-slate-500">SaaS</span>
                                                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-blue-50 text-blue-600">B2B</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-1 pt-0.5">
                                                    <div className="flex items-center justify-between text-[10px] font-medium text-slate-600 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100/50">
                                                        <span>Active missions</span>
                                                        <div className="flex items-center gap-1">
                                                            <span className="font-bold text-slate-900">3</span>
                                                            <span className="relative flex h-1.5 w-1.5">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between text-[10px] font-medium text-slate-600 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100/50">
                                                        <span>Sellers joined</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="flex -space-x-1.5">
                                                                <div className="w-3.5 h-3.5 rounded-full bg-slate-200 border-2 border-white" />
                                                                <div className="w-3.5 h-3.5 rounded-full bg-slate-300 border-2 border-white" />
                                                                <div className="w-3.5 h-3.5 rounded-full bg-slate-400 border-2 border-white" />
                                                            </div>
                                                            <span className="text-[9px] font-bold text-slate-400">+191</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Badge - High Conv */}
                                            <motion.div
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{ delay: 0.3 }}
                                                className="absolute -right-2 -bottom-2 bg-slate-900 p-1 rounded-lg shadow-lg flex items-center gap-1"
                                            >
                                                <TrendingUp className="w-2.5 h-2.5 text-yellow-400" />
                                                <span className="text-[8px] font-bold text-white">High Conv.</span>
                                            </motion.div>
                                        </motion.div>

                                        {/* Background glow effect */}
                                        <div className="absolute inset-0 bg-indigo-500/20 blur-[40px] rounded-full -z-10 opacity-50 block" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>

            </div>
        </section>
    );
};
