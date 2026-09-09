
'use client'
import { columns } from "@/components/core/Dashboard/users/users-columns";
import { UsersTable } from "@/components/core/Dashboard/users/users-table";

import UserStats from "@/components/core/Dashboard/users/UserStats";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { auctionData, users } from "@/lib/data";
// import { auctionData } from "@/lib/data";
import { Plus, Search, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function Users() {
    const [search, setSearch] = useState("")

    const items = [
        { label: "All", value: "all" },
        { label: "Active", value: "active" },
        { label: "Completed", value: "completed" },
        { label: "Scheduled", value: "scheduled" },
    ]

    return (
        <div className="px-8 py-8">
            <div className=" flex items-center justify-between">
                <h3 className="text-2xl font-bold">Platform Users</h3>
                <div>
                    <Button className="px-3 py-4.5 text-[15px] bg-dashboardButton hover:bg-amber-500">
                        <Plus />
                        <Link href={''} >
                            Add Users
                        </Link>
                    </Button>
                </div>
            </div>
            <UserStats />

            <div className="w-full bg-[#F4F4F4] px-6 rounded-[8px] pb-4">
                <div className="pb-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 w-87.5 h-10">
                        <Field className="max-w-sm">
                            <InputGroup className="bg-white">
                                <InputGroupInput id="inline-start-input" placeholder="Search auctions..." value={search}
                                    onChange={(e) => setSearch(e.target.value)} />
                                <InputGroupAddon align="inline-start">
                                    <SearchIcon className="text-muted-foreground" />
                                </InputGroupAddon>
                            </InputGroup>
                        </Field>
                    </div>
                    <div className="flex items-center gap-4">


                        <Field className="w-34 py-4">
                            <Select items={items}>
                                <SelectTrigger
                                    className="
                w-full max-w-48
                bg-white
                text-slate-500
                border-slate-200
                shadow-none
            "
                                >
                                    <SelectValue placeholder="Status : All" />
                                </SelectTrigger>

                                <SelectContent className="bg-white">
                                    <SelectGroup>
                                        <SelectLabel className="text-slate-500">
                                            Status
                                        </SelectLabel>

                                        {items.map((item) => (
                                            <SelectItem
                                                key={item.value}
                                                value={item.value}
                                                className="text-slate-700"
                                            >
                                                {item.label}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </Field>



                    </div>
                </div>


                <UsersTable columns={columns} data={users} search={search} />

            </div>
        </div>
    )
}