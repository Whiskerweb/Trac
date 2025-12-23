import { NextRequest, NextResponse } from 'next/server';

/**
 * CORS Headers for the analytics endpoint
 * Allows requests from the same origin (your frontend)
 */
const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // En production, remplacer par votre domaine
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: corsHeaders,
    });
}

/**
 * POST /api/analytics
 * 
 * Proxy intelligent vers Tinybird avec support du Mock Mode.
 * 
 * Features:
 * - Mock Mode: Si TINYBIRD_MOCK_MODE=true, loggue et retourne 200 sans appeler Tinybird
 * - Production: Transfère les événements vers l'API Tinybird
 * - Sécurité: Utilise TINYBIRD_TOKEN côté serveur (pas exposé au client)
 * - Error Handling: Ne fait jamais planter le client
 */
export async function POST(request: NextRequest) {
    // ============================================
    // 🦁 MOCK MODE - Vérification AVANT tout parsing
    // ============================================
    if (process.env.TINYBIRD_MOCK_MODE === 'true') {
        console.log('[🦁 MOCK PROXY] Event received (body not parsed in mock mode)');

        return NextResponse.json(
            { success: true, mock: true, message: 'Event logged in mock mode' },
            { status: 200, headers: corsHeaders }
        );
    }

    try {
        // Parse le body JSON (seulement en mode production)
        const body = await request.json();

        // ============================================
        // 🚀 PRODUCTION MODE - Forward to Tinybird
        // ============================================
        const tinybirdToken = process.env.TINYBIRD_TOKEN;

        if (!tinybirdToken) {
            console.error('[Analytics Proxy] TINYBIRD_TOKEN is not configured');
            return NextResponse.json(
                { success: false, error: 'Analytics service not configured' },
                { status: 500, headers: corsHeaders }
            );
        }

        // Extraire le nom de la datasource depuis le body ou utiliser une valeur par défaut
        const datasource = body.datasource || body.name || 'events';

        // Construire l'URL Tinybird avec le paramètre name
        const tinybirdUrl = `https://api.tinybird.co/v0/events?name=${datasource}`;

        // Forward la requête vers Tinybird
        const tinybirdResponse = await fetch(tinybirdUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${tinybirdToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body.data || body),
        });

        // Parser la réponse Tinybird
        const responseData = await tinybirdResponse.json();

        if (!tinybirdResponse.ok) {
            console.error('[Analytics Proxy] Tinybird error:', responseData);
            return NextResponse.json(
                { success: false, error: 'Failed to ingest event' },
                { status: tinybirdResponse.status, headers: corsHeaders }
            );
        }

        return NextResponse.json(
            { success: true, ...responseData },
            { status: 200, headers: corsHeaders }
        );

    } catch (error) {
        // Ne jamais faire planter le client - log l'erreur et retourne un 200 gracieux
        console.error('[Analytics Proxy] Error:', error instanceof Error ? error.message : error);

        return NextResponse.json(
            { success: false, error: 'Internal proxy error' },
            { status: 500, headers: corsHeaders }
        );
    }
}
