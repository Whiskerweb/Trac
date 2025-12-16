import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ClaimForm from '@/components/claim-form'

export const dynamic = 'force-dynamic'

export default async function AffiliateDashboard() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    if (user.role !== 'AFFILIATE') {
        redirect('/dashboard/startup')
    }

    // Fetch available projects
    const projects = await prisma.project.findMany({
        include: {
            owner: {
                select: {
                    name: true,
                },
            },
        },
    })

    // Fetch user's claimed links
    const myLinks = await prisma.link.findMany({
        where: {
            user_id: user.userId,
        },
        include: {
            project: {
                select: {
                    name: true,
                },
            },
        },
        orderBy: {
            created_at: 'desc',
        },
    })

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                            Affiliate Dashboard
                        </h1>
                        <p className="text-zinc-400 mt-2">Welcome back, {user.email}</p>
                    </div>
                    <form action="/api/auth/logout" method="POST">
                        <button
                            type="submit"
                            className="text-sm text-zinc-400 hover:text-white px-4 py-2 border border-zinc-700 rounded-lg hover:border-zinc-600 transition"
                        >
                            Logout
                        </button>
                    </form>
                </div>

                {/* Available Missions */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-4">Available Missions</h2>
                    <div className="grid gap-4">
                        {projects.map((project) => (
                            <div
                                key={project.id}
                                className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-zinc-700 transition"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-white">{project.name}</h3>
                                        <p className="text-sm text-zinc-400 mt-1">
                                            by {project.owner.name} • {project.website || 'No website'}
                                        </p>
                                    </div>
                                    <div className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-sm font-medium">
                                        Available
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-zinc-800">
                                    <ClaimForm
                                        projectId={project.id}
                                        destinationUrl={project.website || 'https://example.com'}
                                    />
                                </div>
                            </div>
                        ))}

                        {projects.length === 0 && (
                            <div className="text-center py-12 bg-zinc-900 border border-zinc-800 rounded-lg">
                                <p className="text-zinc-400">No missions available at the moment</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* My Links */}
                <div>
                    <h2 className="text-2xl font-bold mb-4">My Links</h2>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                        {myLinks.length > 0 ? (
                            <table className="w-full">
                                <thead className="bg-zinc-800/50">
                                    <tr>
                                        <th className="text-left px-6 py-3 text-sm font-semibold text-zinc-300">Link ID</th>
                                        <th className="text-left px-6 py-3 text-sm font-semibold text-zinc-300">Project</th>
                                        <th className="text-left px-6 py-3 text-sm font-semibold text-zinc-300">Name</th>
                                        <th className="text-left px-6 py-3 text-sm font-semibold text-zinc-300">Created</th>
                                        <th className="text-left px-6 py-3 text-sm font-semibold text-zinc-300">Clicks</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {myLinks.map((link) => (
                                        <tr key={link.id} className="hover:bg-zinc-800/30">
                                            <td className="px-6 py-4">
                                                <code className="text-blue-400 bg-zinc-800 px-2 py-1 rounded text-sm">
                                                    {link.id}
                                                </code>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-zinc-300">{link.project.name}</td>
                                            <td className="px-6 py-4 text-sm text-zinc-400">{link.name || '-'}</td>
                                            <td className="px-6 py-4 text-sm text-zinc-400">
                                                {new Date(link.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-zinc-400">
                                                <span className="text-zinc-500">Coming soon</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-zinc-400">No links claimed yet. Start by claiming a mission above!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
