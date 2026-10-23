"use client"

import { useEffect, useRef, useState } from "react"
import toast from "react-hot-toast"
import {
    ArrowDownIcon,
    ArrowUpIcon,
    EyeOffIcon,
    ImagePlusIcon,
    ImagesIcon,
    ImageUpIcon,
    LaptopIcon,
    Loader2Icon,
    PlusIcon,
    RefreshCwIcon,
    SmartphoneIcon,
    TabletIcon,
    Trash2Icon,
    XIcon,
    type LucideIcon,
} from "lucide-react"

import { bannerVariant, HomeBannerHero } from "@/components/core/frontend/auctions/HomeBannerSlides"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useAppSelector } from "@/hooks/redux"
import { getErrorMessage } from "@/lib/apiError"
import type { BannerDevice, HomeBanner, HomeBannerChanges, ImageSize } from "@/lib/types/website.types"
import { cn } from "@/lib/utils"
import {
    deleteHomeBanner,
    getAllHomeBanners,
    removeHomeBannerImage,
    reorderHomeBanners,
    setHomeBannerImage,
    updateHomeBanner,
    uploadHomeBanner,
    type NewBannerImage,
} from "@/services/operations/website.api"

// match backend/src/services/website.services.js and the upload middleware
const MAX_BANNERS = 10
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const MAX_SIZE = 10 * 1024 * 1024

type DeviceInfo = {
    device: BannerDevice
    label: string
    icon: LucideIcon
    screens: string
    recommended: string
    // narrower images look soft on these screens
    minWidth: number
    previewWidth: string
}

const DEVICES: DeviceInfo[] = [
    { device: "desktop", label: "Laptop", icon: LaptopIcon, screens: "1024px and wider", recommended: "2400 × 900", minWidth: 1600, previewWidth: "max-w-full" },
    { device: "tablet", label: "Tablet", icon: TabletIcon, screens: "768 – 1023px", recommended: "2048 × 1152", minWidth: 1200, previewWidth: "max-w-[520px]" },
    { device: "mobile", label: "Mobile", icon: SmartphoneIcon, screens: "under 768px", recommended: "1080 × 1350", minWidth: 750, previewWidth: "max-w-[300px]" },
]
const deviceInfo = (device: BannerDevice) => DEVICES.find((d) => d.device === device)!

// the columns holding each device's image
const IMAGE_FIELDS = {
    desktop: { url: "imageUrl", width: "imageWidth", height: "imageHeight" },
    tablet: { url: "tabletImageUrl", width: "tabletImageWidth", height: "tabletImageHeight" },
    mobile: { url: "mobileImageUrl", width: "mobileImageWidth", height: "mobileImageHeight" },
} as const

type SlotImage = { url: string; width: number | null; height: number | null }

const ownImage = (banner: HomeBanner, device: BannerDevice): SlotImage | null => {
    const fields = IMAGE_FIELDS[device]
    const url = banner[fields.url]
    return url ? { url, width: banner[fields.width], height: banner[fields.height] } : null
}

// what an empty slot shows instead — same fallbacks as bannerVariant on the storefront
const fallbackText = (device: BannerDevice, hasTablet: boolean) =>
    device === "desktop"
        ? "Required — also used for empty tablet / mobile"
        : device === "tablet"
            ? "Uses the laptop image"
            : `Uses the ${hasTablet ? "tablet" : "laptop"} image, cropped to 4:3`

// a page on this site ("/auctions/…") or a full http(s) URL — same rule as the API
const isValidLink = (value: string) => !value || /^\/(?!\/)/.test(value) || /^https?:\/\/\S+$/i.test(value)

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)

// 2400 × 900 → "8:3"; awkward sizes → "2.67:1"
const ratioLabel = (width: number, height: number) => {
    const d = gcd(width, height)
    const [w, h] = [width / d, height / d]
    return w <= 32 && h <= 32 ? `${w}:${h}` : `${(width / height).toFixed(2)}:1`
}

