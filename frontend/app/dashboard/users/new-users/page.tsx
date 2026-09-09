
'use client'
import { columns } from "@/components/core/Dashboard/users/users-columns";
import { UsersTable } from "@/components/core/Dashboard/users/users-table";

import UserStats from "@/components/core/Dashboard/users/UserStats";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { newUsers } from "@/lib/data";
// import { auctionData } from "@/lib/data";
import { Plus, Search, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function NewUsers() {
    const [search, setSearch] = useState("")

    const items = [
        { label: "All", value: "all" },
        { label: "Active", value: "active" },
        { label: "Completed", value: "completed" },
        { label: "Scheduled", value: "scheduled" },
    ]

    return (
        <div className="px-8 py-8">

            <div className="">
                <h1 className="text-[24px] font-bold">New Users</h1>
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


                <UsersTable columns={columns} data={newUsers} search={search} />

            </div>
        </div>
    )
}