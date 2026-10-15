"use client"

import { useState, type PointerEvent } from "react"

// how much the side view magnifies the image
const ZOOM = 2.5
// the side view covers the price panel: LOT_GRID's 40px gap, then its 400px column
const PANE_GAP = 40
const PANE_WIDTH = 400

type Rect = { left: number; top: number; width: number; height: number }
type Zoom = { content: Rect; lens: Rect; height: number }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

// where an object-contain image actually draws inside its box
function contentRect(img: HTMLImageElement, box: DOMRect): Rect {
    const ratio = img.naturalWidth / img.naturalHeight
    if (!ratio) return { left: 0, top: 0, width: box.width, height: box.height }
    const width = Math.min(box.width, box.height * ratio)
    const height = width / ratio
    return { left: (box.width - width) / 2, top: (box.height - height) / 2, width, height }
}

type LotImageZoomProps = {
    src: string
    alt: string
    onOpen: () => void
}

/**
 * The main artwork, magnified on hover (Flipkart / Myntra style): a lens follows the mouse and the area
 * under it is shown enlarged beside the image. Click opens the full-screen viewer. Desktop mouse only.
 */
export function LotImageZoom({ src, alt, onOpen }: LotImageZoomProps) {
    const [zoom, setZoom] = useState<Zoom | null>(null)

    function onMove(event: PointerEvent<HTMLImageElement>) {
        // touch and pen keep tap-to-open; the side view only fits beside the image on wide screens
        if (event.pointerType !== "mouse" || !window.matchMedia("(min-width: 64rem)").matches) return
        const box = event.currentTarget.getBoundingClientRect()
        const content = contentRect(event.currentTarget, box)
        const x = event.clientX - box.left
        const y = event.clientY - box.top
        if (x < content.left || x > content.left + content.width || y < content.top || y > content.top + content.height) {
            setZoom(null)
            return
        }
        // the lens is the side view's shape, scaled down, and stays on the painting
        const width = Math.min(content.width, PANE_WIDTH / ZOOM)
        const height = Math.min(content.height, box.height / ZOOM)
        const lens = {
            left: clamp(x - width / 2, content.left, content.left + content.width - width),
            top: clamp(y - height / 2, content.top, content.top + content.height - height),
            width,
            height,
        }
        setZoom({ content, lens, height: box.height })
    }

    return (
        <>
            <button type="button" onClick={onOpen} aria-label="Open artwork viewer" className="relative size-full cursor-zoom-in">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={alt} onPointerMove={onMove} onPointerLeave={() => setZoom(null)} className="size-full object-contain" />
                {zoom && (
                    <span
                        aria-hidden
                        className="pointer-events-none absolute border border-[#0d0d0d]/30 bg-white/35"
                        style={{ left: zoom.lens.left, top: zoom.lens.top, width: zoom.lens.width, height: zoom.lens.height }}
                    />
                )}
            </button>

            {zoom && (
                <div
                    aria-hidden
                    className="pointer-events-none absolute top-0 z-30 border border-[#cecece] bg-white bg-no-repeat shadow-[0_16px_40px_-20px_rgba(0,0,0,0.35)]"
                    style={{
                        left: `calc(100% + ${PANE_GAP}px)`,
                        width: PANE_WIDTH,
                        height: zoom.height,
                        backgroundImage: `url("${src}")`,
                        backgroundSize: `${zoom.content.width * ZOOM}px ${zoom.content.height * ZOOM}px`,
                        backgroundPosition: `${-(zoom.lens.left - zoom.content.left) * ZOOM}px ${-(zoom.lens.top - zoom.content.top) * ZOOM}px`,
                    }}
                />
            )}
        </>
    )
}
