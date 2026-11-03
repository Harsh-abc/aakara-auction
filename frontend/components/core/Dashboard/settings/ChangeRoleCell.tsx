"use client";

import { useState } from "react";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
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
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { ALL_ROLES, DASHBOARD_ROLES, MAX_SUPER_ADMINS, ROLE_LABELS, RoleName } from "@/lib/constants/roles";
import { changeUserRole } from "@/services/operations/user.api";

const roleLabel = (role: string) => ROLE_LABELS[role as RoleName] ?? role;

// the Team table only moves people between dashboard roles
const TEAM_ROLES = ALL_ROLES.filter((role) => DASHBOARD_ROLES.includes(role));

// "Revoke access" makes them a plain website user: no dashboard, logged out everywhere
const REVOKE = "REVOKE";
const REVOKED_ROLE = "USER";

export default function ChangeRoleCell({
    uuid,
    name,
    currentRole,
}: {
    uuid: string;
    name: string;
    currentRole: string;
}) {
    const dispatch = useAppDispatch();
    const { role: myRole, user: me } = useAppSelector((state) => state.auth);
    const changingRoleFor = useAppSelector((state) => state.user.changingRoleFor);
    const superAdminCount = useAppSelector(
        (state) => state.user.users.filter((u) => u.role.name === "SUPER_ADMIN").length
    );
    // UI hint only — the backend enforces the limit
    const superAdminLimitReached = superAdminCount >= MAX_SUPER_ADMINS;

    // role picked in the dropdown, waiting for confirmation
    const [pendingRole, setPendingRole] = useState<string | null>(null);

    const isSelf = me?.uuid === uuid;
    const canChange = myRole === "SUPER_ADMIN" && !isSelf;
    const isChanging = changingRoleFor === uuid;
    const isRevoking = pendingRole === REVOKE;

    if (!canChange) {
        return (
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-normal">
                {roleLabel(currentRole)}
                {isSelf && " (you)"}
            </Badge>
        );
    }

    const handleConfirm = async () => {
        if (!pendingRole) return;

        try {
            const roleName = isRevoking ? REVOKED_ROLE : pendingRole;
            await dispatch(changeUserRole({ uuid, roleName })).unwrap();
            toast.success(
                isRevoking
                    ? `${name} no longer has dashboard access`
                    : `${name} is now ${roleLabel(pendingRole)}`
            );
        } catch (error) {
            toast.error(typeof error === "string" ? error : "Could not change role. Try again.");
        } finally {
            setPendingRole(null);
        }
    };

    return (
        <>
            <Select
                value={currentRole}
                onValueChange={(value) => {
                    if (value && value !== currentRole) setPendingRole(value);
                }}
                disabled={isChanging}
            >
                <SelectTrigger className="h-8 w-36 bg-white text-xs" aria-label={`Role for ${name}`}>
                    <SelectValue>{isChanging ? "Updating..." : roleLabel(currentRole)}</SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white">
                    <SelectGroup>
                        {TEAM_ROLES.map((role) => {
                            const isFull = role === "SUPER_ADMIN" && superAdminLimitReached && currentRole !== role;
                            return (
                                <SelectItem key={role} value={role} disabled={isFull} className="text-xs">
                                    {ROLE_LABELS[role]}
                                    {isFull && ` (max ${MAX_SUPER_ADMINS})`}
                                </SelectItem>
                            );
                        })}
                    </SelectGroup>
                    <SelectSeparator />
                    <SelectItem
                        value={REVOKE}
                        className="text-xs text-red-600 focus:text-red-600"
                    >
                        Revoke access
                    </SelectItem>
                </SelectContent>
            </Select>

            <AlertDialog
                open={pendingRole !== null}
                onOpenChange={(open) => {
                    if (!open && !isChanging) setPendingRole(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{isRevoking ? "Revoke dashboard access?" : "Change role?"}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {isRevoking ? (
                                <>
                                    {name} will lose their <b>{roleLabel(currentRole)}</b> role and no longer
                                    be able to open the dashboard. They will be logged out of all devices and
                                    removed from the team. Their account stays, as a website user.
                                </>
                            ) : (
                                <>
                                    {name} will change from <b>{roleLabel(currentRole)}</b> to{" "}
                                    <b>{pendingRole ? roleLabel(pendingRole) : ""}</b>. They will be logged out of
                                    all devices and need to sign in again.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isChanging}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirm}
                            disabled={isChanging}
                            className={
                                isRevoking
                                    ? "bg-red-600 text-white hover:bg-red-600/90"
                                    : "bg-[#491B3A] text-white hover:bg-[#491B3A]/90"
                            }
                        >
                            {isChanging ? "Updating..." : isRevoking ? "Revoke access" : "Change role"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
