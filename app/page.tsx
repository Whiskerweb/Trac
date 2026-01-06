import { getDashboardStats } from '@/lib/analytics/tinybird'
import Dashboard from '@/components/dashboard'
import HomeClient from '@/components/home-client'

export const dynamic = 'force-dynamic'

export default async function Home() {
  // Fetch stats server-side
  const stats = await getDashboardStats()

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Trac
        </h1>
        <p className="text-zinc-400 mb-8">Tracking Analytics - Link Shortener with Conversion Tracking</p>

        {/* Dashboard KPIs */}
        <Dashboard stats={stats} />

        {/* Client-side form and links */}
        <HomeClient />
      </div>
    </div>
  )
}
