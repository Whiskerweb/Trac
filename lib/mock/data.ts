/**
 * Mock Data for UX Testing
 * Used when TINYBIRD_MOCK_MODE=true
 */

export const MOCK_PARTNERS = [
    { id: 'partner-1', name: 'Alice Martin', email: 'alice@example.com', avatar: null },
    { id: 'partner-2', name: 'Bob Dupont', email: 'bob@example.com', avatar: null },
    { id: 'partner-3', name: 'Charlie Lévy', email: 'charlie@example.com', avatar: null },
    { id: 'partner-4', name: 'Diana Chen', email: 'diana@example.com', avatar: null },
    { id: 'partner-5', name: 'Emma Wilson', email: 'emma@example.com', avatar: null },
    { id: 'partner-6', name: 'François Garcia', email: 'francois@example.com', avatar: null },
]

export const MOCK_MISSION_STATS = {
    mission_id: 'mock-mission',
    mission_title: 'SaaS Premium - Mock',
    total_revenue: 1245000,        // 12,450€
    total_to_pay: 186750,          // 1,867.50€
    total_partners: 6,
    conversion_rate: 3.2,
    partner_leaderboard: [
        { partner_id: 'partner-1', partner_name: 'Alice Martin', total_revenue: 340000, total_commission: 51000, leads: 45, clicks: 1240, rank: 1 },
        { partner_id: 'partner-2', partner_name: 'Bob Dupont', total_revenue: 289000, total_commission: 43350, leads: 32, clicks: 890, rank: 2 },
        { partner_id: 'partner-3', partner_name: 'Charlie Lévy', total_revenue: 245000, total_commission: 36750, leads: 28, clicks: 720, rank: 3 },
        { partner_id: 'partner-4', partner_name: 'Diana Chen', total_revenue: 178000, total_commission: 26700, leads: 22, clicks: 580, rank: 4 },
        { partner_id: 'partner-5', partner_name: 'Emma Wilson', total_revenue: 112000, total_commission: 16800, leads: 15, clicks: 420, rank: 5 },
        { partner_id: 'partner-6', partner_name: 'François Garcia', total_revenue: 81000, total_commission: 12150, leads: 10, clicks: 340, rank: 6 },
    ]
}

export const MOCK_PARTNER_STATS = {
    mission_id: 'mock-mission',
    mission_title: 'SaaS Premium - Mock',
    my_revenue: 178000,            // 1,780€
    my_commission: 26700,          // 267€
    my_leads: 22,
    my_clicks: 580,
    my_rank: 4,
    total_partners: 6
}

export const MOCK_ACTIVITY_LOG = [
    { id: 'log-1', type: 'sale' as const, timestamp: new Date(Date.now() - 1000 * 60 * 30), details: 'Vente - cs_live_xxx...', amount: 4500, commission: 450 },
    { id: 'log-2', type: 'sale' as const, timestamp: new Date(Date.now() - 1000 * 60 * 120), details: 'Vente - cs_live_yyy...', amount: 8900, commission: 890 },
    { id: 'log-3', type: 'lead' as const, timestamp: new Date(Date.now() - 1000 * 60 * 180), details: 'Lead - Email inscrit', amount: undefined, commission: 0 },
    { id: 'log-4', type: 'click' as const, timestamp: new Date(Date.now() - 1000 * 60 * 240), details: 'Click - Lien produit', amount: undefined, commission: undefined },
    { id: 'log-5', type: 'sale' as const, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), details: 'Vente - cs_live_zzz...', amount: 12900, commission: 1290 },
    { id: 'log-6', type: 'lead' as const, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36), details: 'Lead - Formulaire contact', amount: undefined, commission: 0 },
]

export const MOCK_ENROLLMENTS = [
    {
        id: 'enroll-1',
        mission: { id: 'mission-1', title: 'SaaS Premium', reward: '15%' },
        link: { slug: 'alice-saas', full_url: 'https://trac.to/alice-saas', clicks: 1240 },
        status: 'APPROVED',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)
    },
    {
        id: 'enroll-2',
        mission: { id: 'mission-2', title: 'E-commerce Pro', reward: '5€' },
        link: { slug: 'alice-ecom', full_url: 'https://trac.to/alice-ecom', clicks: 456 },
        status: 'APPROVED',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15)
    },
    {
        id: 'enroll-3',
        mission: { id: 'mission-3', title: 'Finance App', reward: '25€' },
        link: { slug: 'alice-finance', full_url: 'https://trac.to/alice-finance', clicks: 89 },
        status: 'APPROVED',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7)
    }
]

export const MOCK_GLOBAL_STATS = {
    clicks: 1785,
    leads: 142,
    sales: 38,
    revenue: 5670000  // 56,700€
}
