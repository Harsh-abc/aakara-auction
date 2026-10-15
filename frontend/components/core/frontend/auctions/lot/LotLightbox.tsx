"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { createPortal } from "react-dom";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Maximize, Play, X, ZoomIn, ZoomOut } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PublicLotMedia } from "@/lib/types/publicAuction.types";

const pad = (value: number) => String(value).padStart(2, "0");

const MIN_SCALE = 1;
const MAX_SCALE = 5;
// a tap / click zooms straight to this
const TAP_SCALE = 2.5;
const STEP = 1.5;
// pointer movement under this is a tap, over it a drag
const TAP_SLOP = 4;

type View = { scale: number; x: number; y: number };
const FIT: View = { scale: 1, x: 0, y: 0 };

const CONTROL =
    "flex size-10 cursor-pointer items-center justify-center border border-white/25 bg-black/40 text-white transition-colors duration-200 hover:border-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// keep the zoomed image covering its own box — no panning off into empty space
function clampView(view: View, box: DOMRect): View {
    const scale = clamp(view.scale, MIN_SCALE, MAX_SCALE);
    const maxX = (box.width * (scale - 1)) / 2;
    const maxY = (box.height * (scale - 1)) / 2;
    return { scale, x: clamp(view.x, -maxX, maxX), y: clamp(view.y, -maxY, maxY) };
}

// zoom to `scale` keeping the screen point (clientX, clientY) still
function zoomAt(view: View, scale: number, clientX: number, clientY: number, box: DOMRect): View {
    const next = clamp(scale, MIN_SCALE, MAX_SCALE);
    const px = clientX - (box.left + box.width / 2);
    const py = clientY - (box.top + box.height / 2);
    const ratio = next / view.scale;
    return clampView({ scale: next, x: px - (px - view.x) * ratio, y: py - (py - view.y) * ratio }, box);
}

type LotLightboxProps = {
    media: PublicLotMedia[];
    /** the slide to open on */
    startIndex: number;
    /** alt text for images without a caption */
    alt: string;
    onClose: (lastIndex: number) => void;
};

/**
 * Full-screen viewer for a lot's images (Fancybox-style):
 * swipe / drag / arrow keys between images; click or tap, mouse wheel, pinch or the +/− buttons to zoom;
 * drag to pan while zoomed.
 */
