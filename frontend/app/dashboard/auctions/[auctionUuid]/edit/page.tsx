"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";

import AuctionsForm, { AuctionSubmitStatus } from "@/components/core/Dashboard/auctions/AuctionsForm";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { Auction, AuctionStatus } from "@/lib/types/auction.types";
import type { AuctionFormData } from "@/lib/types/AuctionsFormData";

import { getAuctions, getLotsByAuction, updateAuction } from "@/services/operations/auction.api";
import { clearUpdateState } from "@/redux/slices/auctionSlice";
import { auctionToFormData } from "@/utils/auctionToFormData";
import { buildAuctionFormData } from "@/utils/buildAuctionFormData";

import { AppDispatch, RootState } from "@/redux/store";

/** Mirrors the backend rule in updateAuctionService */
const EDITABLE_STATUSES: AuctionStatus[] = ["DRAFT", "SCHEDULED"];

export default function EditAuction() {
    const { auctionUuid } = useParams<{ auctionUuid: string }>();
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();

    const { auctions, updating, updateError } = useSelector((state: RootState) => state.auction);

    // Tagged with the uuid it was loaded for, so a different uuid reads as "loading"
    const [loaded, setLoaded] = useState<
        | { uuid: string; defaults: AuctionFormData; status: AuctionStatus; error?: never }
        | { uuid: string; error: string; defaults?: never; status?: never }
        | null
    >(null);

    // Read the list once per uuid — later list updates must not reset the form
    const auctionsRef = useRef(auctions);

    useEffect(() => {
        dispatch(clearUpdateState());
    }, [dispatch]);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                // Opened from the list -> already in the store; direct link / refresh -> fetch
                const findAuction = async (): Promise<Auction | undefined> => {
                    const cached = auctionsRef.current.find((a) => a.uuid === auctionUuid);
                    if (cached) return cached;
                    const res = await dispatch(getAuctions()).unwrap();
                    return res.data.find((a) => a.uuid === auctionUuid);
                };

                const [auction, lotsRes] = await Promise.all([
                    findAuction(),
                    dispatch(getLotsByAuction({ auctionUuid })).unwrap(),
                ]);
                if (cancelled) return;

                if (!auction) {
                    setLoaded({ uuid: auctionUuid, error: "Auction not found" });
                    return;
                }

                setLoaded({
                    uuid: auctionUuid,
                    status: auction.status,
                    defaults: auctionToFormData(auction, lotsRes.data.lots ?? []),
                });
            } catch (err) {
                if (!cancelled) {
                    setLoaded({
                        uuid: auctionUuid,
                        error: typeof err === "string" ? err : "Failed to load auction",
                    });
                }
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [auctionUuid, dispatch]);

    const handleSubmit = async (data: AuctionFormData, submitStatus: AuctionSubmitStatus) => {
        const formData = buildAuctionFormData(data, submitStatus, { isEdit: true });
        await dispatch(updateAuction({ auctionUuid, formData })).unwrap();
        router.push("/dashboard/auctions");
    };

    // ---------------- states ----------------

    const current = loaded?.uuid === auctionUuid ? loaded : null;
    const loadError = current?.error ?? null;
    const status = current?.status ?? null;
    const defaults = current?.defaults ?? null;

    if (loadError || (status && !EDITABLE_STATUSES.includes(status))) {
        return (
            <div className="px-8 py-8">
                <div className="flex items-start gap-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                        {loadError ??
                            `Only draft or scheduled auctions can be edited (current status: ${status}).`}
                    </span>
                </div>
                <Link
                    href="/dashboard/auctions"
                    className={cn(buttonVariants({ variant: "outline" }), "mt-4 inline-flex gap-2")}
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to auctions
                </Link>
            </div>
        );
    }

    if (!defaults) {
        return (
            <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading auction...
            </div>
        );
    }

    // A scheduled auction stays published — a draft can be saved or published
    const isDraft = status === "DRAFT";

    return (
        <AuctionsForm
            key={auctionUuid}
            defaultValues={defaults}
            onSubmit={handleSubmit}
            submitting={updating}
            error={updateError}
            saveLabel={isDraft ? "Save Draft" : "Save Changes"}
            saveStatus={isDraft ? "DRAFT" : "SCHEDULED"}
            publishLabel={isDraft ? "Publish" : "Save Changes"}
        />
    );
}
