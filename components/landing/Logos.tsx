'use client';

// Placeholder logos - just simple geometric shapes or text for now
const logos = [
    "Acme Corp", "Global Bank", "Starlight", "Neptune", "ProLine", "TechSavvy", "BlueSky", "Horizon"
];

export function Logos() {
    return (
        <section className="py-12 border-y border-gray-100 bg-white/50 backdrop-blur-sm relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                <p className="text-center text-sm font-medium text-gray-500 mb-8 uppercase tracking-widest">
                    Trusted by innovative teams worldwide
                </p>

                <div className="relative flex overflow-x-hidden group">
                    {/* Gradient Masks */}
                    <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-10" />
                    <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-10" />

                    <div className="animate-marquee whitespace-nowrap flex gap-16 py-2">
                        {[...logos, ...logos, ...logos].map((logo, idx) => (
                            <span key={idx} className="text-xl font-bold text-gray-300 hover:text-gray-500 transition-colors uppercase tracking-tight select-none">
                                {logo}
                            </span>
                        ))}
                    </div>
                    {/* Duplicate for infinite loop smoothness if needed, but the marquee css usually handles it by duplicating content inside */}
                </div>
            </div>
        </section>
    );
}

// Ensure you add this keyframe to globals.css if not already present
// @keyframes marquee {
//   0% { transform: translateX(0); }
//   100% { transform: translateX(-50%); }
// }
