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
import {
  CreditCard,
  FileChartColumn,
  Gavel,
  HandCoins,
  LayoutDashboard,
  Palette,
  Settings,
  ShoppingBag,
  Truck,
  UserCheck,
  Users,
} from "lucide-react"

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
    // { title: "Live Auctions", url: "/dashboard/live-auctions", icon: <Gavel className="rotate-270" /> },
    {
      title: "Auctions & Lots", url: "/", icon: <Gavel />, items: [
        { title: "Create Auctions", url: "/dashboard/auctions" },
        { title: "Live Auctions", url: "/dashboard/auctions/live-auctions" },
        { title: "Past Auctions", url: "/dashboard/auctions/past-auctions" },
        { title: "Upcoming Auctions", url: "/dashboard/auctions/upcoming-auctions" },
      ],
    },
    { title: "Artworks", url: "/dashboard/artworks", icon: <Palette /> },
    // { title: "Bidders", url: "/dashboard/bidders", icon: <UserCheck /> },
    { title: "User", url: "/dashboard/users", icon: <Users /> },
    { title: "Bids", url: "/dashboard/bidders", icon: <HandCoins /> },
    // { title: "Orders", url: "/dashboard/orders", icon: <ShoppingBag /> },
    // { title: "Payment", url: "/dashboard/payment", icon: <CreditCard /> },
    // { title: "Shipping", url: "/dashboard/shipping", icon: <Truck /> },
    // { title: "Report", url: "/dashboard/report", icon: <FileChartColumn /> },
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: <Settings />,
      items: [
        { title: "General Settings", url: "/dashboard/settings/general" },
        { title: "Team", url: "/dashboard/settings/team" },
        // { title: "Roles & Permissions", url: "/dashboard/settings/permissions" },
      ],
    },
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
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
