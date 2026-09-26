"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { ChevronRightIcon } from "lucide-react"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const pathname = usePathname()

  // NEW: only one group open at a time; start with the group of the current page open
  const [openGroup, setOpenGroup] = useState<string | null>(
    () => items.find((item) => item.items?.length && pathname.startsWith(item.url))?.title ?? null
  )

  return (
    <SidebarGroup className="px-2">
      <SidebarMenu className="mt-4">
        {items.map((item) => {
          if (!item.items?.length) {
            return (
              <SidebarMenuItem key={item.title} className="mb-2">
                <SidebarMenuButton
                  tooltip={item.title}
                  onClick={() => setOpenGroup(null)} // NEW: clicking a plain link closes any open group
                  render={
                    <Link
                      href={item.url}
                      className="flex items-center gap-2 rounded-md px-2 py-2 transition-colors text-[#ffffff] hover:bg-[#491B3A] hover:text-[#491B3A]"
                    />
                  }
                  className="hover:bg-[#491B3A] hover:border-l-[#491B3A] hover:text-white px-3 py-4"
                >
                  {item.icon && <span className="w-4 h-4 shrink-0">{item.icon}</span>}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }

          const isOpen = openGroup === item.title // NEW

          return (
            <Collapsible
              key={item.title}
              open={isOpen} // NEW: controlled
              onOpenChange={(open) => setOpenGroup(open ? item.title : null)} // NEW
              render={<SidebarMenuItem className="mb-2" />}
            >
              <CollapsibleTrigger
                render={
                  <SidebarMenuButton
                    tooltip={item.title}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  />
                }
              >
                {item.icon && <span className="w-4 h-4 shrink-0">{item.icon}</span>}
                <span>{item.title}</span>
                <ChevronRightIcon
                  className={`ml-auto size-4 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} // NEW
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton
                        render={
                          <Link
                            href={subItem.url}
                            className="rounded-md transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          />
                        }
                      >
                        <span>{subItem.title}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}