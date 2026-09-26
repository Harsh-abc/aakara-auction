"use client"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { RootState } from "@/redux/store"
import { ChevronsUpDownIcon, SparklesIcon, BadgeCheckIcon, CreditCardIcon, BellIcon, LogOutIcon } from "lucide-react"
import { Cossette_Texte } from "next/font/google"
import { useSelector } from "react-redux"

export function NavUser() {
  const { isMobile } = useSidebar()
  const user = useSelector((state: RootState) => state.auth.user);

  if (!user) {
    return null
  }

  const profile = user.profile
  console.log(profile)

  console.log(user)
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="cursor-pointer text-white
             hover:bg-transparent hover:text-white
             active:bg-transparent active:text-white
             aria-expanded:bg-transparent
             data-popup-open:bg-transparent
             focus-visible:bg-transparent"/>
            }
          >
            <Avatar>
              <AvatarImage src={profile?.avatarUrl ?? undefined} alt={profile?.firstName ?? undefined} />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium text-white">{user?.profile?.displayName}</span>
              <span className="truncate text-xs text-white">{user?.email}</span>
            </div>
          </DropdownMenuTrigger>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
