'use client'
import { columns } from "@/components/core/Dashboard/users/users-columns";
import { UsersTable } from "@/components/core/Dashboard/users/users-table";
import { Field } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import { getAllUsers } from "@/services/operations/user.api";

export default function AllUsers() {
    const [search, setSearch] = useState("")

    const dispatch = useDispatch<AppDispatch>();
    const { users, loading, error } = useSelector((state: RootState) => state.user);

    useEffect(() => {
        dispatch(getAllUsers({ page: 1, limit: 100 }));
    }, [dispatch]);

    return (
        <div className="px-8 py-8">

            <div className="">
                <h1 className="text-[24px] font-bold">All Users</h1>
            </div>

            <div className="w-full rounded-[8px] pb-4">
                <div className="pb-4 flex items-center justify-between mt-3.5">
                    <div className="flex items-center gap-4 w-87.5 h-10">
                        <Field className="max-w-sm">
                            <InputGroup className="bg-white">
                                <InputGroupInput id="inline-start-input" placeholder="Search New Users" value={search}
                                    onChange={(e) => setSearch(e.target.value)} />
                                <InputGroupAddon align="inline-start">
                                    <SearchIcon className="text-muted-foreground" />
                                </InputGroupAddon>
                            </InputGroup>
                        </Field>
                    </div>
                </div>

                {loading ? (
                    <p className="text-sm text-muted-foreground">Loading users...</p>
                ) : error ? (
                    <p className="text-sm text-red-500">{error}</p>
                ) : (
                    <UsersTable columns={columns} data={users} search={search} />
                )}

            </div>
        </div>
    )
}