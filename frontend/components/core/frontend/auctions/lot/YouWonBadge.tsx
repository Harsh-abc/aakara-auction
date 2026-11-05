"use client"

import { useEffect, useState } from "react"

import { useAppSelector } from "@/hooks/redux"
import type { PublicLotDetail } from "@/lib/types/publicAuction.types"
import { getMyLotStanding } from "@/services/operations/bidding.api"

// the storefront palette: gold, plum, sale red, ink
const COLOURS = ["#d0a55d", "#e8c88f", "#673364", "#e42a00", "#0d0d0d"]

// fixed layout so server and client render the same pieces
const CONFETTI = Array.from({ length: 18 }, (_, i) => ({
    left: `${(i * 37 + 7) % 100}%`,
    delay: `${((i * 0.43) % 2.6).toFixed(2)}s`,
    duration: `${(2.4 + ((i * 0.31) % 1.4)).toFixed(2)}s`,
    colour: COLOURS[i % COLOURS.length],
    round: i % 3 === 0,
}))

const SPARKLES = [
    { top: "6%", left: "18%", delay: "0s" },
    { top: "14%", left: "78%", delay: "0.5s" },
    { top: "58%", left: "10%", delay: "1s" },
    { top: "62%", left: "86%", delay: "1.5s" },
]

// the signed-in bidder's paddle in this lot's sale
function useMyPaddle(lotUuid: string, status: string) {
    const token = useAppSelector((state) => state.auth.accessToken)
    const [mine, setMine] = useState<{ lotUuid: string; paddle: string | null } | null>(null)

    useEffect(() => {
        if (!token) return
        let cancelled = false
        getMyLotStanding(lotUuid, token)
            .then((data) => {
                if (!cancelled) setMine({ lotUuid, paddle: data.paddleNumber })
            })
            .catch(() => {})
        return () => {
            cancelled = true
        }
    }, [lotUuid, status, token])

    return token && mine?.lotUuid === lotUuid ? mine.paddle : null
}

/** "You've won this lot" with a looping celebration — only for the buyer; everyone else sees the paddle line. */
export function WinnerLine({ lot }: { lot: PublicLotDetail }) {
    const winnerPaddle = lot.status === "SOLD" ? lot.winner?.paddle : null
    const myPaddle = useMyPaddle(lot.uuid, lot.status)

    if (!winnerPaddle) return null

    const isMe = !!myPaddle && String(myPaddle) === String(winnerPaddle)
    if (!isMe) {
        return <p className="text-[20px] leading-7 font-medium text-[#0d0d0d]">Winner : Paddle {winnerPaddle}</p>
    }

    return (
        <div className="relative w-full overflow-hidden border border-[#d0a55d] bg-[#fdedd6] px-4 pt-5 pb-4 text-center" role="status">
            {/* looping confetti */}
            <div aria-hidden className="pointer-events-none absolute inset-0">
                {CONFETTI.map((piece, i) => (
                    <span
                        key={i}
                        className="won-confetti absolute -top-3 block"
                        style={{
                            left: piece.left,
                            width: piece.round ? 6 : 5,
                            height: piece.round ? 6 : 10,
                            borderRadius: piece.round ? "9999px" : "1px",
                            background: piece.colour,
                            animationDelay: piece.delay,
                            animationDuration: piece.duration,
                        }}
                    />
                ))}
                {SPARKLES.map((s, i) => (
                    <span key={i} className="won-sparkle absolute text-[14px] text-[#d0a55d]" style={{ top: s.top, left: s.left, animationDelay: s.delay }}>
                        ✦
                    </span>
                ))}
            </div>

            <div className="relative">
                <div className="won-trophy mx-auto flex size-14 items-center justify-center rounded-full bg-white text-[28px] shadow-sm">🏆</div>
                <p className="mt-3 text-[11px] leading-[13.2px] tracking-[0.16em] text-[#673364] uppercase">Congratulations</p>
                <p className="mt-1 text-[20px] leading-7 font-medium text-[#0d0d0d]">You have won this lot!</p>
                <p className="mt-0.5 text-[13px] leading-5 text-[#717171]">Paddle {winnerPaddle}</p>
            </div>
        </div>
    )
}
