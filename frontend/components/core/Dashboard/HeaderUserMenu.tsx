"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useDispatch, useSelector } from "react-redux"
import toast from "react-hot-toast"
import { LogOutIcon, UserIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { logoutUser } from "@/services/operations/auth.api"
import type { AppDispatch, RootState } from "@/redux/store"

export function HeaderUserMenu() {
    const router = useRouter()
    const dispatch = useDispatch<AppDispatch>()
    const user = useSelector((state: RootState) => state.auth.user)
    const role = useSelector((state: RootState) => state.auth.role)

    const [logoutOpen, setLogoutOpen] = useState(false)
    const [loggingOut, setLoggingOut] = useState(false)

    if (!user) return null

    const profile = user.profile
    const name =
        profile?.displayName || [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || user.username
    const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()

    const handleLogout = async () => {
        setLoggingOut(true)
        try {
            await dispatch(logoutUser()) // POST /auth/logout → clears cookie + Redux auth
            setLogoutOpen(false)
            toast.success("Logged out")
            router.replace("/login")
        } finally {
            setLoggingOut(false)
        }
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger
                    className="rounded-full outline-none ring-offset-2 transition focus-visible:ring-2 focus-visible:ring-[#491B3A] cursor-pointer"
                    aria-label="Account menu"
                >
                    <Avatar className="size-9 ring-2 ring-[#491B3A]/20">
                        <AvatarImage src={profile?.avatarUrl ?? undefined} alt={name} className="object-cover" />
                        <AvatarFallback className="bg-[#491B3A] text-xs text-white">{initials}</AvatarFallback>
                    </Avatar>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" sideOffset={8} className="w-64">
                    <DropdownMenuGroup>
                        <DropdownMenuLabel className="flex items-center gap-3 px-2 py-2 font-normal">
                            <Avatar className="size-10">
                                <AvatarImage src={profile?.avatarUrl ?? undefined} alt={name} className="object-cover" />
                                <AvatarFallback className="bg-[#491B3A] text-xs text-white">{initials}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                                {role && (
                                    <span className="mt-1 inline-block rounded-full bg-[#491B3A]/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-[#491B3A] dark:bg-white/10 dark:text-white">
                                        {role.replace("_", " ")}
                                    </span>
                                )}
                            </div>
                        </DropdownMenuLabel>
                    </DropdownMenuGroup>

                    <DropdownMenuSeparator />

                    <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => router.push("/dashboard/settings/general")}>
                            <UserIcon className="size-4" />
                            My account
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => setLogoutOpen(true)}>
                            <LogOutIcon className="size-4" />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Log out of Aakara?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You'll need to sign in again to access the dashboard.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loggingOut}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleLogout}
                            disabled={loggingOut}
                            className="bg-[#491B3A] text-white hover:bg-[#491B3A]/90"
                        >
                            {loggingOut ? "Logging out…" : "Log out"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}