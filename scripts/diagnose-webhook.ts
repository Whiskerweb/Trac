/**
 * Diagnostic script: Check webhook config + recent events for a given email
 * Usage: npx tsx scripts/diagnose-webhook.ts bonplanbrest29@gmail.com
 */

import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { PrismaClient } from '../lib/generated/prisma/client'

const pool = new Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function diagnose(email: string) {
    console.log(`\n🔍 DIAGNOSTIC pour ${email}\n`)
    console.log('='.repeat(60))

    // 1. Find user in User table or Seller table
    const user = await prisma.user.findUnique({ where: { email } })
    const seller = await prisma.seller.findFirst({ where: { email } })

    if (!user && !seller) {
        console.log('❌ User/Seller non trouvé avec cet email')
        // Try partial match
        const partialSellers = await prisma.seller.findMany({ where: { email: { contains: email.split('@')[0] } }, take: 5 })
        if (partialSellers.length) {
            console.log('   Sellers partiels trouvés:')
            for (const s of partialSellers) console.log(`   - ${s.email} (${s.id})`)
        }
        return
    }

    if (user) console.log(`✅ User: ${user.id} (${user.role})`)
    if (seller) console.log(`✅ Seller: ${seller.id} (${seller.status}) - user_id: ${seller.user_id}`)

    // 2. Check if STARTUP → workspace + webhook
    if (user?.role === 'STARTUP') {
        const workspaceMember = await prisma.workspaceMember.findFirst({
            where: { user_id: user.id },
            include: { Workspace: true }
        })
        if (workspaceMember) {
            const ws = workspaceMember.Workspace
            console.log(`\n📦 Workspace: ${ws.id}`)
            console.log(`   Name: ${ws.name}`)

            // Webhook endpoints
            const endpoints = await prisma.webhookEndpoint.findMany({
                where: { workspace_id: ws.id }
            })
            console.log(`\n🔗 Webhook Endpoints: ${endpoints.length}`)
            for (const ep of endpoints) {
                console.log(`   - ID: ${ep.id}`)
                console.log(`     Secret: ${ep.secret ? ep.secret.slice(0, 15) + '...' : '❌ PAS DE SECRET'}`)
                console.log(`     URL: /api/webhooks/${ep.id}`)
            }

            // Missions
            const missions = await prisma.mission.findMany({
                where: { workspace_id: ws.id },
                select: {
                    id: true, title: true, status: true,
                    lead_enabled: true, sale_enabled: true, recurring_enabled: true,
                    lead_reward_amount: true, sale_reward_amount: true, sale_reward_structure: true,
                    recurring_reward_amount: true, recurring_reward_structure: true,
                    reward_type: true, reward_amount: true, reward_structure: true,
                    commission_structure: true,
                }
            })
            console.log(`\n🎯 Missions: ${missions.length}`)
            for (const m of missions) {
                console.log(`   - "${m.title}" (${m.status})`)
                console.log(`     Lead: ${m.lead_enabled ? `✅ ${m.lead_reward_amount}€` : '❌'}`)
                console.log(`     Sale: ${m.sale_enabled ? `✅ ${m.sale_reward_amount} (${m.sale_reward_structure})` : '❌'}`)
                console.log(`     Recurring: ${m.recurring_enabled ? `✅ ${m.recurring_reward_amount} (${m.recurring_reward_structure})` : '❌'}`)
                console.log(`     Legacy: type=${m.reward_type}, amount=${m.reward_amount}, structure=${m.reward_structure}, commission=${m.commission_structure}`)
            }

            // Enrollments
            const enrollments = await prisma.missionEnrollment.findMany({
                where: { Mission: { workspace_id: ws.id } },
                include: { ShortLink: true, Mission: { select: { title: true } } }
            })
            console.log(`\n📋 Enrollments: ${enrollments.length}`)
            for (const e of enrollments) {
                console.log(`   - User ${e.user_id.slice(0, 8)} → "${e.Mission.title}" (${e.status})`)
                console.log(`     link_id: ${e.link_id || '❌ PAS DE LINK'}`)
                console.log(`     group_mission_id: ${e.group_mission_id || 'null (solo)'}`)
                console.log(`     org_mission_id: ${e.organization_mission_id || 'null'}`)
                if (e.ShortLink) {
                    console.log(`     slug: ${e.ShortLink.slug}`)
                }
            }

            // Recent processed events
            const events = await prisma.processedEvent.findMany({
                where: { workspace_id: ws.id },
                orderBy: { processed_at: 'desc' },
                take: 10
            })
            console.log(`\n📨 Recent Processed Events: ${events.length}`)
            for (const ev of events) {
                console.log(`   - ${ev.event_type} | ${ev.event_id.slice(0, 30)}... | ${(ev.amount_cents ?? 0) / 100}€ | ${ev.processed_at.toISOString()}`)
            }

            // Commissions
            const commissions = await prisma.commission.findMany({
                where: { program_id: ws.id },
                orderBy: { created_at: 'desc' },
                take: 10,
                select: {
                    id: true, sale_id: true, status: true, commission_source: true,
                    gross_amount: true, commission_amount: true, platform_fee: true,
                    seller_id: true, group_id: true, created_at: true
                }
            })
            console.log(`\n💰 Recent Commissions: ${commissions.length}`)
            for (const c of commissions) {
                console.log(`   - ${c.commission_source} | ${c.status} | ${c.commission_amount / 100}€ (gross: ${c.gross_amount / 100}€) | seller: ${c.seller_id.slice(0, 8)} | group: ${c.group_id || '-'} | ${c.created_at.toISOString()}`)
            }
        }
    }

    // 3. Check seller data
    const s = seller || (user ? await prisma.seller.findFirst({ where: { user_id: user.id } }) : null)
    if (s) {
        console.log(`\n👤 Seller: ${s.id}`)
        console.log(`   Status: ${s.status}`)
        console.log(`   Name: ${s.name}`)
        console.log(`   Email: ${s.email}`)
        console.log(`   user_id: ${s.user_id}`)

        const userId = s.user_id!

        // Enrollments
        const enrollments = await prisma.missionEnrollment.findMany({
            where: { user_id: userId },
            include: {
                ShortLink: true,
                Mission: { select: { id: true, title: true, workspace_id: true, status: true, sale_enabled: true, lead_enabled: true, recurring_enabled: true, reward_type: true, reward_amount: true, commission_structure: true } }
            }
        })
        console.log(`\n📋 Seller Enrollments: ${enrollments.length}`)
        for (const e of enrollments) {
            console.log(`   - "${e.Mission.title}" (mission ${e.Mission.status}) | enrollment ${e.status}`)
            console.log(`     link_id: ${e.link_id}`)
            console.log(`     group_mission_id: ${e.group_mission_id || 'null (solo)'}`)
            console.log(`     org_mission_id: ${e.organization_mission_id || 'null'}`)
            if (e.ShortLink) {
                console.log(`     slug: ${e.ShortLink.slug} → ${e.ShortLink.original_url.slice(0, 80)}`)
            }
            console.log(`     Mission: sale=${e.Mission.sale_enabled}, lead=${e.Mission.lead_enabled}, recurring=${e.Mission.recurring_enabled}`)
            console.log(`     Legacy: type=${e.Mission.reward_type}, amount=${e.Mission.reward_amount}, structure=${e.Mission.commission_structure}`)
        }

        // Group membership
        const groupMember = await prisma.sellerGroupMember.findUnique({
            where: { seller_id: s.id },
            include: {
                Group: {
                    include: {
                        Missions: { include: { Mission: { select: { title: true, id: true } } } },
                        _count: { select: { Members: { where: { status: 'ACTIVE' } } } }
                    }
                }
            }
        })
        if (groupMember) {
            console.log(`\n👥 Group: ${groupMember.Group.id} (${groupMember.Group.status})`)
            console.log(`   Creator: ${groupMember.Group.creator_id}`)
            console.log(`   Is creator: ${groupMember.Group.creator_id === s.id}`)
            console.log(`   Members: ${groupMember.Group._count.Members}`)
            console.log(`   Group Missions: ${groupMember.Group.Missions.length}`)
            for (const gm of groupMember.Group.Missions) {
                console.log(`     - "${gm.Mission.title}" (GroupMission ${gm.id})`)
            }
        } else {
            console.log(`\n👥 Group: aucun`)
        }

        // Recent commissions
        const commissions = await prisma.commission.findMany({
            where: { seller_id: s.id },
            orderBy: { created_at: 'desc' },
            take: 10,
            select: {
                id: true, sale_id: true, status: true, commission_source: true,
                gross_amount: true, commission_amount: true, platform_fee: true,
                program_id: true, group_id: true, created_at: true
            }
        })
        console.log(`\n💰 Seller Commissions: ${commissions.length}`)
        for (const c of commissions) {
            console.log(`   - ${c.commission_source} | ${c.status} | ${c.commission_amount / 100}€ (gross: ${c.gross_amount / 100}€) | program: ${c.program_id.slice(0, 8)} | group: ${c.group_id || '-'} | ${c.created_at.toISOString()}`)
        }

        // Workspace webhook endpoints
        const workspaceIds = [...new Set(enrollments.map(e => e.Mission.workspace_id))]
        for (const wsId of workspaceIds) {
            const endpoints = await prisma.webhookEndpoint.findMany({ where: { workspace_id: wsId } })
            const ws = await prisma.workspace.findUnique({ where: { id: wsId }, select: { name: true } })
            console.log(`\n🔗 Workspace "${ws?.name}" (${wsId}) — webhook endpoints: ${endpoints.length}`)
            for (const ep of endpoints) {
                console.log(`   - ${ep.id} | secret: ${ep.secret ? '✅' : '❌ MISSING'}`)
            }

            const events = await prisma.processedEvent.findMany({
                where: { workspace_id: wsId },
                orderBy: { processed_at: 'desc' },
                take: 5
            })
            console.log(`   Recent processed events: ${events.length}`)
            for (const ev of events) {
                console.log(`     ${ev.event_type} | ${(ev.amount_cents ?? 0) / 100}€ | ${ev.processed_at.toISOString()}`)
            }
        }

        // Customers attributed
        const customers = await prisma.customer.findMany({
            where: { affiliate_id: userId },
            orderBy: { created_at: 'desc' },
            take: 5,
            select: { id: true, external_id: true, email: true, click_id: true, link_id: true, created_at: true }
        })
        console.log(`\n🧑 Customers attributed: ${customers.length}`)
        for (const c of customers) {
            console.log(`   - ${c.email || c.external_id} | click: ${c.click_id?.slice(0, 25) || 'null'} | link: ${c.link_id || 'null'} | ${c.created_at.toISOString()}`)
        }
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ Diagnostic terminé\n')
}

const email = process.argv[2]
if (!email) {
    console.log('Usage: npx tsx scripts/diagnose-webhook.ts <email>')
    process.exit(1)
}

diagnose(email)
    .catch(console.error)
    .finally(() => prisma.$disconnect())
