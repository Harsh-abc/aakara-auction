"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { useAppSelector } from "@/hooks/redux"
import { getSocket, setSocketToken } from "@/lib/socket"
import type { LotWonNotice } from "@/lib/types/bidding.types"
import { cn } from "@/lib/utils"

import { BUTTON, BUTTON_OUTLINE, BUTTON_SOLID, EYEBROW } from "../../storefront"
import { formatMoney, lotHref } from "../detail/lotDisplay"

// the storefront palette: gold, plum, sale red, ink, cream
const COLOURS = ["#d0a55d", "#e8c88f", "#673364", "#e42a00", "#0d0d0d", "#fdedd6"]
// a fresh pair of bursts this often, for as long as the popup is open
const BURST_EVERY_MS = 2200

type Piece = { x: number; y: number; vx: number; vy: number; size: number; spin: number; angle: number; colour: string; round: boolean }

// bursts from the lower corners on a loop, each with a slow fall — drawn on one canvas, stops when unmounted
function Confetti() {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext("2d")
        if (!canvas || !ctx) return
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

        const dpr = window.devicePixelRatio || 1
        let w = window.innerWidth
        let h = window.innerHeight
        const resize = () => {
            w = window.innerWidth
            h = window.innerHeight
            canvas.width = w * dpr
            canvas.height = h * dpr
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        }
        resize()
        window.addEventListener("resize", resize)

        const burst = (fromLeft: boolean): Piece[] =>
            Array.from({ length: 70 }, () => {
                const angle = (fromLeft ? -60 : -120) * (Math.PI / 180) + (Math.random() - 0.5) * 0.9
                const speed = 9 + Math.random() * 9
                return {
                    x: fromLeft ? 0 : w,
                    y: h * 0.85,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 6 + Math.random() * 6,
                    spin: (Math.random() - 0.5) * 0.3,
                    angle: Math.random() * Math.PI,
                    colour: COLOURS[Math.floor(Math.random() * COLOURS.length)],
                    round: Math.random() < 0.3,
                }
            })
        let pieces = [...burst(true), ...burst(false)]

        let lastBurst = performance.now()
        let frame = 0
        const draw = (now: number) => {
            // keep firing from both corners until the popup closes (unmount)
            if (now - lastBurst >= BURST_EVERY_MS) {
                lastBurst = now
                pieces.push(...burst(true), ...burst(false))
            }
            // drop pieces that have fallen off screen
            pieces = pieces.filter((p) => p.y < h + 40)

            ctx.clearRect(0, 0, w, h)
            for (const p of pieces) {
                p.vy += 0.25
                p.vx *= 0.985
                p.vy *= 0.985
                p.x += p.vx
                p.y += p.vy
                p.angle += p.spin
                ctx.save()
                ctx.translate(p.x, p.y)
                ctx.rotate(p.angle)
                ctx.fillStyle = p.colour
                if (p.round) {
                    ctx.beginPath()
                    ctx.arc(0, 0, p.size / 2.5, 0, Math.PI * 2)
                    ctx.fill()
                } else {
                    // a flat strip that "flips" as it turns
                    ctx.fillRect(-p.size / 2, -p.size / 4, p.size, (p.size / 2) * Math.abs(Math.cos(p.angle * 2)) + 1)
                }
                ctx.restore()
            }
            frame = requestAnimationFrame(draw)
        }
        frame = requestAnimationFrame(draw)

        return () => {
            cancelAnimationFrame(frame)
            window.removeEventListener("resize", resize)
        }
    }, [])

    return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-[60] size-full" />
}

/**
 * "Congratulations, you've won" — shown only to the buyer, the moment their lot is sold.
 * The server sends "lot:won" to the buyer's own room, so it reaches every tab they're signed
 * in on, whichever storefront page is open. Mounted once in the storefront layout.
 */
export function WinnerCelebration() {
    const token = useAppSelector((state) => state.auth.accessToken)
    // wins waiting to be shown — two lots can sell back to back
    const [queue, setQueue] = useState<LotWonNotice[]>([])

    useEffect(() => {
        // guests can't win; don't open a socket just for them
        if (!token) return
        setSocketToken(token)
        const socket = getSocket()
        const onWon = (notice: LotWonNotice) =>
            setQueue((prev) => (prev.some((known) => known.lotUuid === notice.lotUuid) ? prev : [...prev, notice]))
        socket.on("lot:won", onWon)
        return () => {
            socket.off("lot:won", onWon)
        }
    }, [token])

    const win = queue[0]
    if (!win) return null

    const close = () => setQueue((prev) => prev.slice(1))
    const price = formatMoney(win.hammerPrice, win.currency)
    const lotLabel = `Lot ${win.itemNumber.padStart(2, "0")}`

    return (
        <>
            {/* keyed so the next win in the queue gets its own burst */}
            <Confetti key={win.lotUuid} />
            <Dialog open onOpenChange={(open) => !open && close()}>
                <DialogContent
                    key={win.lotUuid}
                    className="gap-0 rounded-none bg-white p-0 ring-[#d0a55d] sm:max-w-md data-open:zoom-in-90 data-open:duration-300"
                >
                    <div className="border-b border-[#d0a55d] bg-[#fdedd6] px-6 pt-8 pb-6 text-center">
                        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-white text-[32px] shadow-sm">
                            🏆
                        </div>
                        <p className={cn(EYEBROW, "text-[#673364]")}>{win.auctionTitle ?? "Live auction"}</p>
                        <DialogTitle className="mt-2 text-[28px] leading-9 font-medium tracking-tight text-[#0d0d0d]">
                            Congratulations!
                        </DialogTitle>
                        <DialogDescription className="mt-1 text-[15px] leading-6 text-[#0d0d0d]">
                            You&apos;ve won {lotLabel}.
                        </DialogDescription>
                    </div>

                    <div className="px-6 py-5 text-center">
                        {win.artistName && <p className="text-[18px] leading-7 font-medium text-[#0d0d0d]">{win.artistName}</p>}
                        <p className="text-[14px] leading-5 text-[#717171]">{win.title}</p>
                        {price && (
                            <>
                                <p className={cn(EYEBROW, "mt-5")}>Hammer price</p>
                                <p className="mt-1 text-[30px] leading-9 font-medium text-[#0d0d0d]">{price}</p>
                            </>
                        )}
                        <p className="mt-4 text-[13px] leading-5 text-[#717171]">
                            A confirmation with the next steps is on its way to your email.
                        </p>

                        <div className="mt-6 grid gap-3">
                            <button type="button" onClick={close} className={cn(BUTTON, BUTTON_SOLID)}>
                                Continue
                            </button>
                            <Link href={lotHref(win.auctionUuid, { uuid: win.lotUuid })} onClick={close} className={cn(BUTTON, BUTTON_OUTLINE)}>
                                View lot
                            </Link>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
