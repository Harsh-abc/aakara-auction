"use client"

import * as React from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { ChevronsUpDownIcon, PlusIcon } from "lucide-react"
import Image from "next/image"
import { Separator } from "./ui/separator"

export function TeamSwitcher({
  teams,
}: {
  teams: {
    name: string
    plan: string
  }[]
}) {
  const { isMobile } = useSidebar()
  const [activeTeam, setActiveTeam] = React.useState(teams[0])
  if (!activeTeam) {
    return null
  }
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center justify-center mt-6 gap-2"
          >
            <div className="flex aspect-square size-8 items-center justify-center">
              <Image src='/logo/aakara_mini.png' alt="Aakara Art Mini Logo" width={180} height={100} className="w-32 h-10 object-cover" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight text-text-secondary">
              {/* <span className="truncate font-medium">{activeTeam.name}</span>
              <span className="truncate text-xs">{activeTeam.plan}</span> */}
              <Image src='/logo/aakara_white.png' alt="Aakara Art" width={1200} height={550} className="w-37 h-10 object-cover" />
            </div>
          </DropdownMenuTrigger>
          <Separator className="mt-2 h-1 border-[rgba(255, 255, 255, 0.50)]" />
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