const checkImage = (file: File) => {
    if (!IMAGE_TYPES.includes(file.type)) {
        toast.error(`${file.name}: use a JPG, PNG, WEBP or GIF image`)
        return false
    }
    if (file.size > MAX_SIZE) {
        toast.error(`${file.name}: images must be 10 MB or smaller`)
        return false
    }
    return true
}

// the browser measures the image; the hero takes its shape on the storefront
const readSize = (file: File) =>
    new Promise<ImageSize | null>((resolve) => {
        const url = URL.createObjectURL(file)
        const img = new window.Image()
        img.onload = () => {
            resolve(img.naturalWidth && img.naturalHeight ? { width: img.naturalWidth, height: img.naturalHeight } : null)
            URL.revokeObjectURL(url)
        }
        img.onerror = () => {
            resolve(null)
            URL.revokeObjectURL(url)
        }
        img.src = url
    })

const warnIfSmall = (file: File, size: ImageSize | null, device: BannerDevice) => {
    const { label, minWidth, recommended } = deviceInfo(device)
    if (size && size.width < minWidth) {
        toast(`${file.name} is only ${size.width}px wide and may look soft on ${label.toLowerCase()} screens. ${recommended} px works best.`, {
            icon: "⚠️",
        })
    }
}

type PendingConfirm =
    | { kind: "banner"; banner: HomeBanner }
    | { kind: "image"; banner: HomeBanner; device: Exclude<BannerDevice, "desktop"> }

