import { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { getUserRoles } from '@/app/actions/get-user-roles'

export default async function MarketplaceLayout({ children }: { children: ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const roles = user ? await getUserRoles(user.id) : null

    // Determine back link based on role
    // If Partner -> /partner
    // If Startup -> /dashboard
    const backLink = roles?.hasPartner ? '/partner' : '/dashboard'

    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* Simple Top Navbar */}
            <header className="border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href={backLink}
                            className="p-2 -ml-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                            Marketplace
                        </h1>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {children}
            </main>
        </div>
    )
}
