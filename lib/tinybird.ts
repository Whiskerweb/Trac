// Tinybird API client for analytics

const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'
const TINYBIRD_TOKEN = process.env.TINYBIRD_ADMIN_TOKEN


interface ClickEvent {
    timestamp: string
    click_id: string
    link_id: string
    url: string
    country: string
    user_agent: string
}

interface ConversionEvent {
    timestamp: string
    click_id: string
    event_name: string
    amount: number
    currency: string
    external_id: string
}

async function ingestToTinybird(datasource: string, data: object): Promise<{ success: boolean; error?: string }> {
    // Debug log pour voir si le token est bien là
    console.log(`[Tinybird] Ingesting to ${datasource}... Token present: ${!!TINYBIRD_TOKEN}`);

    if (!TINYBIRD_TOKEN) {
        console.error('[Tinybird] Missing TINYBIRD_ADMIN_TOKEN')
        return { success: false, error: 'Missing token' }
    }

    try {
        const response = await fetch(`${TINYBIRD_HOST}/v0/events?name=${datasource}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TINYBIRD_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('[Tinybird] Ingest error:', errorText)
            return { success: false, error: errorText }
        }

        console.log(`[Tinybird] Success! Data sent to ${datasource}`);
        return { success: true }
    } catch (error) {
        console.error('[Tinybird] Fetch error:', error)
        return { success: false, error: String(error) }
    }
}

export async function recordClick(data: Omit<ClickEvent, 'timestamp'>): Promise<{ success: boolean; error?: string }> {
    const event: ClickEvent = {
        ...data,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    }
    return ingestToTinybird('clicks', event)
}

export async function recordEvent(data: Omit<ConversionEvent, 'timestamp'>): Promise<{ success: boolean; error?: string }> {
    const event: ConversionEvent = {
        ...data,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    }
    return ingestToTinybird('events', event)
}

// Dashboard Stats
export interface DashboardStats {
    total_clicks: number
    total_leads: number
    total_sales: number
    total_revenue: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
    if (!TINYBIRD_TOKEN) {
        console.error('[Tinybird] Missing token for getDashboardStats')
        return { total_clicks: 0, total_leads: 0, total_sales: 0, total_revenue: 0 }
    }

    try {
        const url = `${TINYBIRD_HOST}/v0/pipes/kpis.json`
        console.log("🔍 Fetching KPIs from:", url)

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${TINYBIRD_TOKEN}`,
            },
            cache: 'no-store', // Always get fresh data
        })

        if (!response.ok) {
            console.error('[Tinybird] Failed to fetch stats:', response.statusText)
            return { total_clicks: 0, total_leads: 0, total_sales: 0, total_revenue: 0 }
        }

        const result = await response.json()

        // Tinybird returns { data: [...] }
        if (result.data && result.data.length > 0) {
            return result.data[0]
        }

        return { total_clicks: 0, total_leads: 0, total_sales: 0, total_revenue: 0 }
    } catch (error) {
        console.error('[Tinybird] Error fetching stats:', error)
        return { total_clicks: 0, total_leads: 0, total_sales: 0, total_revenue: 0 }
    }
}