"use client";

import { useState, type ReactNode } from "react";
import toast from "react-hot-toast";

import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { AUCTION_STATUS_LABELS, AUCTION_STATUS_TRANSITIONS } from "@/lib/constants/auctionStatus";
import type { AuctionStatus, ChangeAuctionStatusResponse } from "@/lib/types/auction.types";
import { changeAuctionStatus } from "@/services/operations/auction.api";

/** What the new status means, shown in the confirm dialog */
const STATUS_HINT: Record<AuctionStatus, string> = {
    DRAFT: "It will be unpublished and can be edited again before rescheduling.",
    SCHEDULED: "It will be published and wait for its start time.",
    PREVIEW: "Lots can be browsed before bidding opens.",
    LIVE: "The auction will be marked as live for bidding.",
    PAUSED: "Bidding is on hold until it's set back to Live.",
    ENDED: "Bidding is closed. Afterwards it can only move to Settled.",
    SETTLED: "Marks the auction as fully settled. This is final.",
    CANCELLED: "The auction is called off. It can only be reopened as a draft.",
};

interface AuctionStatusControlProps {
    auction: { uuid: string; title: string; status: AuctionStatus };

    /** The read-only status badge — shown as-is to everyone except SUPER_ADMIN */
    badge: ReactNode;

    /** Called after a successful change (e.g. to update local page state) */
    onChanged?: (data: ChangeAuctionStatusResponse["data"]) => void;
}

/**
 * Status badge that a SUPER_ADMIN can click to move the auction to an
 * allowed next status (with confirmation + optional reason).
 */
export default function AuctionStatusControl({ auction, badge, onChanged }: AuctionStatusControlProps) {
    const dispatch = useAppDispatch();
    const myRole = useAppSelector((state) => state.auth.role);
    const changingStatusUuid = useAppSelector((state) => state.auction.changingStatusUuid);

    // status picked in the dropdown, waiting for confirmation
    const [pendingStatus, setPendingStatus] = useState<AuctionStatus | null>(null);
    const [reason, setReason] = useState("");

    const nextStatuses = AUCTION_STATUS_TRANSITIONS[auction.status] ?? [];
    const isChanging = changingStatusUuid === auction.uuid;

    // UI hint only — the backend enforces role + allowed transitions
    if (myRole !== "SUPER_ADMIN" || nextStatuses.length === 0) return <>{badge}</>;

    const close = () => {
        setPendingStatus(null);
        setReason("");
    };

    const handleConfirm = async () => {
        if (!pendingStatus) return;

        try {
            const result = await dispatch(
                changeAuctionStatus({ auctionUuid: auction.uuid, status: pendingStatus, reason })
            ).unwrap();
            toast.success(`"${auction.title}" is now ${AUCTION_STATUS_LABELS[result.data.status]}`);
            onChanged?.(result.data);
            close();
        } catch (error) {
            // keep the dialog open so the reason isn't lost
            toast.error(typeof error === "string" ? error : "Could not change status. Try again.");
        }
    };

    return (
        <>
            <Select
                value={auction.status}
                onValueChange={(value) => {
                    if (value && value !== auction.status) setPendingStatus(value as AuctionStatus);
                }}
                disabled={isChanging}
            >
                <SelectTrigger
                    className="h-auto w-auto gap-1 border-none bg-transparent p-0 shadow-none hover:opacity-80"
                    aria-label={`Change status of ${auction.title}`}
                    title="Change status"
                >
                    <SelectValue>{isChanging ? <span className="text-[11px] text-slate-500">Updating...</span> : badge}</SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white">
                    <SelectGroup>
                        <SelectItem value={auction.status} disabled className="text-xs">
                            {AUCTION_STATUS_LABELS[auction.status]} (current)
                        </SelectItem>
                        {nextStatuses.map((status) => (
                            <SelectItem key={status} value={status} className="text-xs">
                                {AUCTION_STATUS_LABELS[status]}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>

            <AlertDialog
                open={pendingStatus !== null}
                onOpenChange={(open) => {
                    if (!open && !isChanging) close();
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Change auction status?</AlertDialogTitle>
                        <AlertDialogDescription>
                            <b>{auction.title}</b> will change from{" "}
                            <b>{AUCTION_STATUS_LABELS[auction.status]}</b> to{" "}
                            <b>{pendingStatus ? AUCTION_STATUS_LABELS[pendingStatus] : ""}</b>.{" "}
                            {pendingStatus && STATUS_HINT[pendingStatus]}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div>
                        <label htmlFor={`status-reason-${auction.uuid}`} className="mb-1.5 block text-xs font-medium text-slate-600">
                            Reason (optional)
                        </label>
                        <Textarea
                            id={`status-reason-${auction.uuid}`}
                            value={reason}
                            maxLength={500}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Saved in the auction's status history"
                            disabled={isChanging}
                            className="min-h-20 text-sm"
                        />
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isChanging}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirm}
                            disabled={isChanging}
                            className="bg-[#491B3A] text-white hover:bg-[#491B3A]/90"
                        >
                            {isChanging ? "Updating..." : "Change status"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