export function LotLightbox({ media, startIndex, alt, onClose }: LotLightboxProps) {
    const many = media.length > 1;
    const [emblaRef, emblaApi] = useEmblaCarousel({ startIndex, loop: many, duration: 22 });
    const [index, setIndex] = useState(startIndex);
    // zoom + pan of the slide on screen; every other slide sits at FIT
    const [view, setView] = useState<View>(FIT);
    const boxes = useRef<(HTMLDivElement | null)[]>([]);

    const current = media[index];
    const zoomed = view.scale > 1;
    const close = useCallback(() => onClose(index), [onClose, index]);
    const prev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
    const next = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

    // track the slide; leaving a slide drops its zoom
    useEffect(() => {
        if (!emblaApi) return;
        const onSelect = () => {
            setIndex(emblaApi.selectedScrollSnap());
            setView(FIT);
        };
        emblaApi.on("select", onSelect);
        return () => {
            emblaApi.off("select", onSelect);
        };
    }, [emblaApi]);

    // while zoomed, dragging pans the image instead of changing slides
    useEffect(() => {
        emblaApi?.reInit({ watchDrag: !zoomed && many });
    }, [emblaApi, zoomed, many]);

    // the +/− buttons zoom around the centre of the image
    const zoomBy = useCallback(
        (factor: number) => {
            const box = boxes.current[index]?.getBoundingClientRect();
            if (!box) return;
            setView((v) => zoomAt(v, v.scale * factor, box.left + box.width / 2, box.top + box.height / 2, box));
        },
        [index],
    );

    // keyboard, and no page scroll behind the overlay
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") close();
            else if (event.key === "ArrowLeft" && !zoomed) prev();
            else if (event.key === "ArrowRight" && !zoomed) next();
            else if (event.key === "+" || event.key === "=") zoomBy(STEP);
            else if (event.key === "-") zoomBy(1 / STEP);
            else if (event.key === "0") setView(FIT);
        };
        window.addEventListener("keydown", onKey);
        const overflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = overflow;
        };
    }, [close, prev, next, zoomBy, zoomed]);

    const isImage = current?.mediaType === "IMAGE";

    return createPortal(
        <div role="dialog" aria-modal="true" aria-label="Artwork viewer" className="fixed inset-0 z-100 flex flex-col bg-[#0d0d0d]/95 text-white">
            {/* top bar: counter + caption, zoom controls, close */}
            <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
                <p className="min-w-0 truncate text-[11px] leading-[13.2px] tracking-[0.16em] text-white/70 uppercase">
                    {pad(index + 1)} / {pad(media.length)}
                    {current?.caption && <span className="ml-3 tracking-normal text-white normal-case">{current.caption}</span>}
                </p>
                <div className="flex shrink-0 gap-2">
                    {isImage && (
                        <>
                            <button type="button" className={CONTROL} onClick={() => zoomBy(1 / STEP)} disabled={!zoomed} aria-label="Zoom out">
                                <ZoomOut className="size-4.5" />
                            </button>
                            <button type="button" className={CONTROL} onClick={() => zoomBy(STEP)} disabled={view.scale >= MAX_SCALE} aria-label="Zoom in">
                                <ZoomIn className="size-4.5" />
                            </button>
                            <button type="button" className={CONTROL} onClick={() => setView(FIT)} disabled={!zoomed} aria-label="Fit to screen">
                                <Maximize className="size-4" />
                            </button>
                        </>
                    )}
                    <button type="button" className={CONTROL} onClick={close} aria-label="Close viewer">
                        <X className="size-4.5" />
                    </button>
                </div>
            </div>

            {/* slides */}
            <div className="relative min-h-0 flex-1">
                <div ref={emblaRef} className="h-full overflow-hidden">
                    <div className="flex h-full touch-pan-y">
                        {media.map((item, i) => (
                            <div key={item.url} className="flex h-full min-w-0 flex-[0_0_100%] items-center justify-center px-4 sm:px-20">
                                {item.mediaType === "VIDEO" ? (
                                    <video src={item.url} controls playsInline className="max-h-full max-w-full bg-black" />
                                ) : (
                                    <ZoomableImage
                                        boxRef={(node) => {
                                            boxes.current[i] = node;
                                        }}
                                        src={item.url}
                                        alt={item.caption ?? alt}
                                        view={i === index ? view : FIT}
                                        onView={setView}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {many && !zoomed && (
                    <>
                        <button type="button" className={cn(CONTROL, "absolute top-1/2 left-3 -translate-y-1/2 sm:left-6 sm:size-12")} onClick={prev} aria-label="Previous image">
                            <ChevronLeft className="size-5" />
                        </button>
                        <button type="button" className={cn(CONTROL, "absolute top-1/2 right-3 -translate-y-1/2 sm:right-6 sm:size-12")} onClick={next} aria-label="Next image">
                            <ChevronRight className="size-5" />
                        </button>
                    </>
                )}
            </div>

            {/* thumbnails */}
            {many && (
                <div className="flex justify-center gap-2 overflow-x-auto px-4 py-4">
                    {media.map((item, i) => (
                        <button
                            key={item.url}
                            type="button"
                            onClick={() => emblaApi?.scrollTo(i)}
                            aria-label={`Show image ${i + 1}`}
                            aria-current={i === index}
                            className={cn("size-14 shrink-0 cursor-pointer border p-0.5 transition-opacity", i === index ? "border-white opacity-100" : "border-transparent opacity-50 hover:opacity-100")}
                        >
                            <span className="flex size-full items-center justify-center overflow-hidden bg-white/10">
                                {item.mediaType === "VIDEO" ? (
                                    <Play className="size-4 text-white/70" />
                                ) : (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={item.thumbnailUrl ?? item.url} alt="" className="size-full object-cover" loading="lazy" />
                                )}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>,
        document.body,
    );
}

type ZoomableImageProps = {
    boxRef: (node: HTMLDivElement | null) => void;
    src: string;
    alt: string;
    view: View;
    onView: (update: (view: View) => View) => void;
};

// tap / click toggles zoom at that point, wheel and pinch zoom smoothly, drag pans while zoomed
function ZoomableImage({ boxRef, src, alt, view, onView }: ZoomableImageProps) {
    const box = useRef<HTMLDivElement | null>(null);
    // live pointers, and where this gesture started
    const pointers = useRef(new Map<number, { x: number; y: number }>());
    const gesture = useRef<{ startX: number; startY: number; moved: boolean; pinchDistance: number; pinchScale: number } | null>(null);
    const [dragging, setDragging] = useState(false);

    const rect = () => box.current?.getBoundingClientRect() ?? null;
    const zoomed = view.scale > 1;

    const pinchInfo = () => {
        const [a, b] = [...pointers.current.values()];
        return { distance: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
    };

    const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.current.size === 1) {
            gesture.current = { startX: event.clientX, startY: event.clientY, moved: false, pinchDistance: 0, pinchScale: view.scale };
        } else if (pointers.current.size === 2 && gesture.current) {
            gesture.current.moved = true;
            gesture.current.pinchDistance = pinchInfo().distance;
            gesture.current.pinchScale = view.scale;
        }
        // panning / pinching belongs to the image, not the slider
        if (zoomed || pointers.current.size === 2) {
            event.currentTarget.setPointerCapture(event.pointerId);
            event.stopPropagation();
            setDragging(true);
        }
    };

    const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        const last = pointers.current.get(event.pointerId);
        const g = gesture.current;
        if (!last || !g) return;
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (Math.hypot(event.clientX - g.startX, event.clientY - g.startY) > TAP_SLOP) g.moved = true;

        const r = rect();
        if (!r) return;

        if (pointers.current.size === 2 && g.pinchDistance > 0) {
            const { distance, cx, cy } = pinchInfo();
            onView((v) => zoomAt(v, (g.pinchScale * distance) / g.pinchDistance, cx, cy, r));
            event.stopPropagation();
        } else if (zoomed) {
            const dx = event.clientX - last.x;
            const dy = event.clientY - last.y;
            onView((v) => clampView({ ...v, x: v.x + dx, y: v.y + dy }, r));
            event.stopPropagation();
        }
    };

    const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
        const g = gesture.current;
        const wasTap = pointers.current.size === 1 && g && !g.moved;
        pointers.current.delete(event.pointerId);
        if (pointers.current.size === 0) {
            gesture.current = null;
            setDragging(false);
        }
        if (!wasTap) return;

        // read the point now — the event is gone by the time a state updater runs
        const r = rect();
        const { clientX, clientY } = event;
        if (r) onView((v) => (v.scale > 1 ? FIT : zoomAt(v, TAP_SCALE, clientX, clientY, r)));
    };

    const onWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
        const r = rect();
        if (!r) return;
        const { clientX, clientY, deltaY } = event;
        onView((v) => zoomAt(v, v.scale * Math.exp(-deltaY * 0.0015), clientX, clientY, r));
    };

    return (
        <div
            ref={(node) => {
                box.current = node;
                boxRef(node);
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
            className={cn("relative flex max-h-full max-w-full touch-none items-center justify-center select-none", zoomed ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in")}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={src}
                alt={alt}
                draggable={false}
                className={cn("max-h-[calc(100dvh-180px)] max-w-full object-contain will-change-transform", !dragging && "transition-transform duration-200 ease-out")}
                style={{ transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})` }}
            />
        </div>
    );
}
