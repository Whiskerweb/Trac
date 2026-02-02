/**
 * Admin Treasury Export API
 *
 * GET /api/admin/treasury/export - Export treasury data as CSV
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { isAdmin } from '@/lib/admin'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!isAdmin(user.email)) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        }

        // Get all PLATFORM sellers with their balances
        const platformSellers = await prisma.seller.findMany({
            where: { payout_method: 'PLATFORM' },
            include: { Profile: true }
        })

        const sellerIds = platformSellers.map(s => s.id)

        // Get balances
        const balances = await prisma.sellerBalance.findMany({
            where: { seller_id: { in: sellerIds } }
        })
        const balanceMap = new Map(balances.map(b => [b.seller_id, b]))

        // Get all wallet ledger entries for these sellers
        const ledgerEntries = await prisma.walletLedger.findMany({
            where: { seller_id: { in: sellerIds } },
            orderBy: { created_at: 'desc' }
        })

        // Get gift card redemptions
        const giftCards = await prisma.giftCardRedemption.findMany({
            where: { seller_id: { in: sellerIds } },
            orderBy: { created_at: 'desc' }
        })

        // Get startup payments
        const startupPayments = await prisma.startupPayment.findMany({
            where: { status: 'PAID' },
            include: { Workspace: { select: { name: true } } },
            orderBy: { created_at: 'desc' }
        })

        const today = new Date().toISOString().split('T')[0]

        // Build CSV content
        let csv = ''

        // ============================
        // Section 1: Summary
        // ============================
        csv += 'RAPPORT DE TRESORERIE TRAAACTION\n'
        csv += `Date d\'export;${today}\n`
        csv += '\n'

        // Calculate totals
        let totalOwed = 0
        let totalPending = 0
        let totalPaidOut = 0

        platformSellers.forEach(seller => {
            const balance = balanceMap.get(seller.id)
            totalOwed += balance?.balance || 0
            totalPending += balance?.pending || 0
            totalPaidOut += balance?.paid_total || 0
        })

        const totalReceivedFromStartups = startupPayments.reduce((sum, p) => sum + p.partner_total, 0)
        const totalPlatformFees = startupPayments.reduce((sum, p) => sum + p.platform_total, 0)
        const totalGiftCardsPaid = giftCards
            .filter(g => g.status === 'DELIVERED')
            .reduce((sum, g) => sum + g.amount, 0)

        csv += 'RESUME\n'
        csv += `Total du aux sellers (PLATFORM);${(totalOwed / 100).toFixed(2)} EUR\n`
        csv += `Total en attente (hold);${(totalPending / 100).toFixed(2)} EUR\n`
        csv += `Total deja paye (gift cards);${(totalPaidOut / 100).toFixed(2)} EUR\n`
        csv += `Total recu des startups;${(totalReceivedFromStartups / 100).toFixed(2)} EUR\n`
        csv += `Frais plateforme perçus;${(totalPlatformFees / 100).toFixed(2)} EUR\n`
        csv += `Nombre de sellers PLATFORM;${platformSellers.length}\n`
        csv += '\n'

        // ============================
        // Section 2: Sellers Balances
        // ============================
        csv += 'SOLDES PAR SELLER\n'
        csv += 'ID;Nom;Email;Solde Disponible;En Attente;Total Paye;Date Inscription\n'

        platformSellers
            .sort((a, b) => (balanceMap.get(b.id)?.balance || 0) - (balanceMap.get(a.id)?.balance || 0))
            .forEach(seller => {
                const balance = balanceMap.get(seller.id)
                csv += `${seller.id};${seller.name || 'N/A'};${seller.email};`
                csv += `${((balance?.balance || 0) / 100).toFixed(2)};`
                csv += `${((balance?.pending || 0) / 100).toFixed(2)};`
                csv += `${((balance?.paid_total || 0) / 100).toFixed(2)};`
                csv += `${seller.created_at.toISOString().split('T')[0]}\n`
            })

        csv += '\n'

        // ============================
        // Section 3: Gift Card Redemptions
        // ============================
        csv += 'CARTES CADEAUX\n'
        csv += 'ID;Seller ID;Type Carte;Montant;Statut;Date\n'

        giftCards.forEach(gc => {
            csv += `${gc.id};${gc.seller_id};${gc.card_type};`
            csv += `${(gc.amount / 100).toFixed(2)};${gc.status};`
            csv += `${gc.created_at.toISOString().split('T')[0]}\n`
        })

        csv += '\n'

        // ============================
        // Section 4: Wallet Ledger
        // ============================
        csv += 'MOUVEMENTS WALLET (LEDGER)\n'
        csv += 'ID;Seller ID;Type;Montant;Reference;Description;Solde Apres;Date\n'

        ledgerEntries.forEach(entry => {
            csv += `${entry.id};${entry.seller_id};${entry.entry_type};`
            csv += `${(entry.amount / 100).toFixed(2)};${entry.reference_type || 'N/A'};`
            csv += `${entry.description || 'N/A'};`
            csv += `${((entry.balance_after || 0) / 100).toFixed(2)};`
            csv += `${entry.created_at.toISOString().split('T')[0]}\n`
        })

        csv += '\n'

        // ============================
        // Section 5: Startup Payments
        // ============================
        csv += 'PAIEMENTS STARTUPS\n'
        csv += 'ID;Startup;Total;Part Sellers;Part Plateforme;Nb Commissions;Date\n'

        startupPayments.forEach(payment => {
            csv += `${payment.id};${payment.Workspace?.name || 'N/A'};`
            csv += `${(payment.total_amount / 100).toFixed(2)};`
            csv += `${(payment.partner_total / 100).toFixed(2)};`
            csv += `${(payment.platform_total / 100).toFixed(2)};`
            csv += `${payment.commission_count};`
            csv += `${payment.created_at.toISOString().split('T')[0]}\n`
        })

        // Return CSV as downloadable file
        return new NextResponse(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="traaaction-treasury-${today}.csv"`
            }
        })

    } catch (error) {
        console.error('[Treasury Export] GET error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
