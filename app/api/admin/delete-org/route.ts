/**
 * TEMPORARY — Admin endpoint to delete an organization and all linked data.
 * DELETE /api/admin/delete-org?name=top+tierce
 * Remove this file after use.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { isAdmin } from '@/lib/admin'

export async function DELETE(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user || !isAdmin(user.email)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const name = request.nextUrl.searchParams.get('name')
    if (!name) {
        return NextResponse.json({ error: 'Missing ?name= parameter' }, { status: 400 })
    }

    const org = await prisma.organization.findFirst({
        where: { name: { contains: name, mode: 'insensitive' } },
        include: {
            Members: true,
            Missions: true,
            ExclusiveMissions: { select: { id: true, title: true } },
        }
    })

    if (!org) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const log: string[] = []
    log.push(`Found org: ${org.name} (${org.id})`)
    log.push(`Members: ${org.Members.length}, OrgMissions: ${org.Missions.length}, ExclusiveMissions: ${org.ExclusiveMissions.length}`)

    const orgMissionIds = org.Missions.map(m => m.id)
    const exclusiveMissionIds = org.ExclusiveMissions.map(m => m.id)

    // 1. Clear organization_mission_id on linked commissions
    if (orgMissionIds.length > 0) {
        const cleared = await prisma.commission.updateMany({
            where: { organization_mission_id: { in: orgMissionIds } },
            data: { organization_mission_id: null }
        })
        log.push(`Commissions unlinked from org missions: ${cleared.count}`)
    }

    // 2. Delete enrollments (+ their shortlinks), commissions on exclusive (cloned) missions
    if (exclusiveMissionIds.length > 0) {
        // Find shortlinks tied to enrollments before deleting enrollments
        const enrollments = await prisma.missionEnrollment.findMany({
            where: { mission_id: { in: exclusiveMissionIds }, link_id: { not: null } },
            select: { link_id: true },
        })
        const linkIds = enrollments.map(e => e.link_id).filter((id): id is string => id !== null)

        const delEnrollments = await prisma.missionEnrollment.deleteMany({
            where: { mission_id: { in: exclusiveMissionIds } }
        })
        log.push(`Enrollments deleted: ${delEnrollments.count}`)

        // Delete orphaned shortlinks
        if (linkIds.length > 0) {
            const delShortlinks = await prisma.shortLink.deleteMany({
                where: { id: { in: linkIds } }
            })
            log.push(`ShortLinks deleted: ${delShortlinks.count}`)
        }

        // Delete commissions linked to these shortlinks
        if (linkIds.length > 0) {
            const delCommissions = await prisma.commission.deleteMany({
                where: { link_id: { in: linkIds } }
            })
            log.push(`Commissions on exclusive missions deleted: ${delCommissions.count}`)
        }

        const delMissions = await prisma.mission.deleteMany({
            where: { id: { in: exclusiveMissionIds } }
        })
        log.push(`Exclusive missions deleted: ${delMissions.count}`)
    }

    // 3. Delete organization (cascades to Members + OrgMissions)
    await prisma.organization.delete({ where: { id: org.id } })
    log.push(`Organization deleted: ${org.name}`)

    // 4. Cancel pending org deal messages
    const updatedMessages = await prisma.message.updateMany({
        where: {
            message_type: 'ORG_DEAL_PROPOSAL',
            action_status: 'PENDING',
        },
        data: { action_status: 'CANCELLED' }
    })
    if (updatedMessages.count > 0) {
        log.push(`Pending org deal messages cancelled: ${updatedMessages.count}`)
    }

    return NextResponse.json({ success: true, log })
}
