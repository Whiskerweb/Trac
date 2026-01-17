import { NextRequest, NextResponse } from 'next/server'
import { recordLeadToTinybird } from '@/lib/analytics/tinybird'
import { TINYBIRD_HOST, TINYBIRD_TOKEN, IS_MOCK_MODE } from '@/lib/config/constants'

/**
 * Debug endpoint to test Tinybird lead recording
 * GET /api/debug/tinybird-lead
 */
export async function GET(request: NextRequest) {
    try {
        // Show current config
        const config = {
            TINYBIRD_HOST,
            TINYBIRD_TOKEN: TINYBIRD_TOKEN ? `${TINYBIRD_TOKEN.slice(0, 10)}...` : 'NOT SET',
            IS_MOCK_MODE,
            ENV_MOCK_MODE: process.env.TINYBIRD_MOCK_MODE,
            ENV_API_KEY: process.env.TINYBIRD_API_KEY ? 'SET' : 'NOT SET',
            ENV_ADMIN_TOKEN: process.env.TINYBIRD_ADMIN_TOKEN ? 'SET' : 'NOT SET',
        }

        // Try to record a test lead
        const testLead = {
            timestamp: new Date().toISOString(),
            workspace_id: 'debug-test',
            customer_id: 'debug-customer-' + Date.now(),
            customer_external_id: 'debug-external-' + Date.now(),
            click_id: null,
            link_id: null,
            affiliate_id: null,
            event_name: 'debug_test',
            metadata: '{}'
        }

        let tinybirdResult = null
        let tinybirdError = null

        try {
            // Direct call to Tinybird (bypassing Mock mode)
            const response = await fetch(`${TINYBIRD_HOST}/v0/events?name=leads`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${TINYBIRD_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(testLead)
            })

            tinybirdResult = {
                status: response.status,
                ok: response.ok,
                body: await response.text()
            }
        } catch (e: any) {
            tinybirdError = e.message
        }

        return NextResponse.json({
            config,
            testLead,
            tinybirdResult,
            tinybirdError,
            recommendation: IS_MOCK_MODE
                ? '⚠️ MOCK MODE is ON - leads not sent to Tinybird'
                : !TINYBIRD_TOKEN
                    ? '❌ TINYBIRD_TOKEN not set'
                    : '✅ Config looks OK'
        })

    } catch (error: any) {
        return NextResponse.json({
            error: error.message
        }, { status: 500 })
    }
}
