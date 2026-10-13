"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import toast from "react-hot-toast"

import { useAppSelector } from "@/hooks/redux"
import { getErrorMessage } from "@/lib/apiError"
import type { GalleryItem } from "@/lib/types/profile.types"
import { addToGallery, getMyGallery, removeFromGallery } from "@/services/operations/profile.api"

export type GalleryControls = {
    isSaved: (lotUuid: string) => boolean
    isPending: (lotUuid: string) => boolean
    toggle: (lotUuid: string) => void
}

const NONE = new Set<string>()

/**
 * The signed-in user's "My auction gallery". Guests get sent to log in when they try to save.
 * `items` is the list as loaded (removals are applied to it; additions only mark the lot saved).
 */
export function useGallery() {
    const router = useRouter()
    const pathname = usePathname()
    const token = useAppSelector((state) => state.auth.accessToken)

    const [items, setItems] = useState<GalleryItem[] | null>(null)
    const [saved, setSaved] = useState<Set<string>>(NONE)
    const [pending, setPending] = useState<Set<string>>(NONE)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!token) return
        let cancelled = false
        getMyGallery(token)
            .then((data) => {
                if (cancelled) return
                setItems(data)
                setSaved(new Set(data.map((item) => item.lot.uuid)))
                setError(null)
            })
            .catch((err) => {
                if (!cancelled) setError(getErrorMessage(err))
            })
        return () => {
            cancelled = true
        }
    }, [token])

    const update = (set: Set<string>, lotUuid: string, add: boolean) => {
        const next = new Set(set)
        if (add) next.add(lotUuid)
        else next.delete(lotUuid)
        return next
    }

    const toggle = async (lotUuid: string) => {
        if (!token) {
            toast("Log in to save lots to your auction gallery")
            router.push(`/registration?redirect=${encodeURIComponent(pathname)}`)
            return
        }
        if (pending.has(lotUuid)) return

        const adding = !saved.has(lotUuid)
        // optimistic: flip it now, put it back if the request fails
        setSaved((prev) => update(prev, lotUuid, adding))
        setPending((prev) => update(prev, lotUuid, true))
        try {
            if (adding) {
                await addToGallery(lotUuid, token)
                toast.success("Added to your auction gallery")
            } else {
                await removeFromGallery(lotUuid, token)
                setItems((prev) => prev && prev.filter((item) => item.lot.uuid !== lotUuid))
                toast.success("Removed from your auction gallery")
            }
        } catch (err) {
            setSaved((prev) => update(prev, lotUuid, !adding))
            toast.error(getErrorMessage(err))
        } finally {
            setPending((prev) => update(prev, lotUuid, false))
        }
    }

    const controls: GalleryControls = {
        // signed out: nothing is saved, whatever was loaded before
        isSaved: (lotUuid) => !!token && saved.has(lotUuid),
        isPending: (lotUuid) => pending.has(lotUuid),
        toggle,
    }

    return { items: token ? items : null, error, controls }
}
