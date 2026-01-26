"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Globe, Check, Loader2, RefreshCw, Copy, CheckCircle2, ChevronRight, X, AlertCircle } from "lucide-react";

// Steps for the animation sequence
type Step = "list" | "modal_typing" | "modal_filled" | "config" | "verifying" | "success";

export default function ConnectionVisual() {
    const [step, setStep] = useState<Step>("list");
    const [typedDomain, setTypedDomain] = useState("");

    // Animation Loop
    useEffect(() => {
        let mounted = true;
        const run = async () => {
            while (mounted) {
                // 1. Initial List State (Clean)
                setStep("list");
                setTypedDomain("");
                await wait(2000);

                // 2. Open Modal & Type
                setStep("modal_typing");
                const text = "link.brand.com";
                for (let i = 0; i < text.length; i++) {
                    if (!mounted) return;
                    setTypedDomain(text.substring(0, i + 1));
                    await wait(50 + Math.random() * 40); // Natural typing variance
                }
                await wait(400);

                // 3. Filled State (brief pause before submit)
                setStep("modal_filled");
                await wait(600);

                // 4. Show Configuration (DNS)
                setStep("config");
                await wait(2500); // Allow time to "read" the values

                // 5. Verify Action
                setStep("verifying");
                await wait(1800); // Simulated network delay

                // 6. Success State
                setStep("success");
                await wait(4500); // Bask in glory
            }
        };
        run();
        return () => { mounted = false; };
    }, []);

    return (
        <div className="w-full h-full flex items-center justify-center p-4 md:p-8 bg-slate-50/50 font-sans select-none">
            {/* Main Window Frame */}
            <div className="w-full max-w-[420px] bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-200 overflow-hidden flex flex-col relative aspect-[4/3]">

                {/* Window Header */}
                <div className="h-10 border-b border-slate-100 flex items-center justify-between px-4 bg-white/80 backdrop-blur-sm z-10 sticky top-0">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                    </div>
                    <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        traaaction.com/domains
                    </div>
                    <div className="w-8" />
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white relative overflow-hidden flex flex-col">

                    <AnimatePresence mode="wait">

                        {/* STATE 1: Empty List / Dashboard */}
                        {step === "list" && (
                            <motion.div
                                key="list"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="flex-1 flex flex-col p-6"
                            >
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-lg font-bold text-slate-900">Custom Domains</h2>
                                    <div className="px-3 py-1.5 bg-black text-white text-xs font-medium rounded-md shadow-sm flex items-center gap-1.5 transform scale-100 origin-right transition-transform">
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Add Domain</span>
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 pb-8">
                                    <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                                        <Globe className="w-6 h-6 text-slate-300" />
                                    </div>
                                    <div className="opacity-0 animate-[fadeIn_0.5s_ease_forwards]">
                                        <p className="text-sm font-medium text-slate-900">No domains yet</p>
                                        <p className="text-xs text-slate-500 mt-1">Connect a domain to get started.</p>
                                    </div>
                                </div>

                                {/* Simulated Cursor for Click */}
                                <Cursor targetX={360} targetY={45} delay={1.2} />
                            </motion.div>
                        )}

                        {/* STATE 2 & 3: Modal (Typing/Filled) */}
                        {(step === "modal_typing" || step === "modal_filled") && (
                            <motion.div
                                key="modal"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="absolute inset-0 z-20 flex items-center justify-center bg-black/5 backdrop-blur-[1px]"
                            >
                                <motion.div
                                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                                    transition={{ type: "spring", duration: 0.4 }}
                                    className="w-[90%] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
                                >
                                    <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                                        <h3 className="text-sm font-bold text-slate-900">Add Custom Domain</h3>
                                        <div className="w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400">
                                            <X className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <div className="p-5 space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-slate-700">Domain Name</label>
                                            <div className="relative group">
                                                <div className={`w-full h-10 px-3 flex items-center rounded-md border text-sm font-mono transition-colors ${step === 'modal_typing' ? 'border-black ring-1 ring-black/5' : 'border-slate-300'}`}>
                                                    {typedDomain}
                                                    {step === 'modal_typing' && <span className="w-0.5 h-4 bg-black ml-0.5 animate-pulse" />}
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-slate-500">e.g. link.domain.com</p>
                                        </div>
                                        <div className="pt-2 flex justify-end gap-2">
                                            <div className="px-3 py-2 text-xs font-medium text-slate-600">Cancel</div>
                                            <div className={`px-3 py-2 text-xs font-medium rounded-md text-white transition-all ${step === 'modal_filled' ? 'bg-black shadow-md scale-[1.02]' : 'bg-black/50'}`}>
                                                Add Domain
                                            </div>
                                        </div>
                                    </div>
                                    {/* Cursor moves to button */}
                                    {step === "modal_filled" && <Cursor targetX={320} targetY={180} delay={0.1} />}
                                </motion.div>
                            </motion.div>
                        )}

                        {/* STATE 4 & 5: Config & Verifying */}
                        {(step === "config" || step === "verifying") && (
                            <motion.div
                                key="config"
                                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                className="flex-1 flex flex-col p-6"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-bold text-slate-900">Custom Domains</h2>
                                </div>

                                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                                    {/* Domain Row */}
                                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                        <div className="flex items-center gap-3">
                                            <div className="text-sm font-bold text-slate-900">link.brand.com</div>
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100/50 border border-amber-200/50">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                                <span className="text-[10px] font-bold text-amber-700">Unverified</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Instructions */}
                                    <div className="p-4 bg-white">
                                        <div className="flex gap-3 mb-4">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">1</div>
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-900">Add CNAME Record</h4>
                                                <p className="text-[10px] text-slate-500 mt-0.5">Log in to your DNS provider and add this record.</p>
                                            </div>
                                        </div>

                                        <div className="ml-9 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden mb-4">
                                            <div className="grid grid-cols-12 text-[10px] items-center border-b border-slate-100 bg-slate-100/50 text-slate-500 font-medium px-3 py-1.5">
                                                <div className="col-span-3">Type</div>
                                                <div className="col-span-3">Name</div>
                                                <div className="col-span-6">Value</div>
                                            </div>
                                            <div className="grid grid-cols-12 text-[10px] items-center px-3 py-2.5 font-mono">
                                                <div className="col-span-3"><span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[9px] font-bold">CNAME</span></div>
                                                <div className="col-span-3 font-semibold text-slate-900">link</div>
                                                <div className="col-span-6 flex items-center justify-between gap-2">
                                                    <span className="truncate text-slate-600">cname.traaaction.com</span>
                                                    <Copy className="w-3 h-3 text-slate-400" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-1">
                                            <button className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${step === 'verifying' ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-black text-white hover:bg-slate-800 shadow-sm'}`}>
                                                {step === 'verifying' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                                {step === 'verifying' ? 'Verifying...' : 'Verify DNS'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Cursor Click on Verify */}
                                {step === "config" && <Cursor targetX={360} targetY={250} delay={1.8} />}
                            </motion.div>
                        )}

                        {/* STATE 6: Success */}
                        {step === "success" && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="flex-1 flex flex-col p-6"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-bold text-slate-900">Custom Domains</h2>
                                    <div className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-medium rounded-md flex items-center gap-1.5">
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Add Domain</span>
                                    </div>
                                </div>

                                <motion.div
                                    initial={{ y: 20 }} animate={{ y: 0 }}
                                    className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
                                >
                                    <div className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-green-600">
                                                <CheckCircle2 className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-slate-900">link.brand.com</span>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                </div>
                                                <div className="text-[10px] text-slate-500">Verified just now</div>
                                            </div>
                                        </div>
                                        <div className="px-2 py-1 bg-green-50 text-green-700 text-[10px] font-bold rounded border border-green-100 flex items-center gap-1">
                                            Active
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Confetti Effect (CSS only) */}
                                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                    {[...Array(20)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ y: 150, x: 200, scale: 0 }}
                                            animate={{
                                                y: Math.random() * -300,
                                                x: Math.random() * 400 - 200 + 200,
                                                scale: [0, 1, 0],
                                                rotate: Math.random() * 360
                                            }}
                                            transition={{ duration: 1.5, ease: "easeOut", delay: Math.random() * 0.2 }}
                                            className={`absolute bottom-0 left-0 w-1.5 h-1.5 rounded-full ${['bg-red-400', 'bg-blue-400', 'bg-green-400', 'bg-yellow-400'][i % 4]}`}
                                        />
                                    ))}
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

// Helper: Mouse Cursor Component
function Cursor({ targetX, targetY, delay }: { targetX: number, targetY: number, delay: number }) {
    return (
        <motion.div
            initial={{ x: targetX + 50, y: targetY + 50, opacity: 0 }}
            animate={{
                x: [targetX + 50, targetX, targetX], // Move then stay
                y: [targetY + 50, targetY, targetY],
                opacity: [0, 1, 0],
                scale: [1, 1, 0.8] // Click effect at end
            }}
            transition={{
                duration: 1.2,
                delay: delay,
                times: [0, 0.8, 1], // Timing of keyframes
                ease: "easeOut"
            }}
            className="absolute top-0 left-0 z-50 pointer-events-none"
        >
            <svg
                className="w-5 h-5 drop-shadow-lg text-slate-900 fill-black"
                viewBox="0 0 24 24"
            >
                <path d="M5.5 3.2L17.8 14.5L11.5 15L15.2 22.8L12.8 24L9.2 16.2L5.5 20.8V3.2Z" stroke="white" strokeWidth="1.5" />
            </svg>
        </motion.div>
    );
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
