'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProjectCreateModal } from './ProjectCreateModal'
import { CopyButton } from './CopyButton'

interface LinkStats {
    clicks: number
    sales: number
    revenue: number
}

interface Project {
    id: string
    name: string
    website: string | null
    public_key: string
    created_at: string
    links: {
        id: string
        claimer: {
            name: string
            email: string
        }
        created_at: string
    }[]
}

interface StartupDashboardClientProps {
    email: string
    initialProjects: Project[]
    linkStats: Record<string, LinkStats>
    totalStats: LinkStats
}

export function StartupDashboardClient({
    email,
    initialProjects,
    linkStats,
    totalStats
}: StartupDashboardClientProps) {
    const [projects, setProjects] = useState<Project[]>(initialProjects)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const router = useRouter()

    // Calculate total links
    const totalLinks = projects.reduce((acc, p) => acc + p.links.length, 0)

    const handleProjectCreated = () => {
        router.refresh()
        fetch('/api/projects')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.projects) {
                    router.refresh()
                }
            })
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
        }).format(amount)
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                            Startup Dashboard
                        </h1>
                        <p className="text-zinc-400 mt-2">Welcome back, {email}</p>
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

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-xl p-6">
                        <div className="text-sm text-green-400 font-medium">Total Revenue</div>
                        <div className="text-3xl font-bold text-white mt-2">
                            {formatCurrency(totalStats.revenue)}
                        </div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <div className="text-sm text-zinc-400">Total Events</div>
                        <div className="text-3xl font-bold text-white mt-2">{totalStats.clicks}</div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <div className="text-sm text-zinc-400">Sales</div>
                        <div className="text-3xl font-bold text-white mt-2">{totalStats.sales}</div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <div className="text-sm text-zinc-400">Active Links</div>
                        <div className="text-3xl font-bold text-white mt-2">{totalLinks}</div>
                    </div>
                </div>

                {/* My Projects */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold">My Projects</h2>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg transition flex items-center gap-2"
                        >
                            <span className="text-lg">+</span>
                            New Project
                        </button>
                    </div>
                    <div className="grid gap-4">
                        {projects.map((project) => (
                            <div
                                key={project.id}
                                className="bg-zinc-900 border border-zinc-800 rounded-lg p-6"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-white">{project.name}</h3>
                                        <p className="text-sm text-zinc-400 mt-1">{project.website || 'No website'}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-blue-400">{project.links.length}</div>
                                        <div className="text-xs text-zinc-500">Active Links</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-800/50 rounded-lg">
                                    <div>
                                        <div className="text-xs text-zinc-500 mb-1">API Key</div>
                                        <div className="flex items-center gap-2">
                                            <code className="text-xs text-blue-400 break-all">{project.public_key}</code>
                                            <CopyButton text={project.public_key} />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-zinc-500">Created</div>
                                        <div className="text-sm text-zinc-300">
                                            {new Date(project.created_at).toLocaleDateString('fr-FR', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {projects.length === 0 && (
                            <div className="text-center py-12 bg-zinc-900 border border-zinc-800 rounded-lg">
                                <p className="text-zinc-400 mb-4">No projects yet. Create your first project to get started!</p>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg transition"
                                >
                                    + Create Project
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Performance by Link */}
                <div>
                    <h2 className="text-2xl font-bold mb-4">Performance by Link</h2>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                        {totalLinks > 0 ? (
                            <table className="w-full">
                                <thead className="bg-zinc-800/50">
                                    <tr>
                                        <th className="text-left px-6 py-3 text-sm font-semibold text-zinc-300">Link ID</th>
                                        <th className="text-left px-6 py-3 text-sm font-semibold text-zinc-300">Affiliate</th>
                                        <th className="text-left px-6 py-3 text-sm font-semibold text-zinc-300">Project</th>
                                        <th className="text-right px-6 py-3 text-sm font-semibold text-zinc-300">Events</th>
                                        <th className="text-right px-6 py-3 text-sm font-semibold text-zinc-300">Sales</th>
                                        <th className="text-right px-6 py-3 text-sm font-semibold text-zinc-300">Revenue</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {projects.flatMap((project) =>
                                        project.links.map((link) => {
                                            const stats = linkStats[link.id] || { clicks: 0, sales: 0, revenue: 0 }
                                            return (
                                                <tr key={link.id} className="hover:bg-zinc-800/30">
                                                    <td className="px-6 py-4">
                                                        <code className="text-blue-400 bg-zinc-800 px-2 py-1 rounded text-sm">
                                                            {link.id}
                                                        </code>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-zinc-300">
                                                        <div>{link.claimer.name}</div>
                                                        <div className="text-xs text-zinc-500">{link.claimer.email}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-zinc-300">{project.name}</td>
                                                    <td className="px-6 py-4 text-sm text-right">
                                                        <span className="text-zinc-300">{stats.clicks}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-right">
                                                        <span className="text-zinc-300">{stats.sales}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-right">
                                                        <span className={stats.revenue > 0 ? 'text-green-400 font-medium' : 'text-zinc-500'}>
                                                            {formatCurrency(stats.revenue)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-zinc-400">No affiliate links yet. Affiliates will appear here once they claim links.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal */}
            <ProjectCreateModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleProjectCreated}
            />
        </div>
    )
}
