import Link from "next/link"
import { ArrowUpRight, CalendarPlus, Gavel, ImagePlus, type LucideIcon } from "lucide-react"

const ACTIONS: { title: string; description: string; href: string; icon: LucideIcon }[] = [
    {
        title: "Schedule Auction",
        description: "Plan an upcoming auction.",
        href: "/dashboard/auctions/create-auctions",
        icon: CalendarPlus,
    },
    {
        title: "Manage Bids",
        description: "Monitor bidder activity.",
        href: "/dashboard/auctions/live-auctions",
        icon: Gavel,
    },
    {
        // lots are added from an auction's page
        title: "Add Artwork",
        description: "Upload a new artwork.",
        href: "/dashboard/auctions",
        icon: ImagePlus,
    },
]

export function QuickActions() {
    return (
        <section>
            <h2 className="mb-3 text-[15px] font-bold text-slate-900">Quick Actions</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {ACTIONS.map(({ title, description, href, icon: Icon }) => (
                    <Link
                        key={title}
                        href={href}
                        className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 transition-shadow hover:shadow-md"
                    >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F6E9EF] text-[#7B2D52]">
                            <Icon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-semibold text-slate-900">{title}</span>
                            <span className="block text-[11px] text-[#62666F]">{description}</span>
                        </span>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-[#7B2D52]" />
                    </Link>
                ))}
            </div>
        </section>
    )
}
