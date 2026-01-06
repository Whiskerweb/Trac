import { MousePointerClick, Users, ShoppingCart, Euro } from 'lucide-react'
import type { DashboardStats } from '@/lib/analytics/tinybird'

interface DashboardProps {
    stats: DashboardStats
}

export default function Dashboard({ stats }: DashboardProps) {
    const cards = [
        {
            title: 'Total Clicks',
            value: stats.total_clicks.toLocaleString(),
            icon: MousePointerClick,
            color: 'from-blue-500 to-cyan-500',
            bgColor: 'bg-blue-500/10',
            borderColor: 'border-blue-500/20',
        },
        {
            title: 'Leads',
            value: stats.total_leads.toLocaleString(),
            icon: Users,
            color: 'from-purple-500 to-pink-500',
            bgColor: 'bg-purple-500/10',
            borderColor: 'border-purple-500/20',
        },
        {
            title: 'Sales',
            value: stats.total_sales.toLocaleString(),
            icon: ShoppingCart,
            color: 'from-green-500 to-emerald-500',
            bgColor: 'bg-green-500/10',
            borderColor: 'border-green-500/20',
        },
        {
            title: 'Revenue',
            value: `${(stats.total_revenue || 0).toFixed(2)} €`,
            icon: Euro,
            color: 'from-orange-500 to-yellow-500',
            bgColor: 'bg-orange-500/10',
            borderColor: 'border-orange-500/20',
        },
    ]

    return (
        <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                📊 Analytics Dashboard
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((card) => {
                    const Icon = card.icon
                    return (
                        <div
                            key={card.title}
                            className={`${card.bgColor} border ${card.borderColor} rounded-xl p-6 backdrop-blur-sm transition-all hover:scale-105`}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-3 rounded-lg bg-gradient-to-br ${card.color}`}>
                                    <Icon className="w-6 h-6 text-white" />
                                </div>
                            </div>

                            <div>
                                <p className="text-zinc-400 text-sm mb-1">{card.title}</p>
                                <p className="text-3xl font-bold text-white">{card.value}</p>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
