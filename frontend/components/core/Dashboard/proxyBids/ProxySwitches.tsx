"use client"

import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { Loader2 } from "lucide-react"

import { Switch } from "@/components/ui/switch"
import { getErrorMessage } from "@/lib/apiError"
import { AUCTION_STATUS_LABELS } from "@/lib/constants/auctionStatus"
import type { ProxySettingsAuction } from "@/lib/types/proxyBid.types"
import { getProxySettings, setProxyBidding } from "@/services/operations/proxyBid.api"

import { DASHBOARD_TIME_ZONE, PanelMessage, StatusPill } from "../home/dashboardUi"

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: DASHBOARD_TIME_ZONE })

/**
 * Per-auction on / off switch for proxy bids. Off stops bidders leaving or
 * changing proxies; lots that have opened never take them either way.
 * `canEdit`: super admin / admin / operations — auctioneers only see it.
 */
export function ProxySwitches({ token, canEdit }: { token: string | null; canEdit: boolean }) {
    const [auctions, setAuctions] = useState<ProxySettingsAuction[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState<string | null>(null)

    useEffect(() => {
        if (!token) return
        let cancelled = false
        getProxySettings(token)
            .then((data) => {
                if (!cancelled) setAuctions(data)
            })
            .catch((err) => {
                if (!cancelled) setError(getErrorMessage(err))
            })
        return () => {
            cancelled = true
        }
    }, [token])

    const toggle = async (auction: ProxySettingsAuction, enabled: boolean) => {
        setSaving(auction.uuid)
        try {
            const { message } = await setProxyBidding(auction.uuid, enabled, token)
            setAuctions((prev) => prev?.map((a) => (a.uuid === auction.uuid ? { ...a, proxyBiddingEnabled: enabled } : a)) ?? null)
            toast.success(message)
        } catch (err) {
            toast.error(getErrorMessage(err))
        } finally {
            setSaving(null)
        }
    }

    return (
        <section className="rounded-xl bg-[#F6F6F7] p-4 md:p-5">
            <div className="mb-3">
                <h2 className="text-[15px] font-semibold text-slate-900">Proxy bidding by auction</h2>
                <p className="text-[12px] text-[#62666F]">
                    When on, verified bidders can leave a proxy bid on any lot that hasn&apos;t opened yet. Once a lot is live it never takes proxy
                    bids. Turning it off stops new and changed proxies; ones already left still bid when their lot opens.
                </p>
            </div>

            {!auctions ? (
                <PanelMessage>
                    {error ?? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading auctions…
                        </>
                    )}
                </PanelMessage>
            ) : auctions.length === 0 ? (
                <PanelMessage>No upcoming or running auctions.</PanelMessage>
            ) : (
                <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
                    {auctions.map((auction) => {
                        const id = `proxy-switch-${auction.uuid}`
                        return (
                            <div key={auction.uuid} className="flex items-center gap-4 px-4 py-3">
                                <div className="min-w-0 flex-1">
                                    <label htmlFor={id} className="block truncate text-[13px] font-semibold text-slate-900">
                                        {auction.title}
                                    </label>
                                    <p className="text-[11px] text-[#8A8D94]">
                                        {AUCTION_STATUS_LABELS[auction.status] ?? auction.status} · starts {dateFmt.format(new Date(auction.startTime))} ·{" "}
                                        {auction.upcomingLots} lot{auction.upcomingLots === 1 ? "" : "s"} not yet open
                                    </p>
                                </div>
                                <StatusPill tone={auction.proxyBiddingEnabled ? "green" : "slate"}>
                                    {auction.proxyBiddingEnabled ? "On" : "Off"}
                                </StatusPill>
                                {saving === auction.uuid ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                ) : (
                                    <Switch
                                        id={id}
                                        checked={auction.proxyBiddingEnabled}
                                        disabled={!canEdit || saving !== null}
                                        onCheckedChange={(checked) => toggle(auction, checked)}
                                        aria-label={`Proxy bidding for ${auction.title}`}
                                        className="data-checked:bg-[#7B2D52]"
                                    />
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
            {!canEdit && <p className="mt-2 text-[11px] text-[#8A8D94]">Only super admins, admins and operations can change these.</p>}
        </section>
    )
}
