'use client'
import { bidderListColumns } from "@/components/core/Dashboard/users/users-columns";
import { UsersTable } from "@/components/core/Dashboard/users/users-table";
import ExportUsersButton from "@/components/core/Dashboard/users/ExportUsersButton";
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
    // the slice's pagination may belong to another page until our own request lands
    const [total, setTotal] = useState<number | null>(null);

    // only accounts with the Bidder role — website users without bidder access are on the Users page
    useEffect(() => {
        dispatch(getAllUsers({ page: 1, limit: 100, role: "BIDDER" }))
            .unwrap()
            .then((res) => setTotal(res.data.pagination.total))
            .catch(() => setTotal(null));
    }, [dispatch]);

    // the users slice is shared with other pages, so guard against stale unfiltered data
    const bidders = useMemo(
        () => (users ?? []).filter((u) => u.role?.name === "BIDDER"),
        [users]
    );

    return (
        <div className="px-8 py-8">

            <div className="">
                <div className="flex items-center gap-2">
                    <h1 className="text-[24px] font-bold">Bidders</h1>
                    {total !== null && (
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm font-medium text-muted-foreground">
                            {total.toLocaleString("en-IN")} total
                        </span>
                    )}
                </div>
                <p className="text-sm text-muted-foreground">Everyone with bidder access</p>
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
                    <ExportUsersButton role="BIDDER" label="bidders" />
                </div>

                {loading ? (
                    <p className="text-sm text-muted-foreground">Loading bidders...</p>
                ) : error ? (
                    <p className="text-sm text-red-500">{error}</p>
                ) : (
                    <UsersTable columns={bidderListColumns} data={bidders} search={search} />
                )}

            </div>
        </div>
    )
}
