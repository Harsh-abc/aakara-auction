"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Search, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAppDispatch } from "@/hooks/redux";
import type { ParticipantUser } from "@/lib/types/auctionParticipant.types";
import { cn } from "@/lib/utils";
import { getParticipantCandidates } from "@/services/operations/auctionParticipant.api";

interface AddParticipantsDialogProps {
    auctionUuid: string;
    busy: boolean;
    /** Resolve with the API response on success, reject with a message string on failure */
    onAdd: (userUuids: string[]) => Promise<{ message: string }>;
}

/**
 * Search bidder accounts not yet registered for the auction, pick any
 * number, and register them (for every lot, pending verification).
 */
export default function AddParticipantsDialog({ auctionUuid, busy, onAdd }: AddParticipantsDialogProps) {
    const dispatch = useAppDispatch();

    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [results, setResults] = useState<ParticipantUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // kept across searches, so picks from an earlier search stay selected
    const [selected, setSelected] = useState<Map<string, ParticipantUser>>(new Map());

    // Debounced search while the dialog is open
    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        const t = setTimeout(async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await dispatch(getParticipantCandidates({ auctionUuid, search })).unwrap();
                if (!cancelled) setResults(res.data);
            } catch (err) {
                if (!cancelled) setError(typeof err === "string" ? err : "Could not load users");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, 300);
        return () => {
            cancelled = true;
            clearTimeout(t);
        };
    }, [open, search, auctionUuid, dispatch]);

    const handleOpenChange = (next: boolean) => {
        setOpen(next);
        if (!next) {
            setSearch("");
            setResults([]);
            setSelected(new Map());
            setError(null);
        }
    };

    const toggle = (user: ParticipantUser, checked: boolean) =>
        setSelected((prev) => {
            const next = new Map(prev);
            if (checked) next.set(user.uuid, user);
            else next.delete(user.uuid);
            return next;
        });

    const handleAdd = async () => {
        try {
            const res = await onAdd([...selected.keys()]);
            toast.success(res.message);
            handleOpenChange(false);
        } catch (err) {
            toast.error(typeof err === "string" ? err : "Could not add users. Try again.");
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger render={<Button variant="outline" className="px-3 py-4.5 text-[15px]" />}>
                <UserPlus />
                Add Existing User
            </DialogTrigger>

            <DialogContent className="gap-5 bg-white p-6 sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Add Existing Users</DialogTitle>
                    <DialogDescription className="text-[13px] text-[#62666F]">
                        They&apos;ll be registered for every lot in this auction. You still verify them per lot before
                        they can bid.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name, username, email, phone"
                        className="h-10 bg-white pl-9 text-sm"
                        autoFocus
                    />
                </div>

                <div className="max-h-80 min-h-40 overflow-y-auto rounded-md border border-slate-200">
                    {loading && results.length === 0 ? (
                        <div className="flex h-40 items-center justify-center gap-2 text-sm text-slate-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Searching...
                        </div>
                    ) : error ? (
                        <p className="flex h-40 items-center justify-center px-4 text-center text-sm text-red-600">{error}</p>
                    ) : results.length === 0 ? (
                        <p className="flex h-40 items-center justify-center px-4 text-center text-sm text-slate-500">
                            {search ? "No matching users who aren't already registered." : "No users left to add."}
                        </p>
                    ) : (
                        <ul className={cn("divide-y divide-slate-100", loading && "opacity-60")}>
                            {results.map((user) => {
                                const checked = selected.has(user.uuid);
                                return (
                                    <li key={user.uuid}>
                                        <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-slate-50">
                                            <Checkbox checked={checked} onCheckedChange={(value) => toggle(user, !!value)} />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-[13px] font-medium text-slate-800">
                                                    {user.name || user.username}
                                                </p>
                                                <p className="truncate text-[11px] text-slate-500">
                                                    @{user.username} · {user.email}
                                                </p>
                                            </div>
                                            <KycBadge status={user.kycStatus} />
                                        </label>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <DialogFooter className="mx-0 mb-0 grid grid-cols-2 gap-3 rounded-none border-t-0 bg-transparent p-0">
                    <DialogClose render={<Button type="button" variant="outline" className="h-11" />}>Cancel</DialogClose>
                    <Button
                        type="button"
                        disabled={selected.size === 0 || busy}
                        onClick={handleAdd}
                        className="h-11 bg-dashboardButton text-black hover:bg-amber-500 disabled:bg-[#E5E5E5] disabled:text-[#9A9A9A] disabled:opacity-100"
                    >
                        {busy ? "Adding..." : selected.size ? `Add ${selected.size} to Auction` : "Add to Auction"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/** A registrant's paddle number for the auction ("—" for legacy rows without one) */
export const PaddleBadge = ({ number }: { number: string | null }) =>
    number ? (
        <span className="inline-flex min-w-12 justify-center rounded-md border border-[#491B3A]/20 bg-[#491B3A]/5 px-2 py-1 font-mono text-[12px] font-semibold text-[#491B3A]">
            #{number}
        </span>
    ) : (
        <span className="text-[12px] text-slate-400">—</span>
    );

/** KYC must be verified before a user can be verified on a lot */
export const KycBadge = ({ status }: { status: string }) =>
    status === "VERIFIED" ? (
        <Badge variant="outline" className="shrink-0 rounded-full border-emerald-100 bg-emerald-50 text-[10px] text-emerald-700">
            KYC verified
        </Badge>
    ) : (
        <Badge variant="outline" className="shrink-0 rounded-full border-amber-100 bg-amber-50 text-[10px] text-amber-700">
            KYC {status === "NOT_SUBMITTED" ? "not submitted" : status.toLowerCase().replace(/_/g, " ")}
        </Badge>
    );
