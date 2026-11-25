'use client'
import { auctionBidderListColumns, bidderListColumns, paddlesColumn } from "@/components/core/Dashboard/users/users-columns";
import { RegisterDialog, type RegisterTarget } from "@/components/core/Dashboard/addedBidders/AddedBidders";
import type { AuctionStatus } from "@/lib/types/auction.types";
import { UsersTable } from "@/components/core/Dashboard/users/users-table";
import ExportUsersButton from "@/components/core/Dashboard/users/ExportUsersButton";
import { Field } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AUCTION_STATUS_LABELS } from "@/lib/constants/auctionStatus";
import { SearchIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import { getAuctions } from "@/services/operations/auction.api";
import { getAllUsers } from "@/services/operations/user.api";

// value of the "every bidder" option in the auction filter
const ALL_AUCTIONS = "all";

// same as the backend's EDITABLE_AUCTION_STATUSES — registrations can only change on these
const OPEN_FOR_REGISTRATION = new Set<AuctionStatus>(["DRAFT", "SCHEDULED", "PREVIEW", "LIVE", "PAUSED"]);

export default function Bidders() {
    const [search, setSearch] = useState("")
    // auction uuid, or ALL_AUCTIONS for every bidder
    const [auctionFilter, setAuctionFilter] = useState<string>(ALL_AUCTIONS)

    const dispatch = useDispatch<AppDispatch>();
    const { users, loading, error } = useSelector((state: RootState) => state.user);
    const { auctions, auctionsLoading } = useSelector((state: RootState) => state.auction);
    // the slice's pagination may belong to another page until our own request lands
    const [total, setTotal] = useState<number | null>(null);
    const latestRequest = useRef(0);

    useEffect(() => {
        dispatch(getAuctions());
    }, [dispatch]);

    // newest auctions first in the dropdown
    const auctionOptions = useMemo(
        () => [...auctions].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()),
        [auctions]
    );
    const selectedAuction = auctionOptions.find((a) => a.uuid === auctionFilter) ?? null;
    const auctionUuid = auctionFilter === ALL_AUCTIONS ? undefined : auctionFilter;

    const { role: myRole, accessToken } = useSelector((state: RootState) => state.auth);
    const isSuperAdmin = myRole === "SUPER_ADMIN";
    // bumped after a registration so the paddle numbers reload
    const [reload, setReload] = useState(0);
    const [registering, setRegistering] = useState<RegisterTarget | null>(null);

    // only accounts with the Bidder role — website users without bidder access are on the Users page.
    // With an auction picked, only the bidders registered for it
    useEffect(() => {
        const request = ++latestRequest.current;
        dispatch(getAllUsers({ page: 1, limit: 100, role: "BIDDER", ...(auctionUuid && { auction: auctionUuid }) }))
            .unwrap()
            .then((res) => request === latestRequest.current && setTotal(res.data.pagination.total))
            .catch(() => request === latestRequest.current && setTotal(null));
    }, [dispatch, auctionUuid, reload]);

    // auctions a bidder can still be registered for (the API refuses ended / cancelled ones)
    const openAuctions = useMemo(
        () =>
            auctions
                .filter((a) => OPEN_FOR_REGISTRATION.has(a.status))
                .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
        [auctions]
    );

    // every bidder: paddle numbers after the name; super admins can register them for an auction
    const allBiddersColumns = useMemo(() => {
        const paddles = paddlesColumn({
            openAuctionUuids: new Set(openAuctions.map((a) => a.uuid)),
            onRegister: isSuperAdmin
                ? (user) =>
                      setRegistering({
                          uuid: user.uuid,
                          username: user.username,
                          name: `${user.profile?.firstName ?? ""} ${user.profile?.lastName ?? ""}`.trim() || null,
                          registrations: user.registrations ?? [],
                      })
                : undefined,
        });
        return bidderListColumns.flatMap((column) => (column.id === "fullName" ? [column, paddles] : [column]));
    }, [openAuctions, isSuperAdmin]);

    // the users slice is shared with other pages, so guard against stale unfiltered data
    const bidders = useMemo(
        () => (users ?? []).filter((u) => u.role?.name === "BIDDER" && (!auctionUuid || u.auctionParticipation)),
        [users, auctionUuid]
    );

    return (
        <div className="px-8 py-8">

            <div className="">
                <div className="flex items-center gap-2">
                    <h1 className="text-[24px] font-bold">Bidders</h1>
                    {/* hidden while loading — the count would still be the previous filter's */}
                    {total !== null && !loading && (
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm font-medium text-muted-foreground">
                            {total.toLocaleString("en-IN")} {auctionUuid ? "registered" : "total"}
                        </span>
                    )}
                </div>
                <p className="text-sm text-muted-foreground">
                    {selectedAuction
                        ? `Bidders registered for ${selectedAuction.title}`
                        : "Everyone with bidder access"}
                </p>
            </div>

            <div className="w-full rounded-[8px] pb-4">
                <div className="pb-4 flex flex-wrap items-center justify-between gap-3 mt-3.5">
                    <div className="flex items-center gap-3">
                        <Field className="w-87.5 max-w-sm">
                            <InputGroup className="bg-white">
                                <InputGroupInput id="inline-start-input" placeholder="Search Bidders" value={search}
                                    onChange={(e) => setSearch(e.target.value)} />
                                <InputGroupAddon align="inline-start">
                                    <SearchIcon className="text-muted-foreground" />
                                </InputGroupAddon>
                            </InputGroup>
                        </Field>

                        <Select
                            value={auctionFilter}
                            onValueChange={(value) => value !== null && setAuctionFilter(value)}
                        >
                            <SelectTrigger className="h-10 w-72 bg-white" aria-label="Filter by auction">
                                <SelectValue>
                                    <span className="truncate">
                                        {selectedAuction ? selectedAuction.title : "Auction: All bidders"}
                                    </span>
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="max-h-80 bg-white">
                                <SelectGroup>
                                    <SelectItem value={ALL_AUCTIONS}>All bidders</SelectItem>
                                </SelectGroup>
                                <SelectGroup>
                                    <SelectLabel className="text-slate-500">
                                        {auctionsLoading && auctionOptions.length === 0 ? "Loading auctions..." : "Registered for auction"}
                                    </SelectLabel>
                                    {auctionOptions.map((auction) => (
                                        <SelectItem key={auction.uuid} value={auction.uuid}>
                                            <span className="truncate">{auction.title}</span>
                                            <span className="ml-auto pl-2 text-xs text-muted-foreground">
                                                {AUCTION_STATUS_LABELS[auction.status]} · {auction._count?.participants ?? 0}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                    <ExportUsersButton
                        role="BIDDER"
                        label="bidders"
                        auction={selectedAuction && { uuid: selectedAuction.uuid, title: selectedAuction.title }}
                    />
                </div>

                {loading ? (
                    <p className="text-sm text-muted-foreground">Loading bidders...</p>
                ) : error ? (
                    <p className="text-sm text-red-500">{error}</p>
                ) : selectedAuction && bidders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No bidders have registered for this auction yet.</p>
                ) : (
                    <UsersTable
                        // remount when switching views so the column set and table state reset together
                        key={auctionUuid ?? ALL_AUCTIONS}
                        columns={auctionUuid ? auctionBidderListColumns : allBiddersColumns}
                        data={bidders}
                        search={search}
                    />
                )}

                {isSuperAdmin && (
                    <RegisterDialog
                        bidder={registering}
                        auctions={openAuctions}
                        token={accessToken}
                        onClose={() => setRegistering(null)}
                        onRegistered={() => {
                            setReload((n) => n + 1);
                            // the auction filter shows registration counts
                            dispatch(getAuctions());
                        }}
                    />
                )}

            </div>
        </div>
    )
}
