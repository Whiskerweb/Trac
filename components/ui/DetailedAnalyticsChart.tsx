"use client";

import React from "react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts";
import { Laptop, Smartphone, Globe } from "lucide-react";

// Data from dashboard/overview aesthetics
// High-fidelity purple theme
const data = [
    { time: "4:00 PM", clicks: 170 },
    { time: "6:00 PM", clicks: 230 },
    { time: "8:00 PM", clicks: 210 },
    { time: "10:00 PM", clicks: 280 },
    { time: "12:00 AM", clicks: 190 },
    { time: "2:00 AM", clicks: 310 },
    { time: "4:00 AM", clicks: 260 },
    { time: "6:00 AM", clicks: 380 },
    { time: "8:00 AM", clicks: 340 },
];

export default function DetailedAnalyticsChart() {
    return (
        <div className="w-full h-full bg-white flex flex-col select-none font-sans relative overflow-hidden bg-slate-50/50">
            {/* Header Stats */}
            <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 bg-white">
                <div className="p-3">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <div className="w-1.5 h-1.5 rounded bg-violet-600 shadow-[0_0_8px_rgba(124,58,237,0.5)]" />
                        <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Clicks</span>
                    </div>
                    <div className="text-xl font-bold text-slate-900 tracking-tight">7.2K</div>
                </div>
                <div className="p-3 opacity-60">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <div className="w-1.5 h-1.5 rounded bg-violet-400" />
                        <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Leads</span>
                    </div>
                    <div className="text-xl font-bold text-slate-900 tracking-tight">165</div>
                </div>
                <div className="p-3 opacity-60">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <div className="w-1.5 h-1.5 rounded bg-violet-300" />
                        <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Sales</span>
                    </div>
                    <div className="text-xl font-bold text-slate-900 tracking-tight">12</div>
                </div>
            </div>

            {/* Chart Area - Compacted */}
            <div className="h-[140px] w-full relative pt-4 pl-2 pr-2 bg-white border-b border-slate-100">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis hide />
                        <YAxis hide domain={[0, 450]} />
                        <Area
                            type="monotone"
                            dataKey="clicks"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorClicks)"
                            isAnimationActive={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>

                {/* Dashboard Active Dot */}
                <div className="absolute top-[30%] right-[22%] w-2.5 h-2.5 bg-violet-600 rounded-full border-[2px] border-white shadow-sm z-20 -translate-x-1/2 translate-y-1/2" />
                <div className="absolute top-4 bottom-0 right-[22%] w-px border-l border-dashed border-violet-200 z-10" />

                {/* Floating Tooltip */}
                <div className="absolute top-[30%] -translate-y-[120%] right-[22%] bg-white shadow-lg border border-slate-100 rounded-md p-2 z-30 min-w-[80px]">
                    <p className="text-[9px] font-semibold text-slate-400 mb-0.5">6:00 AM</p>
                    <div className="flex items-center gap-1.5 text-[10px]">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-600" />
                        <span className="font-bold text-slate-900">380</span>
                    </div>
                </div>
            </div>

            {/* Bottom Widgets Area - New Request */}
            <div className="flex-1 p-3 grid grid-cols-2 gap-3 bg-slate-50/50">

                {/* 1. Countries Widget */}
                <div className="bg-white rounded-lg border border-slate-100 p-2 shadow-sm flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 pb-1 border-b border-slate-50">
                        <Globe className="w-3 h-3 text-slate-400" />
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Top Countries</span>
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs">🇫🇷</span>
                                <span className="text-[10px] font-medium text-slate-600">France</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-900">42%</span>
                        </div>
                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full w-[42%] bg-blue-500 rounded-full" />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs">🇩🇪</span>
                                <span className="text-[10px] font-medium text-slate-600">Germany</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-900">28%</span>
                        </div>
                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full w-[28%] bg-amber-500 rounded-full" />
                        </div>
                    </div>
                </div>

                {/* 2. Devices/OS Widget */}
                <div className="bg-white rounded-lg border border-slate-100 p-2 shadow-sm flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 pb-1 border-b border-slate-50">
                        <Laptop className="w-3 h-3 text-slate-400" />
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Devices</span>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <Laptop className="w-3 h-3 text-slate-400" />
                                <span className="text-[10px] font-medium text-slate-600">Desktop</span>
                            </div>
                            <div className="text-[10px] font-bold text-slate-900">1.2k</div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <Smartphone className="w-3 h-3 text-slate-400" />
                                <span className="text-[10px] font-medium text-slate-600">Mobile</span>
                            </div>
                            <div className="text-[10px] font-bold text-slate-900">4.8k</div>
                        </div>
                        <div className="mt-auto pt-1 flex items-center gap-1">
                            <div className="h-1.5 flex-1 bg-violet-600 rounded-full" />
                            <div className="h-1.5 w-[20%] bg-violet-200 rounded-full" />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