export function WebsiteSettings() {
    const token = useAppSelector((state) => state.auth.accessToken)

    const [banners, setBanners] = useState<HomeBanner[]>([])
    const [loading, setLoading] = useState(true)
    const [reordering, setReordering] = useState(false)
    const [busySlots, setBusySlots] = useState<Record<string, boolean>>({})
    const [device, setDevice] = useState<BannerDevice>("desktop")
    const [pending, setPending] = useState<PendingConfirm | null>(null)
    const [confirming, setConfirming] = useState(false)

    useEffect(() => {
        if (!token) return
        getAllHomeBanners(token)
            .then(setBanners)
            .catch((err) => toast.error(getErrorMessage(err)))
            .finally(() => setLoading(false))
    }, [token])

    const visible = banners.filter((b) => b.isActive)
    const slotsLeft = MAX_BANNERS - banners.length
    // the preview isn't a way off the dashboard
    const previewBanners = visible.map((b) => ({ ...b, linkUrl: null }))
    // the storefront hero takes the first showing banner's shape; the others are cropped to it
    const heroBanner = visible[0]

    const replace = (banner: HomeBanner) => setBanners((list) => list.map((b) => (b.uuid === banner.uuid ? banner : b)))
    const setSlotBusy = (key: string, busy: boolean) => setBusySlots((slots) => ({ ...slots, [key]: busy }))

    // ── a new banner, with its laptop / tablet / mobile images in one upload ──
    const createBanner = async (input: Parameters<typeof uploadHomeBanner>[1]) => {
        try {
            const banner = await uploadHomeBanner(token, input)
            setBanners((list) => [...list, banner])
            toast.success("Banner added")
            return true
        } catch (err) {
            toast.error(getErrorMessage(err))
            return false
        }
    }

    // ── one device's image on a banner ──
    const setDeviceImage = async (banner: HomeBanner, target: BannerDevice, file: File) => {
        if (!checkImage(file)) return
        const key = `${banner.uuid}:${target}`
        setSlotBusy(key, true)
        const size = await readSize(file)
        warnIfSmall(file, size, target)
        try {
            replace(await setHomeBannerImage(token, banner.uuid, target, file, size))
            toast.success(`${deviceInfo(target).label} image saved`)
        } catch (err) {
            toast.error(getErrorMessage(err))
        } finally {
            setSlotBusy(key, false)
        }
    }

    // ── edit / show-hide / reorder ──
    const saveBanner = async (banner: HomeBanner, changes: HomeBannerChanges) => {
        try {
            replace(await updateHomeBanner(token, banner.uuid, changes))
            toast.success("Banner saved")
            return true
        } catch (err) {
            toast.error(getErrorMessage(err))
            return false
        }
    }

    const toggleBanner = async (banner: HomeBanner, isActive: boolean) => {
        replace({ ...banner, isActive })
        try {
            replace(await updateHomeBanner(token, banner.uuid, { isActive }))
            toast.success(isActive ? "Banner is now showing on the homepage" : "Banner hidden from the homepage")
        } catch (err) {
            replace(banner)
            toast.error(getErrorMessage(err))
        }
    }

    const moveBanner = async (index: number, delta: -1 | 1) => {
        const target = index + delta
        if (target < 0 || target >= banners.length || reordering) return

        const previous = banners
        const next = [...banners]
        ;[next[index], next[target]] = [next[target], next[index]]
        setBanners(next)
        setReordering(true)
        try {
            setBanners(await reorderHomeBanners(token, next.map((b) => b.uuid)))
        } catch (err) {
            setBanners(previous)
            toast.error(getErrorMessage(err))
        } finally {
            setReordering(false)
        }
    }

    // ── deletes (banner, or a tablet / mobile image) ──
    const confirmPending = async () => {
        if (!pending) return
        setConfirming(true)
        try {
            if (pending.kind === "banner") {
                await deleteHomeBanner(token, pending.banner.uuid)
                setBanners((list) => list.filter((b) => b.uuid !== pending.banner.uuid))
                toast.success("Banner deleted")
            } else {
                replace(await removeHomeBannerImage(token, pending.banner.uuid, pending.device))
                toast.success(`${deviceInfo(pending.device).label} image removed`)
            }
            setPending(null)
        } catch (err) {
            toast.error(getErrorMessage(err))
        } finally {
            setConfirming(false)
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
                <Loader2Icon className="mr-2 size-4 animate-spin" /> Loading website settings…
            </div>
        )
    }

    const previewInfo = deviceInfo(device)
    const pendingImage = pending?.kind === "image" ? ownImage(pending.banner, pending.device) : null

    return (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
            <div className="min-w-0 space-y-6">
                {/* ───────── LIVE PREVIEW ───────── */}
                <section className="rounded-2xl border bg-card shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4 px-6 pt-6">
                        <div>
                            <h2 className="text-lg font-semibold">Homepage hero</h2>
                            <p className="text-sm text-muted-foreground">
                                What visitors see when no auction is live or scheduled.
                            </p>
                        </div>
                        <div className="flex rounded-lg bg-muted p-1" role="radiogroup" aria-label="Preview screen size">
                            {DEVICES.map(({ device: value, label, icon: Icon }) => (
                                <button
                                    key={value}
                                    type="button"
                                    role="radio"
                                    aria-checked={device === value}
                                    onClick={() => setDevice(value)}
                                    className={cn(
                                        "flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                                        device === value
                                            ? "bg-background text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <Icon className="size-3.5" />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="flex justify-center rounded-xl bg-muted/50 p-4 sm:p-6">
                            <div
                                className={cn(
                                    "w-full overflow-hidden border border-[#cecece] bg-white shadow-sm transition-[max-width] duration-300",
                                    previewInfo.previewWidth
                                )}
                            >
                                <HomeBannerHero key={device} banners={previewBanners} device={device} />
                                {/* a sketch of the storefront card's body (FeaturedAuction) */}
                                <div className="flex flex-col gap-3 p-4 text-left sm:flex-row sm:items-end sm:justify-between">
                                    <div className="min-w-0">
                                        <span className="inline-flex items-center gap-1.5 bg-black px-2 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-white">
                                            <span className="size-1 rounded-full bg-[#d0a55d]" /> Coming soon
                                        </span>
                                        <p className="mt-2 text-xl font-medium tracking-tight text-[#0d0d0d]">New sales coming soon</p>
                                    </div>
                                    {device === "desktop" && (
                                        <span className="shrink-0 bg-black px-3 py-2 text-[9px] uppercase tracking-[0.12em] text-white">
                                            Browse all auctions
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <p className="mt-3 text-center text-xs text-muted-foreground">
                            {previewInfo.label} · screens {previewInfo.screens}.{" "}
                            {visible.length === 0
                                ? "No banners showing — the built-in Aakara banner is used."
                                : visible.length === 1
                                    ? "1 banner is showing."
                                    : `${visible.length} banners rotate every 6 seconds, in the order below.`}
                        </p>
                    </div>
                </section>

                {/* ───────── BANNERS ───────── */}
                <section className="rounded-2xl border bg-card shadow-sm">
                    <div className="flex flex-wrap items-end justify-between gap-3 px-6 pt-6">
                        <div>
                            <h2 className="text-lg font-semibold">Banners</h2>
                            <p className="text-sm text-muted-foreground">
                                Each banner has a laptop image and, optionally, its own tablet and mobile versions.
                            </p>
                        </div>
                        <span className="font-mono text-xs text-muted-foreground">
                            {banners.length}/{MAX_BANNERS} used
                        </span>
                    </div>

                    <div className="space-y-4 p-6">
                        {/* NEW BANNER — laptop, tablet and mobile images, uploaded together */}
                        {slotsLeft > 0 ? (
                            <NewBannerForm onCreate={createBanner} />
                        ) : (
                            <div className="flex flex-col items-center rounded-xl border-2 border-dashed px-6 py-8 text-center opacity-60">
                                <ImageUpIcon className="size-5 text-muted-foreground" />
                                <p className="mt-3 text-sm font-medium">All {MAX_BANNERS} banners are in use</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">Delete a banner to add a new one</p>
                            </div>
                        )}

                        {/* LIST */}
                        {banners.length === 0 ? (
                            <div className="flex flex-col items-center rounded-xl bg-muted/40 px-6 py-10 text-center">
                                <ImagesIcon className="size-8 text-muted-foreground/60" />
                                <p className="mt-3 text-sm font-medium">No banners yet</p>
                                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                                    Until you add one, the homepage shows the built-in Aakara banner.
                                </p>
                            </div>
                        ) : (
                            <ol className="space-y-3">
                                {banners.map((banner, index) => (
                                    <BannerRow
                                        key={banner.uuid}
                                        banner={banner}
                                        position={index + 1}
                                        isFirst={index === 0}
                                        isLast={index === banners.length - 1}
                                        heroBanner={heroBanner}
                                        reordering={reordering}
                                        busySlots={busySlots}
                                        onMove={(delta) => moveBanner(index, delta)}
                                        onToggle={(isActive) => toggleBanner(banner, isActive)}
                                        onSave={(changes) => saveBanner(banner, changes)}
                                        onSetImage={(target, file) => setDeviceImage(banner, target, file)}
                                        onRemoveImage={(target) => setPending({ kind: "image", banner, device: target })}
                                        onDelete={() => setPending({ kind: "banner", banner })}
                                    />
                                ))}
                            </ol>
                        )}
                    </div>
                </section>
            </div>

            {/* ───────── GUIDELINES ───────── */}
            <aside className="space-y-4 lg:sticky lg:top-6">
                <div className="grid grid-cols-3 divide-x rounded-2xl border bg-card text-center shadow-sm">
                    <Stat label="Showing" value={visible.length} />
                    <Stat label="Hidden" value={banners.length - visible.length} />
                    <Stat label="Slots left" value={slotsLeft} />
                </div>

                <div className="rounded-2xl border bg-card p-5 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">Image sizes</p>
                    <ul className="mt-3 space-y-3">
                        {DEVICES.map(({ device: value, label, icon: Icon, screens, recommended }) => (
                            <li key={value} className="flex items-start gap-3">
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                    <Icon className="size-4" />
                                </span>
                                <div className="min-w-0 text-sm">
                                    <p className="font-medium">
                                        {label} <span className="font-mono text-xs font-normal text-muted-foreground">{recommended}</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">Screens {screens}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                        The hero takes the shape of each image, so any size works — a tall mobile image shows in full.
                        Missing tablet images use the laptop image; missing mobile images use the tablet or laptop
                        image cropped to 4:3.
                    </p>
                </div>

                <div className="rounded-2xl border bg-card p-5 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">Guidelines</p>
                    <ul className="mt-3 space-y-3 text-sm">
                        <Guideline title="Same shape per screen">
                            With several banners, the first one showing sets the hero&apos;s shape on each screen size.
                            Give the others the same sizes, or they&apos;re cropped to fit.
                        </Guideline>
                        <Guideline title="Order">Showing banners rotate every 6 seconds, top to bottom.</Guideline>
                        <Guideline title="Alt text">Describe the image for screen readers and search engines.</Guideline>
                        <Guideline title="Link">
                            Optional. A page on this site (<code className="text-xs">/auctions/…</code>) or a full
                            <code className="text-xs"> https://</code> address, which opens in a new tab.
                        </Guideline>
                    </ul>
                </div>

                <div className="rounded-2xl border border-[#b08d57]/30 bg-[#b08d57]/5 p-5 text-sm">
                    <p className="font-medium">When a sale is on</p>
                    <p className="mt-1 text-muted-foreground">
                        A live or scheduled auction replaces these banners with its cover image. If it has no cover
                        image, these banners are shown instead.
                    </p>
                </div>
            </aside>

            <AlertDialog
                open={!!pending}
                onOpenChange={(open) => {
                    if (!open && !confirming) setPending(null)
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {pending?.kind === "image"
                                ? `Remove the ${deviceInfo(pending.device).label.toLowerCase()} image?`
                                : "Delete this banner?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {pending?.kind === "image" ? (
                                <>
                                    The image is deleted from storage. {deviceInfo(pending.device).label} screens will show{" "}
                                    {pending.device === "tablet"
                                        ? "the laptop image instead."
                                        : `the ${pending.banner.tabletImageUrl ? "tablet" : "laptop"} image, cropped to 4:3.`}
                                </>
                            ) : (
                                <>
                                    Its laptop, tablet and mobile images are removed from the homepage and from storage,
                                    and can&apos;t be recovered. To take it off the homepage for now, turn off{" "}
                                    <b>Show on homepage</b> instead.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {pending && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={pendingImage?.url ?? pending.banner.imageUrl}
                            alt=""
                            className="max-h-56 w-full rounded-lg border bg-muted object-contain"
                        />
                    )}
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={confirming}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmPending}
                            disabled={confirming}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            {confirming
                                ? pending?.kind === "image"
                                    ? "Removing…"
                                    : "Deleting…"
                                : pending?.kind === "image"
                                    ? "Remove image"
                                    : "Delete banner"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

function BannerRow({
    banner,
    position,
    isFirst,
    isLast,
    heroBanner,
    reordering,
    busySlots,
    onMove,
    onToggle,
    onSave,
    onSetImage,
    onRemoveImage,
    onDelete,
}: {
    banner: HomeBanner
    position: number
    isFirst: boolean
    isLast: boolean
    heroBanner: HomeBanner | undefined
    reordering: boolean
    busySlots: Record<string, boolean>
    onMove: (delta: -1 | 1) => void
    onToggle: (isActive: boolean) => void
    onSave: (changes: HomeBannerChanges) => Promise<boolean>
    onSetImage: (device: BannerDevice, file: File) => void
    onRemoveImage: (device: Exclude<BannerDevice, "desktop">) => void
    onDelete: () => void
}) {
    const [altText, setAltText] = useState(banner.altText ?? "")
    const [linkUrl, setLinkUrl] = useState(banner.linkUrl ?? "")
    const [saving, setSaving] = useState(false)

    const altChanged = altText.trim() !== (banner.altText ?? "")
    const linkChanged = linkUrl.trim() !== (banner.linkUrl ?? "")
    const dirty = altChanged || linkChanged
    const linkError = !isValidLink(linkUrl.trim())

    const discard = () => {
        setAltText(banner.altText ?? "")
        setLinkUrl(banner.linkUrl ?? "")
    }

    const save = async () => {
        if (linkError) return
        setSaving(true)
        const ok = await onSave({
            ...(altChanged && { altText: altText.trim() || null }),
            ...(linkChanged && { linkUrl: linkUrl.trim() || null }),
        })
        setSaving(false)
        if (ok) {
            setAltText(altText.trim())
            setLinkUrl(linkUrl.trim())
        }
    }

    // shown banners after the first are cropped to its shape on each screen size
    const cropNote = (device: BannerDevice) => {
        if (!banner.isActive || !heroBanner || heroBanner.uuid === banner.uuid) return undefined
        const mine = bannerVariant(banner, device).ratio
        const hero = bannerVariant(heroBanner, device).ratio
        return Math.abs(mine - hero) / hero > 0.05 ? "Different shape from the first banner — cropped to fit" : undefined
    }

    return (
        <li className={cn("rounded-xl border bg-background p-3 transition-colors sm:p-4", !banner.isActive && "bg-muted/30")}>
            {/* HEADER */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                    <span className="rounded-md bg-[#491B3A] px-2 py-0.5 font-mono text-xs font-medium text-white">#{position}</span>
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                        <Switch
                            checked={banner.isActive}
                            onCheckedChange={(checked) => onToggle(checked)}
                            className="data-checked:bg-[#491B3A]"
                        />
                        Show on homepage
                    </label>
                    {!banner.isActive && (
                        <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            <EyeOffIcon className="size-3" /> Hidden
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onMove(-1)}
                        disabled={isFirst || reordering}
                        aria-label={`Move banner ${position} up`}
                        title="Move up"
                    >
                        <ArrowUpIcon className="size-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onMove(1)}
                        disabled={isLast || reordering}
                        aria-label={`Move banner ${position} down`}
                        title="Move down"
                    >
                        <ArrowDownIcon className="size-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onDelete}
                        aria-label={`Delete banner ${position}`}
                        title="Delete banner"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                    >
                        <Trash2Icon className="size-4" />
                    </Button>
                </div>
            </div>

            {/* IMAGES — one per screen size */}
            <div className={cn("mt-3 grid gap-3 sm:grid-cols-3", !banner.isActive && "opacity-60")}>
                {DEVICES.map((info) => (
                    <DeviceSlot
                        key={info.device}
                        info={info}
                        image={ownImage(banner, info.device)}
                        fallback={fallbackText(info.device, !!banner.tabletImageUrl)}
                        busy={!!busySlots[`${banner.uuid}:${info.device}`]}
                        cropNote={cropNote(info.device)}
                        onPick={(file) => onSetImage(info.device, file)}
                        onRemove={info.device === "desktop" ? undefined : () => onRemoveImage(info.device as Exclude<BannerDevice, "desktop">)}
                    />
                ))}
            </div>

            {/* DETAILS */}
            <BannerDetailsFields
                idPrefix={`banner-${banner.uuid}`}
                altText={altText}
                onAltTextChange={setAltText}
                linkUrl={linkUrl}
                onLinkUrlChange={setLinkUrl}
                linkError={linkError}
            />

            {dirty && (
                <div className="mt-3 flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={discard} disabled={saving}>
                        Discard
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={save}
                        disabled={saving || linkError}
                        className="bg-[#491B3A] text-white hover:bg-[#491B3A]/90"
                    >
                        {saving && <Loader2Icon className="size-3.5 animate-spin" />}
                        {saving ? "Saving…" : "Save"}
                    </Button>
                </div>
            )}
        </li>
    )
}

type PickedImage = NewBannerImage & { url: string }

// a banner before it's uploaded: pick its three images, then add it in one go
function NewBannerForm({ onCreate }: { onCreate: (input: Parameters<typeof uploadHomeBanner>[1]) => Promise<boolean> }) {
    const [picked, setPicked] = useState<Partial<Record<BannerDevice, PickedImage>>>({})
    const [altText, setAltText] = useState("")
    const [linkUrl, setLinkUrl] = useState("")
    const [saving, setSaving] = useState(false)

    // previews are object URLs — free them when replaced, cleared, or the form goes away
    const pickedRef = useRef(picked)
    useEffect(() => {
        pickedRef.current = picked
    }, [picked])
    useEffect(() => () => Object.values(pickedRef.current).forEach((p) => p && URL.revokeObjectURL(p.url)), [])

    const linkError = !isValidLink(linkUrl.trim())
    const count = Object.values(picked).filter(Boolean).length
    const dirty = count > 0 || !!altText || !!linkUrl

    const setSlot = (device: BannerDevice, image: PickedImage | undefined) =>
        setPicked((current) => {
            if (current[device]) URL.revokeObjectURL(current[device].url)
            return { ...current, [device]: image }
        })

    const pick = async (device: BannerDevice, file: File) => {
        if (!checkImage(file)) return
        const size = await readSize(file)
        warnIfSmall(file, size, device)
        setSlot(device, { file, size, url: URL.createObjectURL(file) })
    }

    const reset = () => {
        Object.values(picked).forEach((p) => p && URL.revokeObjectURL(p.url))
        setPicked({})
        setAltText("")
        setLinkUrl("")
    }

    const submit = async () => {
        const desktop = picked.desktop
        if (!desktop) {
            toast.error("Choose a laptop image — it's required")
            return
        }
        if (linkError) return
        setSaving(true)
        const ok = await onCreate({
            images: { desktop, tablet: picked.tablet, mobile: picked.mobile },
            altText: altText.trim() || undefined,
            linkUrl: linkUrl.trim() || undefined,
        })
        setSaving(false)
        if (ok) reset()
    }

    return (
        <div className="rounded-xl border-2 border-dashed p-3 sm:p-4">
            <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#491B3A]/10 text-[#491B3A] dark:bg-white/10 dark:text-white">
                    <ImageUpIcon className="size-4" />
                </span>
                <div className="min-w-0">
                    <p className="text-sm font-medium">New banner</p>
                    <p className="text-xs text-muted-foreground">
                        Add an image for each screen size — laptop is required, tablet and mobile are optional. JPG,
                        PNG, WEBP or GIF · max 10 MB each.
                    </p>
                </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {DEVICES.map((info) => {
                    const image = picked[info.device]
                    return (
                        <DeviceSlot
                            key={info.device}
                            info={info}
                            image={image ? { url: image.url, width: image.size?.width ?? null, height: image.size?.height ?? null } : null}
                            fallback={fallbackText(info.device, !!picked.tablet)}
                            busy={saving}
                            onPick={(file) => pick(info.device, file)}
                            onRemove={() => setSlot(info.device, undefined)}
                        />
                    )
                })}
            </div>

            <BannerDetailsFields
                idPrefix="new-banner"
                altText={altText}
                onAltTextChange={setAltText}
                linkUrl={linkUrl}
                onLinkUrlChange={setLinkUrl}
                linkError={linkError}
            />

            <div className="mt-3 flex justify-end gap-2">
                {dirty && (
                    <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={saving}>
                        Clear
                    </Button>
                )}
                <Button
                    type="button"
                    size="sm"
                    onClick={submit}
                    disabled={saving || !picked.desktop || linkError}
                    className="bg-[#491B3A] text-white hover:bg-[#491B3A]/90"
                >
                    {saving ? <Loader2Icon className="size-3.5 animate-spin" /> : <PlusIcon className="size-3.5" />}
                    {saving ? `Uploading ${count} ${count === 1 ? "image" : "images"}…` : "Add banner"}
                </Button>
            </div>
        </div>
    )
}

function BannerDetailsFields({
    idPrefix,
    altText,
    onAltTextChange,
    linkUrl,
    onLinkUrlChange,
    linkError,
}: {
    idPrefix: string
    altText: string
    onAltTextChange: (value: string) => void
    linkUrl: string
    onLinkUrlChange: (value: string) => void
    linkError: boolean
}) {
    const id = (field: string) => `${idPrefix}-${field}`
    return (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
                <Label htmlFor={id("alt")} className="text-xs font-normal text-muted-foreground">
                    Alt text
                </Label>
                <Input
                    id={id("alt")}
                    value={altText}
                    onChange={(e) => onAltTextChange(e.target.value)}
                    maxLength={200}
                    placeholder="e.g. Gilded frame on a plum wall"
                    className="h-9"
                />
            </div>
            <div className="space-y-1.5">
                <Label htmlFor={id("link")} className="text-xs font-normal text-muted-foreground">
                    Link (optional)
                </Label>
                <Input
                    id={id("link")}
                    value={linkUrl}
                    onChange={(e) => onLinkUrlChange(e.target.value)}
                    maxLength={500}
                    placeholder="/auctions/… or https://…"
                    aria-invalid={linkError || undefined}
                    aria-describedby={linkError ? id("link-error") : undefined}
                    className="h-9"
                />
                {linkError && (
                    <p id={id("link-error")} className="text-xs text-red-600">
                        Start with / for a page on this site, or with https://
                    </p>
                )}
            </div>
        </div>
    )
}

function DeviceSlot({
    info,
    image,
    fallback,
    busy,
    cropNote,
    onPick,
    onRemove,
}: {
    info: DeviceInfo
    image: SlotImage | null
    // shown in the empty slot: what the screen uses instead
    fallback: string
    busy: boolean
    cropNote?: string
    onPick: (file: File) => void
    onRemove?: () => void
}) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [dragging, setDragging] = useState(false)
    const Icon = info.icon

    const pick = (file: File | undefined) => {
        if (file && !busy) onPick(file)
    }

    return (
        <div className="flex min-w-0 flex-col rounded-lg border bg-card p-2">
            <div className="flex items-center justify-between gap-2 px-0.5">
                <span className="flex items-center gap-1.5 text-xs font-medium">
                    <Icon className="size-3.5 text-muted-foreground" />
                    {info.label}
                </span>
                <span className="truncate text-[10px] text-muted-foreground">{info.screens}</span>
            </div>

            <input
                ref={inputRef}
                type="file"
                accept={IMAGE_TYPES.join(",")}
                className="hidden"
                onChange={(e) => {
                    pick(e.target.files?.[0])
                    e.target.value = ""
                }}
            />

            {/* the image whole (object-contain) so its real shape shows; drop a file to replace it */}
            <div
                onDragOver={(e) => {
                    e.preventDefault()
                    if (!busy) setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                    e.preventDefault()
                    setDragging(false)
                    pick(e.dataTransfer.files?.[0])
                }}
                className={cn(
                    "relative mt-2 flex h-28 items-center justify-center overflow-hidden rounded-md transition-colors",
                    image ? "bg-muted/60" : "border border-dashed",
                    dragging && "bg-[#b08d57]/10 ring-2 ring-[#b08d57]"
                )}
            >
                {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image.url} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
                ) : (
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        disabled={busy}
                        className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                        <ImagePlusIcon className="size-5" />
                        <span className="text-[11px] leading-tight">{fallback}</span>
                    </button>
                )}
                {busy && (
                    <span className="absolute inset-0 flex items-center justify-center bg-background/70">
                        <Loader2Icon className="size-5 animate-spin text-[#b08d57]" />
                    </span>
                )}
            </div>

            <div className="mt-2 flex items-center justify-between gap-1">
                <span className="truncate font-mono text-[10px] text-muted-foreground">
                    {image
                        ? image.width && image.height
                            ? `${image.width} × ${image.height} · ${ratioLabel(image.width, image.height)}`
                            : "Size unknown"
                        : `Best ${info.recommended}`}
                </span>
                <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => inputRef.current?.click()}
                        disabled={busy}
                        aria-label={`${image ? "Replace" : "Add"} the ${info.label.toLowerCase()} image`}
                    >
                        {image ? <RefreshCwIcon /> : <ImagePlusIcon />}
                        {image ? "Replace" : "Add"}
                    </Button>
                    {image && onRemove && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={onRemove}
                            disabled={busy}
                            aria-label={`Remove the ${info.label.toLowerCase()} image`}
                            title="Remove"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                        >
                            <XIcon />
                        </Button>
                    )}
                </div>
            </div>

            {cropNote && <p className="mt-1.5 px-0.5 text-[10px] leading-tight text-amber-600">{cropNote}</p>}
        </div>
    )
}

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div className="px-2 py-4">
            <p className="font-mono text-2xl font-semibold">{value}</p>
            <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        </div>
    )
}

function Guideline({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <li>
            <p className="font-medium">{title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{children}</p>
        </li>
    )
}
