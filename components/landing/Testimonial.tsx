"use client";

export const Testimonial = () => {
    return (
        <div className="border-t border-slate-200 bg-white relative overflow-hidden">
            {/* Dot Grid Background */}
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-60" />

            <div className="container mx-auto px-4 max-w-5xl py-24 relative z-10">
                <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-12 md:gap-20">

                    {/* Left: Profile Stack */}
                    <div className="flex flex-col items-center md:items-start gap-6 shrink-0 order-2 md:order-1">
                        {/* Avatar */}
                        <a
                            href="https://www.linkedin.com/in/lucas-roncey/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden border border-slate-200 shadow-sm grayscale hover:grayscale-0 transition-all duration-500 block"
                        >
                            <img
                                src="/Logotrac/lucasroncey.png"
                                alt="Lucas Roncey"
                                className="w-full h-full object-cover"
                            />
                        </a>

                        <div className="text-center md:text-left">
                            <div className="font-bold text-slate-900 text-lg">Lucas Roncey</div>
                            <div className="text-sm text-slate-500 font-medium">Co-founder Traaaction</div>
                        </div>
                    </div>

                    {/* Right: Quote */}
                    <blockquote className="flex-1 text-xl md:text-2xl font-medium text-slate-900 leading-tight tracking-tight text-center md:text-right order-1 md:order-2">
                        &quot;In the era of AI, we believe skills will be valued through experience rather than degrees or certifications. Traaaction aims to become a truly reliable source for our sellers&apos; skills, which will eventually be rightfully recognized on a professional CV.&quot;
                    </blockquote>

                </div>
            </div>
        </div>
    );
};
