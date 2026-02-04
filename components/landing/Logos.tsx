'use client';

const logos = [
    { name: 'Alix', src: '/partn/Alix.png' },
    { name: 'Beo', src: '/partn/beo.png' },
    { name: 'KeepCalls', src: '/partn/keepcalls.png' },
    { name: 'MyWai', src: '/partn/mywai.png' },
    { name: 'Reevy', src: '/partn/Reevy.png' },
];

export function Logos() {
    // Quadruple logos for seamless infinite scroll on wide screens
    const duplicatedLogos = [...logos, ...logos, ...logos, ...logos];

    return (
        <section className="py-8 md:py-12 bg-white border-b border-gray-100 overflow-hidden">
            <div className="relative">
                {/* Gradient masks for smooth fade edges */}
                <div className="absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

                {/* Scrolling container */}
                <div className="flex animate-scroll hover:pause-animation">
                    {duplicatedLogos.map((logo, idx) => (
                        <div
                            key={`${logo.name}-${idx}`}
                            className="flex items-center justify-center shrink-0 px-6 md:px-12"
                        >
                            <img
                                src={logo.src}
                                alt={`${logo.name} logo`}
                                style={{ height: '36px', width: 'auto', filter: 'brightness(0)' }}
                                className="object-contain opacity-60 hover:opacity-100 transition-opacity duration-300"
                            />
                        </div>
                    ))}
                </div>
            </div>

            <style jsx>{`
                @keyframes scroll {
                    0% {
                        transform: translateX(0);
                    }
                    100% {
                        transform: translateX(-25%);
                    }
                }
                .animate-scroll {
                    animation: scroll 30s linear infinite;
                }
                .animate-scroll:hover {
                    animation-play-state: paused;
                }
            `}</style>
        </section>
    );
}
