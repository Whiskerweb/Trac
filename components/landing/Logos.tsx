'use client';

import Image from 'next/image';

const logos = [
    { name: 'Alix', src: '/partn/Alix.png', width: 100, height: 40 },
    { name: 'Beo', src: '/partn/beo.png', width: 100, height: 40 },
    { name: 'KeepCalls', src: '/partn/keepcalls.png', width: 120, height: 40 },
    { name: 'MyWai', src: '/partn/mywai.png', width: 100, height: 40 },
    { name: 'Reevy', src: '/partn/reevy.png', width: 100, height: 40 },
];

export function Logos() {
    return (
        <section className="pt-4 pb-12 bg-white border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Static Row of 5 Logos */}
                <div className="flex flex-wrap justify-between items-center gap-8 md:gap-16 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
                    {logos.map((logo, idx) => (
                        <div key={`${logo.name}-${idx}`} className="flex items-center justify-center transition-transform hover:scale-110 duration-300">
                            <img
                                src={logo.src}
                                alt={`${logo.name} logo`}
                                // Increased size to 48px, kept brightness(0) for black silhouette
                                style={{ height: '48px', width: 'auto', filter: 'brightness(0)' }}
                                className="object-contain"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
