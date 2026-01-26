"use client";

import React, { useState, useEffect } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { motion, AnimatePresence } from "framer-motion";

const geoUrl = "/europe.json";

// Types for our random events
type EventType = "partner" | "sale" | "lead";

interface MapEvent {
    id: string;
    countryId: string;
    type: EventType;
    amount?: string;
    name: string;
}

// Configuration with coordinates [lon, lat] for proper marker placement
const countryConfig: Record<string, { color: string; name: string; coords: [number, number] }> = {
    "France": { color: "#dbeafe", name: "France", coords: [2.5, 46.5] },       // Blue-100
    "Germany": { color: "#fef3c7", name: "Germany", coords: [10.5, 51] },       // Amber-100
    "Spain": { color: "#fee2e2", name: "Spain", coords: [-3.5, 40] },           // Red-100
    "Italy": { color: "#dcfce7", name: "Italy", coords: [12.5, 42.5] },         // Green-100
    "United Kingdom": { color: "#e0e7ff", name: "UK", coords: [-2, 53] }        // Indigo-100
};

export default function EuropeMap() {
    const [activeEvents, setActiveEvents] = useState<MapEvent[]>([]);

    useEffect(() => {
        const countryKeys = Object.keys(countryConfig);

        const addEvent = () => {
            // 1. Pick random country
            const countryId = countryKeys[Math.floor(Math.random() * countryKeys.length)];

            // 2. Pick random event type
            const types: EventType[] = ["partner", "sale", "lead"];
            const type = types[Math.floor(Math.random() * types.length)];

            // 3. Determine properties
            let amount = "";
            if (type === "sale") amount = `€${Math.floor(Math.random() * 300) + 50}.00`;
            if (type === "lead") amount = `€${Math.floor(Math.random() * 20) + 2}.00`;

            const newEvent: MapEvent = {
                id: Math.random().toString(36).substr(2, 9),
                countryId,
                type,
                amount,
                name: countryConfig[countryId].name
            };

            setActiveEvents(prev => [...prev.slice(-2), newEvent]); // Keep max 3 events

            // Auto remove this specific event after 3s
            setTimeout(() => {
                setActiveEvents(prev => prev.filter(e => e.id !== newEvent.id));
            }, 3000);
        };

        // Initial burst
        setTimeout(addEvent, 500);

        const interval = setInterval(() => {
            addEvent();
            // Chance to add a second simultaneous event (30% chance)
            if (Math.random() > 0.7) {
                setTimeout(addEvent, 400); // Slight offset for "natural" feel
            }
        }, 1800); // Faster cadence: every 1.8s

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full h-full flex items-center justify-center relative bg-slate-50/0 overflow-hidden rounded-xl">
            <ComposableMap
                projection="geoMercator"
                projectionConfig={{
                    scale: 750,
                    center: [10, 50]
                }}
                className="w-full h-full"
                style={{ width: "100%", height: "100%" }}
            >
                <Geographies geography={geoUrl}>
                    {({ geographies }: { geographies: any[] }) =>
                        geographies.map((geo: any) => {
                            const countryName = geo.properties.name;
                            // Highlight if ANY active event belongs to this country
                            const isActive = activeEvents.some(e => e.countryId === countryName);
                            const config = countryConfig[countryName];

                            const fillColor = isActive && config ? config.color : "#ffffff";

                            return (
                                <Geography
                                    key={geo.rsmKey}
                                    geography={geo}
                                    style={{
                                        default: {
                                            fill: fillColor,
                                            stroke: "#000000",
                                            strokeWidth: 0.5,
                                            outline: "none",
                                            transition: "fill 0.5s ease"
                                        },
                                        hover: {
                                            fill: config ? config.color : "#f8fafc",
                                            stroke: "#000000",
                                            strokeWidth: 0.75,
                                            outline: "none"
                                        },
                                        pressed: {
                                            fill: "#E42",
                                            outline: "none"
                                        }
                                    }}
                                />
                            );
                        })
                    }
                </Geographies>

                {/* Dynamic Markers for Notifications */}
                <AnimatePresence>
                    {activeEvents.map(event => (
                        countryConfig[event.countryId] && (
                            <Marker key={event.id} coordinates={countryConfig[event.countryId].coords}>
                                <motion.g
                                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.4, type: "spring" }}
                                >
                                    {/* Marker Dot */}
                                    <circle r={4} fill="#0f172a" className="animate-ping opacity-20" />
                                    <circle r={3} fill="#0f172a" />

                                    {/* Connecting Line */}
                                    <line x1="0" y1="0" x2="20" y2="-30" stroke="#0f172a" strokeWidth="1" />

                                    {/* Floating Card - Design Match */}
                                    <foreignObject x="20" y="-80" width="200" height="80" className="overflow-visible">
                                        <div className="bg-white p-3 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.1)] border border-slate-100 flex flex-col gap-2 relative z-50">

                                            {/* Top Row: Icon + Social Proof Pill */}
                                            <div className="flex items-center justify-between">
                                                {/* Icon */}
                                                <div className="w-8 h-8 rounded-full border border-slate-100 bg-white flex items-center justify-center shrink-0">
                                                    {event.type === "partner" && <span className="text-lg">🤝</span>}
                                                    {event.type === "sale" && <span className="text-lg">💰</span>}
                                                    {event.type === "lead" && <span className="text-lg">🎯</span>}
                                                </div>

                                                {/* Social Proof Pill (Green or Blue based on type) */}
                                                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${event.type === "sale" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                                                    }`}>
                                                    {/* Fake avatars */}
                                                    <div className="flex -space-x-1.5">
                                                        <div className="w-3.5 h-3.5 rounded-full bg-slate-300 border border-white" />
                                                        <div className="w-3.5 h-3.5 rounded-full bg-slate-400 border border-white" />
                                                    </div>
                                                    <span className="ml-1">
                                                        {event.type === "sale" ? "+1 Sale" : event.type === "partner" ? "+1 Partner" : "+1 Lead"}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Bottom Row: Main Text */}
                                            <div className="text-xs font-semibold text-slate-900 leading-tight">
                                                {event.type === "sale" && `Earned ${event.amount} in ${event.name}`}
                                                {event.type === "partner" && `New partner joined in ${event.name}`}
                                                {event.type === "lead" && `New lead generated in ${event.name}`}
                                            </div>

                                        </div>
                                    </foreignObject>
                                </motion.g>
                            </Marker>
                        )
                    ))}
                </AnimatePresence>
            </ComposableMap>
        </div>
    );
}
