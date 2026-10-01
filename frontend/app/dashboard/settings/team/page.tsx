'use client'
import { useEffect, useMemo, useState } from "react";
import { SearchIcon } from "lucide-react";

import { teamColumns } from "@/components/core/Dashboard/settings/team-columns";
import { UsersTable } from "@/components/core/Dashboard/users/users-table";
import { Field } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { ALL_ROLES, ROLE_LABELS } from "@/lib/constants/roles";
import { getAllUsers } from "@/services/operations/user.api";

// "TEAM" = everyone except bidders
const roleFilters = [
    { value: "TEAM", label: "Team members" },
    { value: "ALL", label: "All users" },
    ...ALL_ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] })),
];

export default function TeamSettings() {
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("TEAM");

    const dispatch = useAppDispatch();
    const { users, loading, error } = useAppSelector((state) => state.user);

    useEffect(() => {
        dispatch(getAllUsers({ page: 1, limit: 100 }));
    }, [dispatch]);

    const filteredUsers = useMemo(() => {
        if (roleFilter === "ALL") return users;
        if (roleFilter === "TEAM") return users.filter((u) => u.role.name !== "BIDDER");
        return users.filter((u) => u.role.name === roleFilter);
    }, [users, roleFilter]);

    return (
        <div className="px-8 py-8">
            <div>
                <h1 className="text-[24px] font-bold">Team</h1>
                <p className="text-sm text-muted-foreground">
                    Manage who has access to the dashboard and what role they have.
                </p>
            </div>

            <div className="w-full rounded-[8px] pb-4">
                <div className="pb-4 flex items-center justify-between gap-4 mt-3.5">
                    <div className="flex items-center gap-4 w-87.5 h-10">
                        <Field className="max-w-sm">
                            <InputGroup className="bg-white">
                                <InputGroupInput
                                    placeholder="Search by name or email"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                <InputGroupAddon align="inline-start">
                                    <SearchIcon className="text-muted-foreground" />
                                </InputGroupAddon>
                            </InputGroup>
                        </Field>
                    </div>

                    <Select
                        value={roleFilter}
                        onValueChange={(value) => value !== null && setRoleFilter(value)}
                    >
                        <SelectTrigger className="h-10 w-44 bg-white" aria-label="Filter by role">
                            <SelectValue>
                                {roleFilters.find((f) => f.value === roleFilter)?.label}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                            <SelectGroup>
                                {roleFilters.map((filter) => (
                                    <SelectItem key={filter.value} value={filter.value}>
                                        {filter.label}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>

                {loading ? (
                    <p className="text-sm text-muted-foreground">Loading team...</p>
                ) : error ? (
                    <p className="text-sm text-red-500">{error}</p>
                ) : (
                    <UsersTable columns={teamColumns} data={filteredUsers} search={search} />
                )}
            </div>
        </div>
    )
}
