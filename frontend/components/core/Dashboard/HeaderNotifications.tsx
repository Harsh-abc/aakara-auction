"use client"

import { useState } from "react"
import { BellIcon, GavelIcon, ShieldCheckIcon, TrophyIcon, CheckCheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"

type Notification = {
    id: string
    type: "bid" | "auction" | "kyc"
    title: string
    message: string
    time: string
    read: boolean
}


const SAMPLE_NOTIFICATIONS: Notification[] = [
    { id: "1", type: "bid", title: "New bid on Lot 12", message: "₹4,50,000 placed on “Monsoon Ghats” by Arjun R.", time: "2 min ago", read: false },
    { id: "2", type: "auction", title: "Auction going live", message: "Modern Masters · Autumn Sale starts in 30 minutes.", time: "25 min ago", read: false },
    { id: "3", type: "kyc", title: "KYC submitted", message: "guleq@mailinator.com uploaded documents for review.", time: "1 hr ago", read: true },
]

const TYPE_ICON = {
    bid: <GavelIcon className="size-4" />,
    auction: <TrophyIcon className="size-4" />,
    kyc: <ShieldCheckIcon className="size-4" />,
}

export function HeaderNotifications() {
    const [notifications, setNotifications] = useState(SAMPLE_NOTIFICATIONS)
    const unreadCount = notifications.filter((n) => !n.read).length

    const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    const markRead = (id: string) =>
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))

    return (
        <Sheet>
            <SheetTrigger
                render={<Button variant="ghost" size="icon" className="relative rounded-full" aria-label="Notifications" />}
            >
                <BellIcon className="size-5" />
                {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-[#491B3A] text-[10px] font-semibold text-white ring-2 ring-background">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </SheetTrigger>

            <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
                <SheetHeader className="border-b px-6 py-5">
                    <div className="flex items-center justify-between gap-4 pr-8">
                        <div>
                            <SheetTitle>Notifications</SheetTitle>
                            <SheetDescription>
                                {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
                            </SheetDescription>
                        </div>
                        {unreadCount > 0 && (
                            <Button variant="ghost" size="sm" onClick={markAllRead}>
                                <CheckCheckIcon className="size-4" />
                                Mark all read
                            </Button>
                        )}
                    </div>
                </SheetHeader>

                {notifications.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
                        <BellIcon className="size-10 opacity-40" />
                        <p className="text-sm">No notifications yet</p>
                    </div>
                ) : (
                    <ScrollArea className="flex-1">
                        <ul className="divide-y">
                            {notifications.map((n) => (
                                <li key={n.id}>
                                    <button
                                        type="button"
                                        onClick={() => markRead(n.id)}
                                        className={`flex w-full gap-4 px-6 py-4 text-left transition-colors hover:bg-muted/50 ${n.read ? "" : "bg-[#491B3A]/[0.04]"
                                            }`}
                                    >
                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#491B3A]/10 text-[#491B3A] dark:bg-white/10 dark:text-white">
                                            {TYPE_ICON[n.type]}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center justify-between gap-2">
                                                <span className={`truncate text-sm ${n.read ? "font-medium" : "font-semibold"}`}>
                                                    {n.title}
                                                </span>
                                                {!n.read && <span className="size-2 shrink-0 rounded-full bg-[#b08d57]" />}
                                            </span>
                                            <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">
                                                {n.message}
                                            </span>
                                            <span className="mt-1 block text-xs text-muted-foreground">{n.time}</span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </ScrollArea>
                )}
            </SheetContent>
        </Sheet>
    )
}