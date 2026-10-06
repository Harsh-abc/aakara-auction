'use client'
import { useEffect, useMemo, useState } from "react";
import { SearchIcon } from "lucide-react";

import { teamColumns } from "@/components/core/Dashboard/settings/team-columns";
import { UsersTable } from "@/components/core/Dashboard/users/users-table";
import { Field } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { ALL_ROLES, DASHBOARD_ROLES, MAX_SUPER_ADMINS, ROLE_LABELS } from "@/lib/constants/roles";
import AddUserDialog, { type RoleOption } from "@/components/core/Dashboard/users/AddUserDialog";
import { getAllUsers } from "@/services/operations/user.api";

// "TEAM" = everyone with dashboard access (excludes bidders and users)
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
    const isSuperAdmin = useAppSelector((state) => state.auth.role) === "SUPER_ADMIN";

    // Super Admin is offered only while under the limit (the API enforces it too)
    const superAdminCount = users.filter((u) => u.role.name === "SUPER_ADMIN").length;
    const roleOptions: RoleOption[] = ALL_ROLES.map((role) => ({
        value: role,
        label: ROLE_LABELS[role],
        ...(role === "SUPER_ADMIN" &&
            superAdminCount >= MAX_SUPER_ADMINS && { disabled: true, hint: `limit of ${MAX_SUPER_ADMINS} reached` }),
    }));

    useEffect(() => {
        dispatch(getAllUsers({ page: 1, limit: 100 }));
    }, [dispatch]);

    const filteredUsers = useMemo(() => {
        if (roleFilter === "ALL") return users;
        if (roleFilter === "TEAM") return users.filter((u) => DASHBOARD_ROLES.includes(u.role.name));
        return users.filter((u) => u.role.name === roleFilter);
    }, [users, roleFilter]);

    return (
        <div className="px-8 py-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-[24px] font-bold">Team</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage who has access to the dashboard and what role they have.
                    </p>
                </div>

                {isSuperAdmin && (
                    <AddUserDialog
                        triggerLabel="Add User"
                        title="Add User"
                        description="Create an account with the role you choose. Email, phone and KYC are marked verified and the account is active, so they can log in straight away."
                        submitLabel="Create User"
                        roleOptions={roleOptions}
                    />
                )}
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
