import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/admin/force-mature
 *
 * Force une commission PENDING à passer en PROCEED immédiatement
 * (bypass le délai de 30 jours pour tester)
 *
 * IMPORTANT: Seulement en développement !
 *
 * Body: { commissionId: string }
 */
export async function POST(request: NextRequest) {
    // ⚠️ SÉCURITÉ: Seulement si ENABLE_DEV_TOOLS=true
    if (process.env.ENABLE_DEV_TOOLS !== 'true') {
        return NextResponse.json(
            { error: 'Endpoint disponible uniquement en mode développement' },
            { status: 403 }
        )
    }

    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
        }

        const { commissionId } = await request.json()

        if (!commissionId) {
            return NextResponse.json(
                { error: 'commissionId requis' },
                { status: 400 }
            )
        }

        // Récupérer la commission
        const commission = await prisma.commission.findUnique({
            where: { id: commissionId },
            include: {
                Seller: {
                    select: {
                        email: true,
                        name: true
                    }
                }
            }
        })

        if (!commission) {
            return NextResponse.json(
                { error: 'Commission introuvable' },
                { status: 404 }
            )
        }

        // Vérifier que c'est bien PENDING
        if (commission.status !== 'PENDING') {
            return NextResponse.json(
                { error: `Commission déjà en statut ${commission.status}` },
                { status: 400 }
            )
        }

        // 🎯 FORCER LA MATURATION
        // On recule created_at de 31 jours pour simuler une commission mature
        const thirtyOneDaysAgo = new Date()
        thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31)

        const updated = await prisma.commission.update({
            where: { id: commissionId },
            data: {
                status: 'PROCEED',
                created_at: thirtyOneDaysAgo,
                matured_at: new Date()
            }
        })

        console.log(`[Admin] 🚀 Commission ${commissionId} forcée en PROCEED (test mode)`)

        return NextResponse.json({
            success: true,
            message: 'Commission maturée avec succès',
            commission: {
                id: updated.id,
                status: updated.status,
                seller: commission.Seller?.name || commission.Seller?.email,
                amount: updated.commission_amount,
                createdAt: updated.created_at,
                maturedAt: updated.matured_at
            }
        })

    } catch (error) {
        console.error('[Admin] Erreur force-mature:', error)
        return NextResponse.json(
            { error: 'Erreur lors de la maturation forcée' },
            { status: 500 }
        )
    }
}

/**
 * GET /api/admin/force-mature
 *
 * Liste toutes les commissions PENDING pour faciliter les tests
 */
export async function GET(request: NextRequest) {
    // ⚠️ SÉCURITÉ: Seulement si ENABLE_DEV_TOOLS=true
    if (process.env.ENABLE_DEV_TOOLS !== 'true') {
        return NextResponse.json(
            { error: 'Endpoint disponible uniquement en mode développement' },
            { status: 403 }
        )
    }

    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
        }

        // Récupérer toutes les commissions PENDING
        const pendingCommissions = await prisma.commission.findMany({
            where: { status: 'PENDING' },
            include: {
                Seller: {
                    select: {
                        email: true,
                        name: true
                    }
                }
            },
            orderBy: { created_at: 'desc' },
            take: 20
        })

        const formatted = pendingCommissions.map(c => ({
            id: c.id,
            seller: c.Seller?.name || c.Seller?.email || 'Unknown',
            amount: c.commission_amount,
            grossAmount: c.gross_amount,
            createdAt: c.created_at,
            daysOld: Math.floor((Date.now() - c.created_at.getTime()) / (1000 * 60 * 60 * 24))
        }))

        return NextResponse.json({
            success: true,
            count: formatted.length,
            commissions: formatted
        })

    } catch (error) {
        console.error('[Admin] Erreur liste pending:', error)
        return NextResponse.json(
            { error: 'Erreur lors de la récupération des commissions' },
            { status: 500 }
        )
    }
}
