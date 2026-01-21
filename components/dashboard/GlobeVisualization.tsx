'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import createGlobe from 'cobe'
import useSWR from 'swr'

/**
 * Interactive Globe - Connected to real Tinybird data
 * Drag to rotate, shows real city distribution
 */

interface LocationData {
    city: string
    country: string
    lat: number
    lng: number
    clicks: number
}

// City coordinates mapping (expand as needed)
const CITY_COORDINATES: Record<string, { lat: number; lng: number; country: string }> = {
    // France
    'Paris': { lat: 48.8566, lng: 2.3522, country: 'France' },
    'Lyon': { lat: 45.7640, lng: 4.8357, country: 'France' },
    'Marseille': { lat: 43.2965, lng: 5.3698, country: 'France' },
    'Toulouse': { lat: 43.6047, lng: 1.4442, country: 'France' },
    'Nice': { lat: 43.7102, lng: 7.2620, country: 'France' },
    'Bordeaux': { lat: 44.8378, lng: -0.5792, country: 'France' },
    // USA
    'New York': { lat: 40.7128, lng: -74.0060, country: 'USA' },
    'Los Angeles': { lat: 34.0522, lng: -118.2437, country: 'USA' },
    'San Francisco': { lat: 37.7749, lng: -122.4194, country: 'USA' },
    'Chicago': { lat: 41.8781, lng: -87.6298, country: 'USA' },
    'Miami': { lat: 25.7617, lng: -80.1918, country: 'USA' },
    'Seattle': { lat: 47.6062, lng: -122.3321, country: 'USA' },
    'Boston': { lat: 42.3601, lng: -71.0589, country: 'USA' },
    'Austin': { lat: 30.2672, lng: -97.7431, country: 'USA' },
    // UK
    'London': { lat: 51.5074, lng: -0.1278, country: 'UK' },
    'Manchester': { lat: 53.4808, lng: -2.2426, country: 'UK' },
    'Birmingham': { lat: 52.4862, lng: -1.8904, country: 'UK' },
    'Edinburgh': { lat: 55.9533, lng: -3.1883, country: 'UK' },
    // Germany
    'Berlin': { lat: 52.5200, lng: 13.4050, country: 'Germany' },
    'Munich': { lat: 48.1351, lng: 11.5820, country: 'Germany' },
    'Hamburg': { lat: 53.5511, lng: 9.9937, country: 'Germany' },
    'Frankfurt': { lat: 50.1109, lng: 8.6821, country: 'Germany' },
    'Cologne': { lat: 50.9375, lng: 6.9603, country: 'Germany' },
    // Spain
    'Madrid': { lat: 40.4168, lng: -3.7038, country: 'Spain' },
    'Barcelona': { lat: 41.3851, lng: 2.1734, country: 'Spain' },
    'Valencia': { lat: 39.4699, lng: -0.3763, country: 'Spain' },
    // Italy
    'Rome': { lat: 41.9028, lng: 12.4964, country: 'Italy' },
    'Milan': { lat: 45.4642, lng: 9.1900, country: 'Italy' },
    // Netherlands
    'Amsterdam': { lat: 52.3676, lng: 4.9041, country: 'Netherlands' },
    // Belgium
    'Brussels': { lat: 50.8503, lng: 4.3517, country: 'Belgium' },
    // Switzerland
    'Zurich': { lat: 47.3769, lng: 8.5417, country: 'Switzerland' },
    'Geneva': { lat: 46.2044, lng: 6.1432, country: 'Switzerland' },
    // Canada
    'Toronto': { lat: 43.6532, lng: -79.3832, country: 'Canada' },
    'Vancouver': { lat: 49.2827, lng: -123.1207, country: 'Canada' },
    'Montreal': { lat: 45.5017, lng: -73.5673, country: 'Canada' },
    // Asia Pacific
    'Tokyo': { lat: 35.6762, lng: 139.6503, country: 'Japan' },
    'Singapore': { lat: 1.3521, lng: 103.8198, country: 'Singapore' },
    'Sydney': { lat: -33.8688, lng: 151.2093, country: 'Australia' },
    'Melbourne': { lat: -37.8136, lng: 144.9631, country: 'Australia' },
    'Hong Kong': { lat: 22.3193, lng: 114.1694, country: 'Hong Kong' },
    'Seoul': { lat: 37.5665, lng: 126.9780, country: 'South Korea' },
    'Mumbai': { lat: 19.0760, lng: 72.8777, country: 'India' },
    'Dubai': { lat: 25.2048, lng: 55.2708, country: 'UAE' },
    // South America
    'São Paulo': { lat: -23.5505, lng: -46.6333, country: 'Brazil' },
    'Buenos Aires': { lat: -34.6037, lng: -58.3816, country: 'Argentina' },
    'Mexico City': { lat: 19.4326, lng: -99.1332, country: 'Mexico' },
}

// Fetcher for SWR
const fetcher = async (url: string) => {
    const res = await fetch(url, {
        cache: 'no-store',
        credentials: 'include'
    })
    if (!res.ok) return { data: [] }
    return res.json()
}

export function GlobeVisualization() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const pointerInteracting = useRef<number | null>(null)
    const pointerInteractionMovement = useRef(0)
    const [dimensions, setDimensions] = useState({ width: 600, height: 450 })
    const phiRef = useRef(0)

    // Fetch real cities data from API
    const { data: citiesData } = useSWR(
        '/api/stats/breakdown?dimension=cities',
        fetcher,
        { revalidateOnFocus: false }
    )

    // Transform API data to LocationData
    const locations: LocationData[] = (citiesData?.data || [])
        .map((city: any) => {
            const coords = CITY_COORDINATES[city.name]
            if (!coords) return null
            return {
                city: city.name,
                country: coords.country,
                lat: coords.lat,
                lng: coords.lng,
                clicks: city.clicks || 0
            }
        })
        .filter((loc: LocationData | null): loc is LocationData => loc !== null)
        .slice(0, 20) // Limit to top 20

    const maxClicks = Math.max(...locations.map(l => l.clicks), 1)

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

        // Create marker locations for COBE from real data
        const markers = locations.map(loc => ({
            location: [loc.lat, loc.lng] as [number, number],
            size: Math.max(0.03, Math.min(0.08, (loc.clicks / maxClicks) * 0.08))
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
    }, [dimensions, locations, maxClicks])

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
                    <p className="text-sm text-gray-500">
                        {locations.length > 0
                            ? `${locations.length} active locations`
                            : 'No data yet'
                        }
                    </p>
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
                    {locations.length > 0 ? (
                        <div className="space-y-2">
                            {locations.slice(0, 6).map((loc) => (
                                <div key={loc.city} className="flex items-center gap-2 text-sm">
                                    <div
                                        className="w-2 h-2 rounded-full bg-violet-500"
                                        style={{ opacity: 0.4 + (loc.clicks / maxClicks) * 0.6 }}
                                    />
                                    <span className="text-gray-700">{loc.city}</span>
                                    <span className="text-gray-400 ml-auto">{loc.clicks}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400">No click data yet</p>
                    )}
                </div>
            </div>
        </div>
    )
}
