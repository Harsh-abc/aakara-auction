"use client"

import { useState } from "react"
import { CheckIcon, CopyIcon, ExternalLinkIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type StudioShareProps = {
    auctionUuid: string
    /** the lot on the block — its page carries the player */
    liveLotUuid?: string | null
}

export function StudioShare({ auctionUuid, liveLotUuid }: StudioShareProps) {
    // the studio only renders in the browser
    const origin = typeof window === "undefined" ? "" : window.location.origin
    const [copied, setCopied] = useState<string | null>(null)

    const page = liveLotUuid ? `${origin}/auctions/${auctionUuid}/lots/${liveLotUuid}` : `${origin}/auctions/${auctionUuid}`
    const embed = `${origin}/embed/${auctionUuid}`
    const iframe = `<iframe src="${embed}" allow="autoplay; fullscreen; picture-in-picture" style="width:100%;aspect-ratio:16/9;border:0" allowfullscreen></iframe>`

    const copy = (text: string, key: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(key)
            setTimeout(() => setCopied(null), 1500)
        })
    }

    const links: [string, string, string][] = [
        [liveLotUuid ? "Live lot page" : "Auction page", page, "page"],
        ["Player only (embed)", embed, "embed"],
    ]

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
            <h3 className="text-sm font-semibold text-slate-900">Share the stream</h3>

            {links.map(([label, url, key]) => (
                <div key={key} className="space-y-1.5">
                    <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
                    <div className="flex gap-2">
                        <Input readOnly value={url} className="border-slate-200 bg-slate-50 text-xs shadow-none" onFocus={(event) => event.target.select()} />
                        <Button size="icon" variant="outline" className="shrink-0 border-slate-200" onClick={() => copy(url, key)} aria-label={`Copy ${label}`}>
                            {copied === key ? <CheckIcon className="text-emerald-600" /> : <CopyIcon />}
                        </Button>
                    </div>
                    <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-[#7A3D5E] hover:underline">
                        Open <ExternalLinkIcon className="size-3" />
                    </a>
                </div>
            ))}

            <div className="space-y-1.5">
                <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Iframe code</p>
                <Textarea readOnly rows={4} value={iframe} className="resize-none border-slate-200 bg-slate-50 font-mono text-[11px] shadow-none" />
                <Button variant="outline" className="w-full border-slate-200" onClick={() => copy(iframe, "iframe")}>
                    {copied === "iframe" ? <CheckIcon className="text-emerald-600" /> : <CopyIcon />}
                    {copied === "iframe" ? "Copied" : "Copy iframe code"}
                </Button>
            </div>
        </div>
    )
}
