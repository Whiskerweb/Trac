/**
 * Debug endpoint to diagnose webhook configuration issues
 * GET /api/admin/debug-webhooks
 *
 * Shows all webhook endpoints and their configuration status
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    try {
        // Get all webhook endpoints
        const endpoints = await prisma.webhookEndpoint.findMany({
            include: {
                Workspace: {
                    select: {
                        id: true,
                        name: true,
                        slug: true
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        })

        // Get recent startup payments to check if they have stripe_session_id
        const recentPayments = await prisma.startupPayment.findMany({
            take: 5,
            orderBy: { created_at: 'desc' },
            select: {
                id: true,
                status: true,
                stripe_session_id: true,
                stripe_payment_id: true,
                total_amount: true,
                created_at: true,
                paid_at: true,
                workspace_id: true
            }
        })

        // Check environment variables
        const envCheck = {
            STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? '✅ Set' : '❌ Missing',
            STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ? '✅ Set' : '⚠️ Optional (using DB secrets)',
            STRIPE_STARTUP_WEBHOOK_SECRET: process.env.STRIPE_STARTUP_WEBHOOK_SECRET ? '✅ Set' : '⚠️ Not set (using multi-tenant webhook)',
        }

        return NextResponse.json({
            success: true,
            message: 'Webhook configuration debug info',

            // Instructions
            instructions: {
                problem: 'Si les paiements startup restent "UNPAID", le secret webhook ne correspond pas.',
                fix: [
                    '1. Va sur Stripe Dashboard → Developers → Webhooks',
                    '2. Clique sur ton webhook endpoint',
                    '3. Copie le "Signing secret" (commence par whsec_)',
                    '4. Update the "secret" field in the WebhookEndpoint table below'
                ]
            },

            // Environment variables
            environment: envCheck,

            // Webhook endpoints in database
            webhookEndpoints: endpoints.map(e => ({
                id: e.id,
                workspace: e.Workspace?.name || 'Unknown',
                workspaceId: e.workspace_id,
                description: e.description,
                hasSecret: !!e.secret,
                secretPrefix: e.secret ? e.secret.substring(0, 10) + '...' : 'NO SECRET!',
                createdAt: e.created_at,
                // URL to configure in Stripe
                webhookUrl: `https://www.traaaction.com/api/webhooks/${e.id}`
            })),

            // Recent startup payments
            recentStartupPayments: recentPayments.map(p => ({
                id: p.id,
                status: p.status,
                amount: `${p.total_amount / 100}€`,
                hasStripeSession: !!p.stripe_session_id,
                hasStripePaymentId: !!p.stripe_payment_id,
                workspaceId: p.workspace_id,
                createdAt: p.created_at,
                paidAt: p.paid_at,
                // Diagnosis
                diagnosis: p.status === 'PENDING' && p.stripe_session_id
                    ? '⚠️ Payment completed but webhook not processed - check webhook secret!'
                    : p.status === 'PAID'
                        ? '✅ OK'
                        : 'En attente de paiement'
            })),

            // Quick actions
            quickActions: {
                manualConfirm: 'POST /api/startup-payments/confirm-manual avec { paymentId: "..." }',
                debugSeller: 'GET /api/admin/debug-seller-payout?sellerId=...',
                debugTransfers: 'GET /api/admin/debug-transfers'
            }
        })
    } catch (error) {
        console.error('[Debug Webhooks] Error:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
