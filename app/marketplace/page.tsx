import { prisma } from '@/lib/db'
import Link from 'next/link'
import ClaimForm from '@/components/claim-form'

export const dynamic = 'force-dynamic'

export default async function MarketplacePage() {
    // Fetch the Demo Shop project
    const demoProject = await prisma.project.findUnique({
        where: { public_key: 'pk_test_DEMO_KEY' }
    })

    if (!demoProject) {
        return (
            <div className="min-h-screen bg-zinc-950 text-white p-8">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-2xl font-bold text-red-400">Project not found</h1>
                    <p className="text-zinc-400 mt-2">Run: npm run db:seed</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/" className="text-sm text-zinc-400 hover:text-white mb-4 inline-block">
                        ← Back to Dashboard
                    </Link>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Marketplace
                    </h1>
                    <p className="text-zinc-400 mt-2">Claim tracking links for available projects</p>
                </div>

                {/* Project Card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 shadow-xl">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-white">{demoProject.name}</h2>
                            <p className="text-zinc-400 text-sm mt-1">{demoProject.website || 'No website set'}</p>
                        </div>
                        <div className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-sm font-medium">
                            Available
                        </div>
                    </div>

                    <div className="border-t border-zinc-800 pt-4 mt-4">
                        <h3 className="text-lg font-semibold mb-4">Claim Your Tracking Link</h3>

                        {/* Claim Form - Client Component */}
                        <ClaimForm projectId={demoProject.id} destinationUrl={demoProject.website || 'https://demo.example.com'} />
                    </div>
                </div>

                {/* Info Section */}
                <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <p className="text-sm text-blue-300">
                        <span className="font-semibold">💡 How it works:</span> Enter your user ID to claim a unique tracking link.
                        Share this link to track clicks and conversions back to your affiliate account.
                    </p>
                </div>
            </div>
        </div>
    )
}
