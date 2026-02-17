import { prisma } from '../lib/db'

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

  // 2. Delete enrollments, shortlinks, commissions on exclusive (cloned) missions
  if (exclusiveMissionIds.length > 0) {
    const delEnrollments = await prisma.missionEnrollment.deleteMany({
      where: { mission_id: { in: exclusiveMissionIds } }
    })
    console.log('Enrollments deleted:', delEnrollments.count)

    // Delete ShortLinks tied to enrollments of exclusive missions
    const enrollmentLinks = await prisma.missionEnrollment.findMany({
      where: { mission_id: { in: exclusiveMissionIds }, link_id: { not: null } },
      select: { link_id: true },
    })
    const linkIds = enrollmentLinks.map(e => e.link_id).filter((id): id is string => id !== null)
    if (linkIds.length > 0) {
      const delShortlinks = await prisma.shortLink.deleteMany({
        where: { id: { in: linkIds } }
      })
      console.log('ShortLinks deleted:', delShortlinks.count)
    } else {
      console.log('ShortLinks deleted: 0')
    }

    const delCommissions = await prisma.commission.deleteMany({
      where: { organization_mission_id: { in: exclusiveMissionIds } }
    })
    console.log('Commissions on exclusive missions deleted:', delCommissions.count)

    // 3. Delete the exclusive (cloned) missions themselves
    const delMissions = await prisma.mission.deleteMany({
      where: { id: { in: exclusiveMissionIds } }
    })
    console.log('Exclusive missions deleted:', delMissions.count)
  }

  // 4. Delete the organization (cascades to OrganizationMember + OrganizationMission)
  await prisma.organization.delete({ where: { id: org.id } })
  console.log('Organization deleted:', org.name)

  // 5. Clean up any rich message cards related to this org
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
