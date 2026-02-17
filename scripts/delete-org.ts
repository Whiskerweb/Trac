import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local', override: true })

import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { PrismaClient } from '../lib/generated/prisma/client'

const pool = new Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const orgName = 'top tierce'

  const org = await prisma.organization.findFirst({
    where: { name: { contains: orgName, mode: 'insensitive' } },
    include: {
      Members: true,
      Missions: true,
      ExclusiveMissions: { select: { id: true, title: true } },
    }
  })

  if (!org) {
    console.log('Organization not found')
    return
  }

  console.log('=== ORG FOUND ===')
  console.log('ID:', org.id)
  console.log('Name:', org.name)
  console.log('Leader:', org.leader_id)
  console.log('Status:', org.status)
  console.log('Members:', org.Members.length)
  console.log('OrgMissions:', org.Missions.length)
  console.log('ExclusiveMissions:', org.ExclusiveMissions.length)
  org.ExclusiveMissions.forEach(m => console.log('  - Mission:', m.id, '|', m.title))

  const orgMissionIds = org.Missions.map(m => m.id)
  const exclusiveMissionIds = org.ExclusiveMissions.map(m => m.id)

  // 1. Clear organization_mission_id on any linked commissions
  if (orgMissionIds.length > 0) {
    const cleared = await prisma.commission.updateMany({
      where: { organization_mission_id: { in: orgMissionIds } },
      data: { organization_mission_id: null }
    })
    console.log('Commissions unlinked from org missions:', cleared.count)
  }

  // 2. Delete shortlinks, enrollments, commissions on exclusive (cloned) missions
  if (exclusiveMissionIds.length > 0) {
    // Delete shortlinks via their MissionEnrollment linkage
    const enrollmentsWithLinks = await prisma.missionEnrollment.findMany({
      where: { mission_id: { in: exclusiveMissionIds }, link_id: { not: null } },
      select: { link_id: true }
    })
    const linkIds = enrollmentsWithLinks.map(e => e.link_id).filter((id): id is string => id !== null)
    if (linkIds.length > 0) {
      const delShortlinks = await prisma.shortLink.deleteMany({
        where: { id: { in: linkIds } }
      })
      console.log('ShortLinks deleted:', delShortlinks.count)
    }

    const delEnrollments = await prisma.missionEnrollment.deleteMany({
      where: { mission_id: { in: exclusiveMissionIds } }
    })
    console.log('Enrollments deleted:', delEnrollments.count)

    // Delete commissions linked to these shortlinks
    if (linkIds.length > 0) {
      const delCommissions = await prisma.commission.deleteMany({
        where: { link_id: { in: linkIds } }
      })
      console.log('Commissions on exclusive missions deleted:', delCommissions.count)
    }

    // 3. Delete the exclusive (cloned) missions themselves
    const delMissions = await prisma.mission.deleteMany({
      where: { id: { in: exclusiveMissionIds } }
    })
    console.log('Exclusive missions deleted:', delMissions.count)
  }

  // 4. Delete the organization (cascades to OrganizationMember + OrganizationMission)
  await prisma.organization.delete({ where: { id: org.id } })
  console.log('Organization deleted:', org.name)

  // 5. Cancel any pending org deal messages (all orgs — safe since we just deleted)
  const updatedMessages = await prisma.message.updateMany({
    where: {
      message_type: 'ORG_DEAL_PROPOSAL',
      action_status: 'PENDING',
    },
    data: { action_status: 'CANCELLED' }
  })
  if (updatedMessages.count > 0) {
    console.log('Pending org deal messages cancelled:', updatedMessages.count)
  }

  console.log('\nDone.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
