import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Orbit } from "./Orbit";

export function Hero() {
    return (
        <section className="relative flex flex-col items-center justify-center py-32 overflow-hidden">
            {/* Background Orbit - Requested by User */}
            <Orbit />

            <div className="container relative z-10 px-4 md:px-6 flex flex-col items-center text-center">

                {/* Badge */}
                <div className="inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-500 backdrop-blur-md mb-8">
                    <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
                    New: Automated Commission Payouts
                </div>

                {/* H1 Headline */}
                {/* H1 Headline */}
                <h1 className="flex flex-col items-center justify-center text-center font-display tracking-tight text-slate-900 mb-8 max-w-5xl mx-auto">
                    <span className="text-4xl md:text-6xl font-medium mb-4 block">
                        Connect Startups & Sellers
                    </span>

                    <span className="flex items-center gap-4 text-xl md:text-2xl font-serif italic text-slate-400 my-2">
                        <span className="h-[1px] w-12 bg-slate-200"></span>
                        to create
                        <span className="h-[1px] w-12 bg-slate-200"></span>
                    </span>

                    <span className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-slate-500 to-slate-950 mt-2 drop-shadow-sm select-none"
                        style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.1))" }}>
                        Traaaction
                    </span>
                </h1>

                {/* Subheadline */}
                <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
                    Stop guessing where your revenue comes from. Traaaction gives you precision attribution, automated payouts, and real-time fraud prevention.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                    <Link
                        href="/dashboard"
                        className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-8 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors shadow-lg hover:shadow-xl shadow-blue-900/20"
                    >
                        Start Tracking Free
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                    <Link
                        href="/contact"
                        className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-8 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium hover:bg-slate-50 transition-colors"
                    >
                        Book a Demo
                    </Link>
                </div>


            </div>
        </section>
    );
}
