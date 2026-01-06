import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { StartupDashboardClient } from '@/components/StartupDashboardClient'
import { getLinkStats, aggregateStats } from '@/lib/stats'

export const dynamic = 'force-dynamic'

export default async function StartupDashboard() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    if (user.role !== 'STARTUP') {
        redirect('/dashboard/affiliate')
    }

    // Fetch user's projects with links
    const projects = await prisma.project.findMany({
        where: {
            user_id: user.userId,
        },
        include: {
            links: {
                include: {
                    claimer: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy: {
                    created_at: 'desc',
                },
            },
        },
        orderBy: {
            created_at: 'desc',
        },
    })

    // Get all link IDs across all projects
    const allLinkIds = projects.flatMap(p => p.links.map(l => l.id))

    // Fetch stats from Tinybird
    const linkStats = await getLinkStats(allLinkIds)
    const totalStats = aggregateStats(linkStats)

    // Serialize dates for client component
    const serializedProjects = projects.map((p: typeof projects[number]) => ({
        ...p,
        created_at: p.created_at.toISOString(),
        links: p.links.map((l: typeof p.links[number]) => ({
            ...l,
            created_at: l.created_at.toISOString(),
        })),
    }))

    return (
        <StartupDashboardClient
            email={user.email}
            initialProjects={serializedProjects}
            linkStats={linkStats}
            totalStats={totalStats}
        />
    )
}
