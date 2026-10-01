'use client'
import { columns } from "@/components/core/Dashboard/users/users-columns";
import { UsersTable } from "@/components/core/Dashboard/users/users-table";
import { Field } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import { getAllUsers } from "@/services/operations/user.api";

export default function Bidders() {
    const [search, setSearch] = useState("")

    const dispatch = useDispatch<AppDispatch>();
    const { users, loading, error } = useSelector((state: RootState) => state.user);

    // only bidders whose KYC is verified
    useEffect(() => {
        dispatch(getAllUsers({ page: 1, limit: 100, role: "BIDDER", kycStatus: "VERIFIED" }));
    }, [dispatch]);

    // the users slice is shared with other pages, so guard against stale unfiltered data
    const verifiedBidders = useMemo(
        () => (users ?? []).filter((u) => u.role?.name === "BIDDER" && u.kyc?.status === "VERIFIED"),
        [users]
    );

    return (
        <div className="px-8 py-8">

            <div className="">
                <h1 className="text-[24px] font-bold">Bidders</h1>
                <p className="text-sm text-muted-foreground">Verified bidders only</p>
            </div>

            <div className="w-full rounded-[8px] pb-4">
                <div className="pb-4 flex items-center justify-between mt-3.5">
                    <div className="flex items-center gap-4 w-87.5 h-10">
                        <Field className="max-w-sm">
                            <InputGroup className="bg-white">
                                <InputGroupInput id="inline-start-input" placeholder="Search Bidders" value={search}
                                    onChange={(e) => setSearch(e.target.value)} />
                                <InputGroupAddon align="inline-start">
                                    <SearchIcon className="text-muted-foreground" />
                                </InputGroupAddon>
                            </InputGroup>
                        </Field>
                    </div>
                </div>

                {loading ? (
                    <p className="text-sm text-muted-foreground">Loading bidders...</p>
                ) : error ? (
                    <p className="text-sm text-red-500">{error}</p>
                ) : (
                    <UsersTable columns={columns} data={verifiedBidders} search={search} />
                )}

            </div>
        </div>
    )
}
