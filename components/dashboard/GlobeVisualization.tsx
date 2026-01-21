'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import createGlobe from 'cobe'

/**
 * Interactive Globe - Clean white theme
 * Drag to rotate, hover markers for stats
 */

interface LocationData {
    city: string
    country: string
    lat: number
    lng: number
    clicks: number
}

// Mock data with real coordinates
const MOCK_LOCATIONS: LocationData[] = [
    { city: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522, clicks: 847 },
    { city: 'New York', country: 'USA', lat: 40.7128, lng: -74.0060, clicks: 423 },
    { city: 'London', country: 'UK', lat: 51.5074, lng: -0.1278, clicks: 312 },
    { city: 'Berlin', country: 'Germany', lat: 52.5200, lng: 13.4050, clicks: 289 },
    { city: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503, clicks: 178 },
    { city: 'San Francisco', country: 'USA', lat: 37.7749, lng: -122.4194, clicks: 234 },
    { city: 'Barcelona', country: 'Espagne', lat: 41.3851, lng: 2.1734, clicks: 145 },
    { city: 'Sydney', country: 'Australie', lat: -33.8688, lng: 151.2093, clicks: 87 },
    { city: 'Singapore', country: 'Singapour', lat: 1.3521, lng: 103.8198, clicks: 156 },
    { city: 'Toronto', country: 'Canada', lat: 43.6532, lng: -79.3832, clicks: 167 },
]

export function GlobeVisualization() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const pointerInteracting = useRef<number | null>(null)
    const pointerInteractionMovement = useRef(0)
    const [dimensions, setDimensions] = useState({ width: 600, height: 450 })
    const phiRef = useRef(0)

    useEffect(() => {
        if (!containerRef.current) return
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: 450
                })
            }
        }
        updateDimensions()
        window.addEventListener('resize', updateDimensions)
        return () => window.removeEventListener('resize', updateDimensions)
    }, [])

    useEffect(() => {
        if (!canvasRef.current) return

        let width = dimensions.width
        const devicePixelRatio = 2

        // Create marker locations for COBE
        const markers = MOCK_LOCATIONS.map(loc => ({
            location: [loc.lat, loc.lng] as [number, number],
            size: Math.max(0.03, Math.min(0.08, loc.clicks / 3000))
        }))

        const globe = createGlobe(canvasRef.current, {
            devicePixelRatio,
            width: width * devicePixelRatio,
            height: dimensions.height * devicePixelRatio,
            phi: 0,
            theta: 0.3,
            dark: 0,
            diffuse: 1.2,
            mapSamples: 20000,
            mapBrightness: 1.2,
            baseColor: [1, 1, 1],
            markerColor: [0.545, 0.361, 0.965], // Violet #8b5cf6
            glowColor: [0.9, 0.9, 0.95],
            markers,
            onRender: (state) => {
                // Auto rotate only when not interacting
                if (pointerInteracting.current === null) {
                    phiRef.current += 0.003
                }
                state.phi = phiRef.current
                state.width = width * devicePixelRatio
                state.height = dimensions.height * devicePixelRatio
            }
        })

        return () => {
            globe.destroy()
        }
    }, [dimensions])

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        pointerInteracting.current = e.clientX
        if (canvasRef.current) {
            canvasRef.current.style.cursor = 'grabbing'
        }
    }, [])

    const handlePointerUp = useCallback(() => {
        pointerInteracting.current = null
        if (canvasRef.current) {
            canvasRef.current.style.cursor = 'grab'
        }
    }, [])

    const handlePointerOut = useCallback(() => {
        pointerInteracting.current = null
        if (canvasRef.current) {
            canvasRef.current.style.cursor = 'grab'
        }
    }, [])

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (pointerInteracting.current !== null) {
            const delta = e.clientX - pointerInteracting.current
            pointerInteracting.current = e.clientX
            // Much more responsive - direct phi increment
            phiRef.current += delta * 0.01
        }
    }, [])

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-gray-900">Geographic Distribution</h3>
                    <p className="text-sm text-gray-500">{MOCK_LOCATIONS.length} active locations</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-violet-600" />
                        <span className="text-gray-500">High activity</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-violet-300" />
                        <span className="text-gray-500">Low activity</span>
                    </div>
                </div>
            </div>

            {/* Globe Container */}
            <div
                ref={containerRef}
                className="relative bg-gradient-to-b from-slate-50 to-white flex items-center justify-center"
                style={{ height: dimensions.height }}
            >
                <canvas
                    ref={canvasRef}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerOut={handlePointerOut}
                    onPointerMove={handlePointerMove}
                    style={{
                        width: dimensions.width,
                        height: dimensions.height,
                        maxWidth: '100%',
                        cursor: 'grab',
                        touchAction: 'none'
                    }}
                />

                {/* Location List on the side */}
                <div className="absolute right-4 top-4 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-100 shadow-sm p-3 max-h-[400px] overflow-y-auto">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Top Locations</p>
                    <div className="space-y-2">
                        {MOCK_LOCATIONS.slice(0, 6).map((loc) => (
                            <div key={loc.city} className="flex items-center gap-2 text-sm">
                                <div
                                    className="w-2 h-2 rounded-full bg-violet-500"
                                    style={{ opacity: 0.4 + (loc.clicks / 847) * 0.6 }}
                                />
                                <span className="text-gray-700">{loc.city}</span>
                                <span className="text-gray-400 ml-auto">{loc.clicks}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
