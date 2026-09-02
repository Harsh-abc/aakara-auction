"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { GalleryVerticalEndIcon, AudioLinesIcon, TerminalIcon, TerminalSquareIcon, BotIcon, BookOpenIcon, Settings2Icon, FrameIcon, PieChartIcon, MapIcon, LayoutDashboard, Gavel, ReceiptText, Layers, LayersPlus, ChartCandlestick, Gamepad, Users } from "lucide-react"

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Aakara Art",
      plan: "Auction",
    },
  ],
  // navMain: [
  //   {
  //     title: "Dashboard",
  //     url: "#",
  //     icon: (
  //       <LayoutDashboard />
  //     ),
  //     // isActive: true,
  //     // items: [
  //     //   {
  //     //     title: "History",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Starred",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Settings",
  //     //     url: "#",
  //     //   },
  //     // ],
  //   },
  //   {
  //     title: "Live Auctions",
  //     url: "#",
  //     icon: (
  //       <Gavel
  //         className="rotate-270" />
  //     ),
  //     // items: [
  //     //   {
  //     //     title: "Genesis",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Explorer",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Quantum",
  //     //     url: "#",
  //     //   },
  //     // ],
  //   },
  //   {
  //     title: "Auctions & Lots",
  //     url: "#",
  //     icon: (

  //       <Layers />
  //     ),
  //     // items: [
  //     //   {
  //     //     title: "Introduction",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Get Started",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Tutorials",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Changelog",
  //     //     url: "#",
  //     //   },
  //     // ],
  //   },
  //   {
  //     title: "Bidding Details",
  //     url: "#",
  //     icon: (
  //       <ReceiptText />
  //     ),
  //     // items: [
  //     //   {
  //     //     title: "General",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Team",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Billing",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Limits",
  //     //     url: "#",
  //     //   },
  //     // ],
  //   },
  //   {
  //     title: "Results",
  //     url: "#",
  //     icon: (
  //       <ChartCandlestick />
  //     ),
  //     // items: [
  //     //   {
  //     //     title: "General",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Team",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Billing",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Limits",
  //     //     url: "#",
  //     //   },
  //     // ],
  //   },
  //   {
  //     title: "Create Auction",
  //     url: "#",
  //     icon: (
  //       <LayersPlus />
  //     ),
  //     // items: [
  //     //   {
  //     //     title: "General",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Team",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Billing",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Limits",
  //     //     url: "#",
  //     //   },
  //     // ],
  //   },
  //   {
  //     title: "Bidding Console",
  //     url: "#",
  //     icon: (
  //       <Gamepad />
  //     ),
  //     // items: [
  //     //   {
  //     //     title: "General",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Team",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Billing",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Limits",
  //     //     url: "#",
  //     //   },
  //     // ],
  //   },
  //   {
  //     title: "User",
  //     url: "#",
  //     icon: (
  //       <Users />
  //     ),
  //     // items: [
  //     //   {
  //     //     title: "General",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Team",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Billing",
  //     //     url: "#",
  //     //   },
  //     //   {
  //     //     title: "Limits",
  //     //     url: "#",
  //     //   },
  //     // ],
  //   },
  // ],

  navMain: [
    { title: "Dashboard", url: "/dashboard", icon: <LayoutDashboard className="w-6 h-6" /> },
    { title: "Live Auctions", url: "/dashboard/live-auctions", icon: <Gavel className="rotate-270" /> },
    { title: "Auctions & Lots", url: "/dashboard/auctions", icon: <Layers /> },
    { title: "Artworks", url: "/dashboard/artworks", icon: <Gavel className="rotate-270" /> },
    { title: "Bidders", url: "/dashboard/bidders", icon: <Users /> },
    { title: "User", url: "/dashboard/users", icon: <Users /> },
    { title: "Bids", url: "/dashboard/bidders", icon: <Users /> },
    { title: "Orders", url: "/dashboard/orders", icon: <ChartCandlestick /> },
    { title: "Payment", url: "/dashboard/payment", icon: <ChartCandlestick /> },
    { title: "Shipping", url: "/dashboard/shipping", icon: <ChartCandlestick /> },
    { title: "Report", url: "/dashboard/report", icon: <Users /> },
    { title: "Settings", url: "/dashboard/settings", icon: <Users /> },
  ],

}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
